import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import { CP_AMM_PROGRAM_ID, DECIMALS } from "./constants";
import { createToken, mintTo } from "./token";
import { ExtensionType } from "@solana/spl-token";
import { createToken2022, mintToToken2022 } from "./token2022";
import {
  deriveConfigAddress,
  deriveOperatorAddress,
  PoolState,
  PositionState,
} from "../../src";
import { CpAmm as CpAmmTypes } from "../../src/idl/cp_amm";

export { CP_AMM_PROGRAM_ID };

export const connection = new Connection("http://127.0.0.1:8899", "confirmed");

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

export async function fundSol(
  conn: Connection,
  publicKey: PublicKey,
  solAmount = 1000,
): Promise<void> {
  const sig = await conn.requestAirdrop(
    publicKey,
    solAmount * LAMPORTS_PER_SOL,
  );
  const latestBlockhash = await conn.getLatestBlockhash();
  await conn.confirmTransaction(
    {
      signature: sig,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed",
  );
}

export async function transferSol(
  conn: Connection,
  from: Keypair,
  to: PublicKey,
  amount: BN,
) {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: to,
      lamports: BigInt(amount.toString()),
    }),
  );
  await sendAndConfirmTransaction(conn, transaction, [from]);
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
  conn: Connection,
  payer: Keypair,
  user?: Keypair,
): Promise<Keypair> {
  if (!user) {
    user = Keypair.generate();
  }
  await transferSol(conn, payer, user.publicKey, new BN(LAMPORTS_PER_SOL));
  return user;
}

export async function setupTestContext(
  conn: Connection,
  rootKeypair: Keypair,
  token2022: boolean,
  extensions?: ExtensionType[],
) {
  const [admin, payer, poolCreator, user, funder, operator, partner] = Array(7)
    .fill(7)
    .map(() => Keypair.generate());

  const recipients = [
    admin.publicKey,
    payer.publicKey,
    user.publicKey,
    funder.publicKey,
    operator.publicKey,
    partner.publicKey,
    poolCreator.publicKey,
  ];

  // Fund all participants sequentially to avoid nonce conflicts
  for (const recipient of recipients) {
    await transferSol(conn, rootKeypair, recipient, new BN(100 * LAMPORTS_PER_SOL));
  }

  const rawAmount = 100_000_000 * 10 ** DECIMALS;

  const tokenAMintKeypair = Keypair.generate();
  const tokenBMintKeypair = Keypair.generate();
  const rewardMintKeypair = Keypair.generate();

  const mintRecipients = [
    payer.publicKey,
    user.publicKey,
    partner.publicKey,
    poolCreator.publicKey,
  ];

  if (token2022) {
    await Promise.all([
      createToken2022(conn, rootKeypair, tokenAMintKeypair, extensions ?? []),
      createToken2022(conn, rootKeypair, tokenBMintKeypair, extensions ?? []),
      createToken2022(conn, rootKeypair, rewardMintKeypair, extensions ?? []),
    ]);

    for (const publicKey of mintRecipients) {
      await mintToToken2022(
        conn,
        rootKeypair,
        rootKeypair,
        tokenAMintKeypair.publicKey,
        publicKey,
        BigInt(rawAmount),
      );
      await mintToToken2022(
        conn,
        rootKeypair,
        rootKeypair,
        tokenBMintKeypair.publicKey,
        publicKey,
        BigInt(rawAmount),
      );
    }

    await mintToToken2022(
      conn,
      rootKeypair,
      rootKeypair,
      rewardMintKeypair.publicKey,
      funder.publicKey,
      BigInt(rawAmount),
    );
    await mintToToken2022(
      conn,
      rootKeypair,
      rootKeypair,
      rewardMintKeypair.publicKey,
      user.publicKey,
      BigInt(rawAmount),
    );
  } else {
    await Promise.all([
      createToken(conn, rootKeypair, tokenAMintKeypair),
      createToken(conn, rootKeypair, tokenBMintKeypair),
      createToken(conn, rootKeypair, rewardMintKeypair),
    ]);

    for (const publicKey of mintRecipients) {
      await mintTo(
        conn,
        rootKeypair,
        tokenAMintKeypair.publicKey,
        rootKeypair,
        publicKey,
        new BN(rawAmount),
      );
      await mintTo(
        conn,
        rootKeypair,
        tokenBMintKeypair.publicKey,
        rootKeypair,
        publicKey,
        new BN(rawAmount),
      );
    }

    await mintTo(
      conn,
      rootKeypair,
      rewardMintKeypair.publicKey,
      rootKeypair,
      funder.publicKey,
      new BN(rawAmount),
    );
    await mintTo(
      conn,
      rootKeypair,
      rewardMintKeypair.publicKey,
      rootKeypair,
      user.publicKey,
      new BN(rawAmount),
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
    partner,
  };
}

export function randomID(min = 0, max = 10000) {
  return Math.floor(Math.random() * (max - min) + min);
}

export async function executeTransaction(
  conn: Connection,
  transaction: Transaction,
  signers: Signer[],
) {
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    }),
  );
  await sendAndConfirmTransaction(conn, transaction, signers);
}

export async function getPool(
  conn: Connection,
  program: Program<CpAmmTypes>,
  pool: PublicKey,
): Promise<PoolState> {
  const account = await conn.getAccountInfo(pool);
  if (!account) throw new Error(`Pool account ${pool.toBase58()} not found`);
  return program.coder.accounts.decode("pool", account.data);
}

export async function getPosition(
  conn: Connection,
  program: Program<CpAmmTypes>,
  position: PublicKey,
): Promise<PositionState> {
  const account = await conn.getAccountInfo(position);
  if (!account)
    throw new Error(`Position account ${position.toBase58()} not found`);
  return program.coder.accounts.decode("position", account.data);
}

export async function createOperator(
  conn: Connection,
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

  await sendAndConfirmTransaction(conn, transaction, [admin]);
  return operator;
}

export async function createDynamicConfig(
  conn: Connection,
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

  await sendAndConfirmTransaction(conn, transaction, [admin]);
  return config;
}

/**
 * Send a pre-signed transaction (signers already called transaction.sign()).
 * Used for backward compat with tests that sign manually before calling this.
 */
export async function processTransactionMaybeThrow(
  conn: Connection,
  transaction: Transaction,
  signers?: Signer[],
) {
  if (signers && signers.length > 0) {
    await sendAndConfirmTransaction(conn, transaction, signers);
  } else {
    const latestBlockhash = await conn.getLatestBlockhash();
    if (!transaction.recentBlockhash) {
      transaction.recentBlockhash = latestBlockhash.blockhash;
    }
    const rawTx = transaction.serialize();
    const sig = await conn.sendRawTransaction(rawTx);
    await conn.confirmTransaction(
      {
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed",
    );
  }
}
