import { BanksClient, Clock, ProgramTestContext } from "solana-bankrun";
import {
  attachBanksClient,
  createUsersAndFund,
  executeTransaction,
  getPool,
  getPosition,
  setupTestContext,
  startTest,
} from "./bankrun-utils/common";
import { getTokenAccount, mintTo } from "./bankrun-utils/token";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  AccountLayout,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  derivePositionAddress,
  derivePositionNftAccount,
  encodeDelegatePermissions,
  getBaseFeeParams,
  getTokenProgram,
  InitializeCustomizeablePoolParams,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
  PositionDelegatePermission,
} from "../src";
import { DECIMALS, U64_MAX } from "./bankrun-utils";
import { beforeEach, describe, expect, it } from "vitest";

const FULL_AMOUNT = new BN(1_000_000 * 10 ** DECIMALS);

async function advanceTimeBy(context: ProgramTestContext, seconds: number) {
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

async function getBalance(
  banksClient: BanksClient,
  ata: PublicKey,
): Promise<BN> {
  const account = await banksClient.getAccount(ata);
  if (!account) return new BN(0);
  return new BN(AccountLayout.decode(account.data).amount.toString());
}

// expects executeTransaction to throw with a custom program error matching `hexCode`
async function expectProgramError(
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

describe("Delegate Position", () => {
  let context: ProgramTestContext;
  let payer: Keypair;
  let creator: Keypair;
  let user: Keypair;
  let funder: Keypair;
  let delegate: Keypair;
  let nonAuthorized: Keypair;
  let tokenAMint: PublicKey;
  let tokenBMint: PublicKey;
  let rewardMint: PublicKey;
  let ammInstance: CpAmm;
  let pool: PublicKey;

  const rewardIndex = 0;
  const rewardDuration = new BN(24 * 60 * 60);

  beforeEach(async () => {
    context = await startTest();
    const prepareContext = await setupTestContext(
      context.banksClient,
      context.payer,
      false,
    );

    payer = prepareContext.payer;
    creator = prepareContext.poolCreator;
    user = prepareContext.user;
    funder = prepareContext.funder;
    tokenAMint = prepareContext.tokenAMint;
    tokenBMint = prepareContext.tokenBMint;
    rewardMint = prepareContext.rewardMint;

    delegate = await createUsersAndFund(context.banksClient, context.payer);
    nonAuthorized = await createUsersAndFund(
      context.banksClient,
      context.payer,
    );

    // delegate needs its own token balances to add liquidity on behalf of the owner
    for (const mint of [tokenAMint, tokenBMint]) {
      await mintTo(
        context.banksClient,
        context.payer,
        mint,
        context.payer,
        delegate.publicKey,
        BigInt(FULL_AMOUNT.toString()),
      );
    }

    const connection = new Connection(clusterApiUrl("devnet"));
    ammInstance = new CpAmm(connection);
    attachBanksClient(ammInstance._program, context.banksClient);

    pool = await createPool(
      context.banksClient,
      ammInstance,
      payer,
      creator,
      tokenAMint,
      tokenBMint,
    );

    // initialize and fund a reward so delegate reward-claim flows can be tested
    const initRewardTx = await ammInstance.initializeReward({
      rewardIndex,
      rewardDuration,
      rewardMint,
      pool,
      funder: funder.publicKey,
      payer: payer.publicKey,
      creator: creator.publicKey,
      rewardMintProgram: TOKEN_PROGRAM_ID,
    });
    await executeTransaction(context.banksClient, initRewardTx, [
      payer,
      creator,
    ]);

    const rewardVault = (
      await getPool(context.banksClient, ammInstance._program, pool)
    ).rewardInfos[rewardIndex].vault;
    const fundRewardTx = await ammInstance.fundReward({
      rewardIndex,
      funder: funder.publicKey,
      pool,
      carryForward: true,
      amount: new BN(rewardDuration.toNumber() * 1000),
      rewardMint,
      rewardVault,
      rewardMintProgram: TOKEN_PROGRAM_ID,
    });
    await executeTransaction(context.banksClient, fundRewardTx, [funder]);
  });

  async function createUserPosition(): Promise<{
    position: PublicKey;
    positionNft: PublicKey;
    positionNftAccount: PublicKey;
  }> {
    const positionNft = Keypair.generate();
    const tx = await ammInstance.createPosition({
      owner: user.publicKey,
      payer: user.publicKey,
      pool,
      positionNft: positionNft.publicKey,
    });
    await executeTransaction(context.banksClient, tx, [user, positionNft]);

    return {
      position: derivePositionAddress(positionNft.publicKey),
      positionNft: positionNft.publicKey,
      positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
    };
  }

  async function addLiquidity(owner: Keypair, position: PublicKey) {
    const poolState = await getPool(
      context.banksClient,
      ammInstance._program,
      pool,
    );
    const positionState = await getPosition(
      context.banksClient,
      ammInstance._program,
      position,
    );
    const { liquidityDelta } = ammInstance.getDepositQuote({
      inAmount: new BN(100 * 10 ** DECIMALS),
      isTokenA: true,
      sqrtPrice: poolState.sqrtPrice,
      minSqrtPrice: poolState.sqrtMinPrice,
      maxSqrtPrice: poolState.sqrtMaxPrice,
      collectFeeMode: poolState.collectFeeMode,
      tokenAAmount: poolState.tokenAAmount,
      tokenBAmount: poolState.tokenBAmount,
      liquidity: poolState.liquidity,
    });
    const tx = await ammInstance.addLiquidity({
      owner: owner.publicKey,
      pool,
      position,
      positionNftAccount: derivePositionNftAccount(positionState.nftMint),
      liquidityDelta,
      maxAmountTokenA: FULL_AMOUNT,
      maxAmountTokenB: FULL_AMOUNT,
      tokenAAmountThreshold: U64_MAX,
      tokenBAmountThreshold: U64_MAX,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram: getTokenProgram(poolState.tokenAFlag),
      tokenBProgram: getTokenProgram(poolState.tokenBFlag),
    });
    await executeTransaction(context.banksClient, tx, [owner]);
  }

  function grantPermission(
    owner: Keypair,
    positionNft: PublicKey,
    delegateKey: PublicKey,
    permissions: PositionDelegatePermission[],
  ) {
    return ammInstance.updateDelegatePermission({
      owner: owner.publicKey,
      positionNft,
      delegate: delegateKey,
      permission: encodeDelegatePermissions(permissions),
    });
  }

  it("updateDelegatePermission grants permission and approves the delegate", async () => {
    const { position, positionNft, positionNftAccount } =
      await createUserPosition();

    const permissions = [
      PositionDelegatePermission.AddLiquidity,
      PositionDelegatePermission.RemoveLiquidity,
      PositionDelegatePermission.ClaimPositionFee,
      PositionDelegatePermission.ClaimReward,
      PositionDelegatePermission.LockPosition,
    ];
    const tx = await grantPermission(
      user,
      positionNft,
      delegate.publicKey,
      permissions,
    );
    await executeTransaction(context.banksClient, tx, [user]);

    const positionState = await getPosition(
      context.banksClient,
      ammInstance._program,
      position,
    );
    expect(positionState.delegatePermission).toBe(
      encodeDelegatePermissions(permissions),
    );

    const nftAccount = await getTokenAccount(
      context.banksClient,
      positionNftAccount,
    );
    expect(nftAccount.delegateOption).toBe(1);
    expect(nftAccount.delegate.toBase58()).toBe(delegate.publicKey.toBase58());
  });

  it("delegate with AddLiquidity permission can add liquidity", async () => {
    const { position, positionNft } = await createUserPosition();

    const tx = await grantPermission(user, positionNft, delegate.publicKey, [
      PositionDelegatePermission.AddLiquidity,
    ]);
    await executeTransaction(context.banksClient, tx, [user]);

    const before = await getPosition(
      context.banksClient,
      ammInstance._program,
      position,
    );
    expect(before.unlockedLiquidity.isZero()).toBe(true);

    await addLiquidity(delegate, position);

    const after = await getPosition(
      context.banksClient,
      ammInstance._program,
      position,
    );
    expect(after.unlockedLiquidity.gt(before.unlockedLiquidity)).toBe(true);
  });

  it("delegate with RemoveLiquidity permission can remove liquidity", async () => {
    const { position, positionNft } = await createUserPosition();
    await addLiquidity(user, position);

    const tx = await grantPermission(user, positionNft, delegate.publicKey, [
      PositionDelegatePermission.RemoveLiquidity,
    ]);
    await executeTransaction(context.banksClient, tx, [user]);

    const before = await getPosition(
      context.banksClient,
      ammInstance._program,
      position,
    );
    expect(before.unlockedLiquidity.gtn(0)).toBe(true);

    const poolState = await getPool(
      context.banksClient,
      ammInstance._program,
      pool,
    );
    const removeTx = await ammInstance.removeLiquidity({
      owner: delegate.publicKey,
      pool,
      position,
      positionNftAccount: derivePositionNftAccount(before.nftMint),
      liquidityDelta: before.unlockedLiquidity.divn(2),
      tokenAAmountThreshold: new BN(0),
      tokenBAmountThreshold: new BN(0),
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram: getTokenProgram(poolState.tokenAFlag),
      tokenBProgram: getTokenProgram(poolState.tokenBFlag),
      vestings: [],
      currentPoint: new BN(0),
    });
    await executeTransaction(context.banksClient, removeTx, [delegate]);

    const after = await getPosition(
      context.banksClient,
      ammInstance._program,
      position,
    );
    expect(after.unlockedLiquidity.lt(before.unlockedLiquidity)).toBe(true);
  });

  it("delegate with ClaimReward permission can claim reward", async () => {
    const { position, positionNft } = await createUserPosition();
    await addLiquidity(user, position);

    const tx = await grantPermission(user, positionNft, delegate.publicKey, [
      PositionDelegatePermission.ClaimReward,
    ]);
    await executeTransaction(context.banksClient, tx, [user]);

    await advanceTimeBy(context, 60 * 60);

    const poolState = await getPool(
      context.banksClient,
      ammInstance._program,
      pool,
    );
    const positionState = await getPosition(
      context.banksClient,
      ammInstance._program,
      position,
    );
    const delegateRewardAta = getAssociatedTokenAddressSync(
      rewardMint,
      delegate.publicKey,
      true,
      TOKEN_PROGRAM_ID,
    );
    const before = await getBalance(context.banksClient, delegateRewardAta);

    const claimTx = await ammInstance.claimReward({
      user: delegate.publicKey,
      position,
      poolState,
      positionState,
      positionNftAccount: derivePositionNftAccount(positionState.nftMint),
      rewardIndex,
      isSkipReward: false,
    });
    await executeTransaction(context.banksClient, claimTx, [delegate]);

    const after = await getBalance(context.banksClient, delegateRewardAta);
    expect(after.gt(before)).toBe(true);
  });

  it("delegate with LockPosition permission can permanently lock the position", async () => {
    const { position, positionNft } = await createUserPosition();
    await addLiquidity(user, position);

    const tx = await grantPermission(user, positionNft, delegate.publicKey, [
      PositionDelegatePermission.LockPosition,
    ]);
    await executeTransaction(context.banksClient, tx, [user]);

    const before = await getPosition(
      context.banksClient,
      ammInstance._program,
      position,
    );
    const lockTx = await ammInstance.permanentLockPosition({
      owner: delegate.publicKey,
      position,
      positionNftAccount: derivePositionNftAccount(before.nftMint),
      pool,
      unlockedLiquidity: before.unlockedLiquidity,
    });
    await executeTransaction(context.banksClient, lockTx, [delegate]);

    const after = await getPosition(
      context.banksClient,
      ammInstance._program,
      position,
    );
    expect(after.permanentLockedLiquidity.gt(new BN(0))).toBe(true);
    expect(after.unlockedLiquidity.isZero()).toBe(true);
  });

  it("rejects a non-authorized signer", async () => {
    const { position, positionNft } = await createUserPosition();
    await addLiquidity(user, position);

    await grantPermission(user, positionNft, delegate.publicKey, [
      PositionDelegatePermission.AddLiquidity,
    ]).then((tx) => executeTransaction(context.banksClient, tx, [user]));

    // InvalidAuthority = 6053 = 0x17a5
    await expectProgramError(
      () => addLiquidity(nonAuthorized, position),
      "0x17a5",
    );
  });

  it("rejects after the owner revokes the delegate permission", async () => {
    const { position, positionNft } = await createUserPosition();

    await grantPermission(user, positionNft, delegate.publicKey, [
      PositionDelegatePermission.AddLiquidity,
    ]).then((tx) => executeTransaction(context.banksClient, tx, [user]));

    await addLiquidity(delegate, position);

    // revoke: empty permission set
    await grantPermission(user, positionNft, delegate.publicKey, []).then(
      (tx) => executeTransaction(context.banksClient, tx, [user]),
    );

    const positionState = await getPosition(
      context.banksClient,
      ammInstance._program,
      position,
    );
    expect(positionState.delegatePermission).toBe(0);

    // InvalidPermission = 6054 = 0x17a6
    await expectProgramError(
      () => addLiquidity(delegate, position),
      "0x17a6",
    );
  });
});

async function createPool(
  banksClient: BanksClient,
  ammInstance: CpAmm,
  payer: Keypair,
  creator: Keypair,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
): Promise<PublicKey> {
  const baseFee = getBaseFeeParams(
    {
      baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
      feeTimeSchedulerParam: {
        startingFeeBps: 2500,
        endingFeeBps: 2500,
        numberOfPeriod: 0,
        totalDuration: 0,
      },
    },
    DECIMALS,
    ActivationType.Timestamp,
  );

  const poolFees: PoolFeesParams = {
    baseFee,
    compoundingFeeBps: 0,
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
      collectFeeMode: CollectFeeMode.BothToken,
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
    collectFeeMode: CollectFeeMode.BothToken,
    activationPoint: null,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
  };

  const { tx, pool } = await ammInstance.createCustomPool(params);
  await executeTransaction(banksClient, tx, [payer, positionNft]);
  return pool;
}
