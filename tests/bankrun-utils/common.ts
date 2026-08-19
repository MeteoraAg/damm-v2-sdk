import {
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import { BanksClient, Clock, ProgramTestContext, start } from "solana-bankrun";
import { CP_AMM_PROGRAM_ID, DECIMALS } from "./constants";
import { createToken, mintTo } from "./token";
import {
  AccountLayout,
  ExtensionType,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createToken2022, mintToToken2022 } from "./token2022";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  deriveConfigAddress,
  deriveOperatorAddress,
  getBaseFeeParams,
  InitializeCustomizeablePoolParams,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
  PoolState,
  PositionState,
} from "../../src";
import { CpAmm as CpAmmTypes } from "../../src/idl/cp_amm";
import { expect } from "vitest";

// bossj3JvwiNK7pvjr149DqdtJxf2gdygbcmEPTkb2F1
export const LOCAL_ADMIN_KEYPAIR = Keypair.fromSecretKey(
  Uint8Array.from([
    230, 207, 238, 109, 95, 154, 47, 93, 183, 250, 147, 189, 87, 15, 117, 184,
    44, 91, 94, 231, 126, 140, 238, 134, 29, 58, 8, 182, 88, 22, 113, 234, 8,
    234, 192, 109, 87, 125, 190, 55, 129, 173, 227, 8, 104, 201, 104, 13, 31,
    178, 74, 80, 54, 14, 77, 78, 226, 57, 47, 122, 166, 165, 57, 144,
  ]),
);

export enum OperatorPermission {
  CreateConfigKey = 0,
  RemoveConfigKey = 1,
  CreateTokenBadge = 2,
  CloseTokenBadge = 3,
  SetPoolStatus = 4,
  InitializeReward = 5,
  UpdateRewardDuration = 6,
  UpdateRewardFunder = 7,
  UpdatePoolFees = 8,
  ClaimProtocolFee = 9,
  ZapProtocolFee = 10,
  FixPool = 11,
}

export function encodePermissions(permissions: OperatorPermission[]): BN {
  return permissions.reduce((acc, perm) => {
    return acc.or(new BN(1).shln(perm));
  }, new BN(0));
}

export type CreateOperatorParams = {
  admin: Keypair;
  whitelistAddress: PublicKey;
  permission: BN;
};

export async function startTest() {
  // Program name need to match fixtures program name
  return start(
    [
      {
        name: "cp_amm",
        programId: new PublicKey(CP_AMM_PROGRAM_ID),
      },
    ],
    [
      {
        address: LOCAL_ADMIN_KEYPAIR.publicKey,
        info: {
          executable: false,
          owner: SystemProgram.programId,
          lamports: LAMPORTS_PER_SOL * 100,
          data: new Uint8Array(),
        },
      },
    ],
  );
}

export async function transferSol(
  banksClient: BanksClient,
  from: Keypair,
  to: PublicKey,
  amount: BN,
) {
  const systemTransferIx = SystemProgram.transfer({
    fromPubkey: from.publicKey,
    toPubkey: to,
    lamports: BigInt(amount.toString()),
  });

  let transaction = new Transaction();
  const [recentBlockhash] = await banksClient.getLatestBlockhash();
  transaction.recentBlockhash = recentBlockhash;
  transaction.add(systemTransferIx);
  transaction.sign(from);

  await banksClient.processTransaction(transaction);
}

export async function processTransactionMaybeThrow(
  banksClient: BanksClient,
  transaction: Transaction,
  maxRetries = 5,
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const transactionMeta =
      await banksClient.tryProcessTransaction(transaction);
    if (transactionMeta.result && transactionMeta.result.length > 0) {
      const errorMessage = transactionMeta.result;
      if (errorMessage.includes("Account in use") && attempt < maxRetries - 1) {
        const delay = 50 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw Error(errorMessage);
    }
    return; // Success
  }
}

export async function expectThrowsAsync(
  fn: () => Promise<void>,
  errorMessage: String,
) {
  try {
    await fn();
  } catch (err) {
    if (!(err instanceof Error)) {
      throw err;
    } else {
      if (!err.message.toLowerCase().includes(errorMessage.toLowerCase())) {
        throw new Error(
          `Unexpected error: ${err.message}. Expected error: ${errorMessage}`,
        );
      }
      return;
    }
  }
  throw new Error("Expected an error but didn't get one");
}

export async function createUsersAndFund(
  banksClient: BanksClient,
  payer: Keypair,
  user?: Keypair,
): Promise<Keypair> {
  if (!user) {
    user = Keypair.generate();
  }

  await transferSol(
    banksClient,
    payer,
    user.publicKey,
    new BN(LAMPORTS_PER_SOL),
  );

  return user;
}

export async function setupTestContext(
  banksClient: BanksClient,
  rootKeypair: Keypair,
  token2022: boolean,
  extensions?: ExtensionType[],
) {
  const [admin, payer, poolCreator, user, funder, operator] = Array(7)
    .fill(7)
    .map(() => Keypair.generate());

  const recipients = [
    admin.publicKey,
    payer.publicKey,
    user.publicKey,
    funder.publicKey,
    operator.publicKey,
    poolCreator.publicKey,
  ];

  const transaction = new Transaction();
  const [recentBlockhash] = await banksClient.getLatestBlockhash();
  transaction.recentBlockhash = recentBlockhash;

  for (const recipient of recipients) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: rootKeypair.publicKey,
        toPubkey: recipient,
        lamports: BigInt((1_000 * LAMPORTS_PER_SOL).toString()),
      }),
    );
  }

  transaction.sign(rootKeypair);
  await banksClient.processTransaction(transaction);

  //
  const rawAmount = 100_000_000 * 10 ** DECIMALS; // 1 millions

  const tokenAMintKeypair = Keypair.generate();
  const tokenBMintKeypair = Keypair.generate();
  const rewardMintKeypair = Keypair.generate();

  if (token2022) {
    await createToken2022(
      banksClient,
      rootKeypair,
      tokenAMintKeypair,
      extensions,
    );
    await createToken2022(
      banksClient,
      rootKeypair,
      tokenBMintKeypair,
      extensions,
    );
    await createToken2022(
      banksClient,
      rootKeypair,
      rewardMintKeypair,
      extensions,
    );

    for (const publicKey of [
      payer.publicKey,
      user.publicKey,
      poolCreator.publicKey,
    ]) {
      await mintToToken2022(
        banksClient,
        rootKeypair,
        rootKeypair,
        tokenAMintKeypair.publicKey,
        publicKey,
        BigInt(rawAmount),
      );
    }

    for (const publicKey of [
      payer.publicKey,
      user.publicKey,
      poolCreator.publicKey,
    ]) {
      await mintToToken2022(
        banksClient,
        rootKeypair,
        rootKeypair,
        tokenBMintKeypair.publicKey,
        publicKey,
        BigInt(rawAmount),
      );
    }

    await mintToToken2022(
      banksClient,
      rootKeypair,
      rootKeypair,
      rewardMintKeypair.publicKey,
      funder.publicKey,
      BigInt(rawAmount),
    );

    await mintToToken2022(
      banksClient,
      rootKeypair,
      rootKeypair,
      rewardMintKeypair.publicKey,
      user.publicKey,
      BigInt(rawAmount),
    );
  } else {
    await createToken(
      banksClient,
      rootKeypair,
      tokenAMintKeypair,
      rootKeypair.publicKey,
    );
    await createToken(
      banksClient,
      rootKeypair,
      tokenBMintKeypair,
      rootKeypair.publicKey,
    );
    await createToken(
      banksClient,
      rootKeypair,
      rewardMintKeypair,
      rootKeypair.publicKey,
    );

    for (const publicKey of [
      payer.publicKey,
      user.publicKey,
      poolCreator.publicKey,
    ]) {
      await mintTo(
        banksClient,
        rootKeypair,
        tokenAMintKeypair.publicKey,
        rootKeypair,
        publicKey,
        BigInt(rawAmount),
      );
    }

    for (const publicKey of [
      payer.publicKey,
      user.publicKey,
      poolCreator.publicKey,
    ]) {
      await mintTo(
        banksClient,
        rootKeypair,
        tokenBMintKeypair.publicKey,
        rootKeypair,
        publicKey,
        BigInt(rawAmount),
      );
    }

    await mintTo(
      banksClient,
      rootKeypair,
      rewardMintKeypair.publicKey,
      rootKeypair,
      funder.publicKey,
      BigInt(rawAmount),
    );

    await mintTo(
      banksClient,
      rootKeypair,
      rewardMintKeypair.publicKey,
      rootKeypair,
      user.publicKey,
      BigInt(rawAmount),
    );
  }

  return {
    admin,
    payer,
    poolCreator,
    tokenAMint: tokenAMintKeypair.publicKey,
    tokenBMint: tokenBMintKeypair.publicKey,
    rewardMint: rewardMintKeypair.publicKey,
    funder,
    user,
    operator,
  };
}

export function randomID(min = 0, max = 10000) {
  return Math.floor(Math.random() * (max - min) + min);
}

export async function warpSlotBy(context: ProgramTestContext, slots: BN) {
  const clock = await context.banksClient.getClock();
  context.warpToSlot(clock.slot + BigInt(slots.toString()));
}

export async function executeTransaction(
  banksClient: BanksClient,
  transaction: Transaction,
  signers: Signer[],
  maxRetries = 5,
) {
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    }),
  );

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const [recentBlockhash] = await banksClient.getLatestBlockhash();
    transaction.recentBlockhash = recentBlockhash;

    transaction.signatures = [];
    transaction.sign(...signers);

    const transactionMeta =
      await banksClient.tryProcessTransaction(transaction);

    if (transactionMeta.result && transactionMeta.result.length > 0) {
      const errorMessage = transactionMeta.result;
      if (errorMessage.includes("Account in use") && attempt < maxRetries - 1) {
        const delay = 50 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw Error(errorMessage);
    }
    return;
  }
}

/**
 * Redirects the anchor program's connection reads to the bankrun BanksClient so that
 * SDK methods which fetch on-chain accounts internally (e.g. fetchPoolState) work in tests.
 */
export function attachBanksClient(
  program: Program<CpAmmTypes>,
  banksClient: BanksClient,
) {
  const fetchAccountInfo = async (pubkey: PublicKey) => {
    const account = await banksClient.getAccount(new PublicKey(pubkey));
    if (!account) return null;
    return {
      data: Buffer.from(account.data),
      owner:
        account.owner instanceof PublicKey
          ? account.owner
          : new PublicKey(account.owner),
      lamports: Number(account.lamports),
      executable: account.executable,
      rentEpoch: Number(account.rentEpoch ?? 0),
    };
  };

  const connection = program.provider.connection as any;
  connection.getAccountInfo = async (pubkey: PublicKey) =>
    fetchAccountInfo(pubkey);
  connection.getAccountInfoAndContext = async (pubkey: PublicKey) => ({
    context: { slot: 0 },
    value: await fetchAccountInfo(pubkey),
  });
}

export async function getPool(
  banksClient: BanksClient,
  program: Program<CpAmmTypes>,
  pool: PublicKey,
): Promise<PoolState> {
  const account = await banksClient.getAccount(pool);
  return program.coder.accounts.decode("pool", Buffer.from(account.data));
}

export async function getPosition(
  banksClient: BanksClient,
  program: Program<CpAmmTypes>,
  position: PublicKey,
): Promise<PositionState> {
  const account = await banksClient.getAccount(position);
  return program.coder.accounts.decode("position", Buffer.from(account.data));
}

export async function createOperator(
  banksClient: BanksClient,
  program: Program<CpAmmTypes>,
  params: CreateOperatorParams,
): Promise<PublicKey> {
  const { admin, whitelistAddress, permission } = params;
  const operator = deriveOperatorAddress(whitelistAddress);

  const transaction = await program.methods
    .createOperatorAccount(permission)
    .accountsPartial({
      operator,
      whitelistedAddress: whitelistAddress,
      signer: admin.publicKey,
      payer: admin.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    transaction.recentBlockhash = (await banksClient.getLatestBlockhash())[0];
    transaction.signatures = [];
    transaction.sign(admin);

    const transactionMeta =
      await banksClient.tryProcessTransaction(transaction);

    if (transactionMeta.result && transactionMeta.result.length > 0) {
      const errorMessage = transactionMeta.result;
      if (errorMessage.includes("Account in use") && attempt < maxRetries - 1) {
        const delay = 50 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw Error(errorMessage);
    }
    break;
  }

  return operator;
}

/**
 * Advances the bankrun clock forward by the given number of seconds.
 */
export async function advanceTimeBy(
  context: ProgramTestContext,
  seconds: number,
) {
  const clock = await context.banksClient.getClock();
  context.setClock(
    new Clock(
      clock.slot,
      clock.epochStartTimestamp,
      clock.epoch,
      clock.leaderScheduleEpoch,
      clock.unixTimestamp + BigInt(seconds),
    ),
  );
}

/**
 * Returns the SPL token balance of a token account, or 0 if it does not exist.
 */
export async function getBalance(
  banksClient: BanksClient,
  ata: PublicKey,
): Promise<BN> {
  const account = await banksClient.getAccount(ata);
  if (!account) return new BN(0);
  return new BN(AccountLayout.decode(account.data).amount.toString());
}

/**
 * Expects `fn` to throw with a custom program error message containing `hexCode`.
 */
export async function expectProgramError(
  fn: () => Promise<void>,
  hexCode: string,
) {
  let threw = false;
  try {
    await fn();
  } catch (err) {
    threw = true;
    const message = err instanceof Error ? err.message : String(err);
    expect(
      message.includes(hexCode),
      `expected error ${hexCode} but got: ${message}`,
    ).toBe(true);
  }
  expect(threw, "expected transaction to fail but it succeeded").toBe(true);
}

/**
 * Creates a customizable pool with a single full-range position for use in tests.
 * The compounding fee is enabled automatically when `collectFeeMode` is Compounding.
 */
export async function createPool(
  banksClient: BanksClient,
  ammInstance: CpAmm,
  payer: Keypair,
  creator: Keypair,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  collectFeeMode: CollectFeeMode = CollectFeeMode.BothToken,
): Promise<{ pool: PublicKey; position: PublicKey; positionNft: PublicKey }> {
  const baseFee = getBaseFeeParams({
    baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
    feeTimeSchedulerParam: {
      startingFeeBps: 2500,
      endingFeeBps: 2500,
      numberOfPeriod: 0,
      totalDuration: 0,
    },
  });

  const poolFees: PoolFeesParams = {
    baseFee,
    compoundingFeeBps: collectFeeMode === CollectFeeMode.Compounding ? 5000 : 0,
    padding: 0,
    dynamicFee: null,
  };

  const positionNft = Keypair.generate();
  const tokenAAmount = new BN(1000 * 10 ** DECIMALS);
  const tokenBAmount = new BN(1000 * 10 ** DECIMALS);
  const { liquidityDelta, initSqrtPrice } =
    ammInstance.preparePoolCreationParams({
      tokenAAmount,
      tokenBAmount,
      minSqrtPrice: MIN_SQRT_PRICE,
      maxSqrtPrice: MAX_SQRT_PRICE,
      collectFeeMode,
    });

  const params: InitializeCustomizeablePoolParams = {
    payer: payer.publicKey,
    creator: creator.publicKey,
    positionNft: positionNft.publicKey,
    tokenAMint,
    tokenBMint,
    tokenAAmount,
    tokenBAmount,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    liquidityDelta,
    initSqrtPrice,
    poolFees,
    hasAlphaVault: false,
    activationType: ActivationType.Timestamp,
    collectFeeMode,
    activationPoint: null,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
  };

  const { tx, pool, position } = await ammInstance.createCustomPool(params);
  await executeTransaction(banksClient, tx, [payer, positionNft]);
  return { pool, position, positionNft: positionNft.publicKey };
}

export async function createDynamicConfig(
  banksClient: BanksClient,
  program: Program<CpAmmTypes>,
  admin: Keypair,
  index: BN,
  poolCreatorAuthority: PublicKey,
): Promise<PublicKey> {
  const config = deriveConfigAddress(index);
  const transaction = await program.methods
    .createDynamicConfig(index, { poolCreatorAuthority })
    .accountsPartial({
      config,
      operator: deriveOperatorAddress(admin.publicKey),
      signer: admin.publicKey,
      payer: admin.publicKey,
    })
    .transaction();

  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    transaction.recentBlockhash = (await banksClient.getLatestBlockhash())[0];
    transaction.signatures = [];
    transaction.sign(admin);

    const transactionMeta =
      await banksClient.tryProcessTransaction(transaction);

    if (transactionMeta.result && transactionMeta.result.length > 0) {
      const errorMessage = transactionMeta.result;
      if (errorMessage.includes("Account in use") && attempt < maxRetries - 1) {
        const delay = 50 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw Error(errorMessage);
    }
    break;
  }

  return config;
}
