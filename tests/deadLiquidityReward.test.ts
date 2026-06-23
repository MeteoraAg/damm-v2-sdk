import { BanksClient, Clock, ProgramTestContext } from "solana-bankrun";
import {
  attachBanksClient,
  executeTransaction,
  getPool,
  setupTestContext,
  startTest,
} from "./bankrun-utils/common";
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
  DEAD_LIQUIDITY,
  derivePositionNftAccount,
  getBaseFeeParams,
  getTokenProgram,
  InitializeCustomizeablePoolParams,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
} from "../src";
import { DECIMALS } from "./bankrun-utils";
import { beforeEach, describe, expect, it } from "vitest";

const REWARD_INDEX = 0;
const REWARD_DURATION = 24 * 60 * 60; // 1 day
const REWARD_AMOUNT = new BN(REWARD_DURATION * 1000);

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

async function expectProgramError(fn: () => Promise<void>, hexCode: string) {
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

describe("Dead liquidity reward (compounding fee mode)", () => {
  let context: ProgramTestContext;
  let payer: Keypair;
  let creator: Keypair;
  let funder: Keypair;
  let tokenAMint: PublicKey;
  let tokenBMint: PublicKey;
  let rewardMint: PublicKey;
  let ammInstance: CpAmm;

  beforeEach(async () => {
    context = await startTest();
    const prepareContext = await setupTestContext(
      context.banksClient,
      context.payer,
      false,
    );

    payer = prepareContext.payer;
    creator = prepareContext.poolCreator;
    funder = prepareContext.funder;
    tokenAMint = prepareContext.tokenAMint;
    tokenBMint = prepareContext.tokenBMint;
    rewardMint = prepareContext.rewardMint;

    const connection = new Connection(clusterApiUrl("devnet"));
    ammInstance = new CpAmm(connection);
    attachBanksClient(ammInstance._program, context.banksClient);
  });

  const funderRewardAta = () =>
    getAssociatedTokenAddressSync(
      rewardMint,
      funder.publicKey,
      true,
      TOKEN_PROGRAM_ID,
    );

  async function setupFundedRewardPool(collectFeeMode: CollectFeeMode): Promise<{
    pool: PublicKey;
    position: PublicKey;
    positionNft: PublicKey;
  }> {
    const { pool, position, positionNft } = await createPool(
      context.banksClient,
      ammInstance,
      payer,
      creator,
      tokenAMint,
      tokenBMint,
      collectFeeMode,
    );

    const initRewardTx = await ammInstance.initializeReward({
      rewardIndex: REWARD_INDEX,
      rewardDuration: new BN(REWARD_DURATION),
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
    ).rewardInfos[REWARD_INDEX].vault;

    const fundRewardTx = await ammInstance.fundReward({
      rewardIndex: REWARD_INDEX,
      funder: funder.publicKey,
      pool,
      carryForward: true,
      amount: REWARD_AMOUNT,
      rewardMint,
      rewardVault,
      rewardMintProgram: TOKEN_PROGRAM_ID,
    });
    await executeTransaction(context.banksClient, fundRewardTx, [funder]);

    return { pool, position, positionNft };
  }

  async function removeAllLiquidity(
    pool: PublicKey,
    position: PublicKey,
    positionNft: PublicKey,
  ) {
    const poolState = await getPool(
      context.banksClient,
      ammInstance._program,
      pool,
    );
    const tx = await ammInstance.removeAllLiquidity({
      owner: creator.publicKey,
      pool,
      position,
      positionNftAccount: derivePositionNftAccount(positionNft),
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
    await executeTransaction(context.banksClient, tx, [creator]);
  }

  it("funder recovers the dead-liquidity reward after the last LP exits", async () => {
    const { pool, position, positionNft } = await setupFundedRewardPool(
      CollectFeeMode.Compounding,
    );

    await removeAllLiquidity(pool, position, positionNft);

    // only the permanent dead liquidity remains in the pool
    const afterExit = await getPool(
      context.banksClient,
      ammInstance._program,
      pool,
    );
    expect(afterExit.liquidity.eq(DEAD_LIQUIDITY)).toBe(true);

    // warp past the reward campaign so everything has accrued
    await advanceTimeBy(context, REWARD_DURATION + 1);

    const rewardVault = afterExit.rewardInfos[REWARD_INDEX].vault;
    const funderBefore = await getBalance(context.banksClient, funderRewardAta());

    const withdrawTx = await ammInstance.withdrawDeadLiquidityReward({
      rewardIndex: REWARD_INDEX,
      pool,
      funder: funder.publicKey,
    });
    await executeTransaction(context.banksClient, withdrawTx, [funder]);

    const recovered = (
      await getBalance(context.banksClient, funderRewardAta())
    ).sub(funderBefore);
    const vaultResidual = await getBalance(context.banksClient, rewardVault);

    expect(recovered.gtn(0)).toBe(true);
    expect(vaultResidual.eqn(0)).toBe(true);
  });

  it("funder can withdraw dead-liquidity reward mid-campaign and the checkpoint advances", async () => {
    const { pool } = await setupFundedRewardPool(CollectFeeMode.Compounding);

    await advanceTimeBy(context, REWARD_DURATION / 2);

    const funderBefore = await getBalance(context.banksClient, funderRewardAta());
    const withdrawTx = await ammInstance.withdrawDeadLiquidityReward({
      rewardIndex: REWARD_INDEX,
      pool,
      funder: funder.publicKey,
    });
    await executeTransaction(context.banksClient, withdrawTx, [funder]);

    const funderAfter = await getBalance(context.banksClient, funderRewardAta());
    expect(funderAfter.gt(funderBefore)).toBe(true);

    const checkpoint = (
      await getPool(context.banksClient, ammInstance._program, pool)
    ).rewardInfos[REWARD_INDEX].deadLiquidityRewardCheckpoint;
    expect(checkpoint.gtn(0)).toBe(true);
  });

  it("withdrawDeadLiquidityReward fails on a non-compounding pool", async () => {
    const { pool } = await setupFundedRewardPool(CollectFeeMode.BothToken);

    await advanceTimeBy(context, REWARD_DURATION + 1);

    // InvalidCollectFeeMode = 6017 = 0x1781
    await expectProgramError(async () => {
      const tx = await ammInstance.withdrawDeadLiquidityReward({
        rewardIndex: REWARD_INDEX,
        pool,
        funder: funder.publicKey,
      });
      await executeTransaction(context.banksClient, tx, [funder]);
    }, "0x1781");
  });
});

async function createPool(
  banksClient: BanksClient,
  ammInstance: CpAmm,
  payer: Keypair,
  creator: Keypair,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  collectFeeMode: CollectFeeMode,
): Promise<{ pool: PublicKey; position: PublicKey; positionNft: PublicKey }> {
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
    compoundingFeeBps:
      collectFeeMode === CollectFeeMode.Compounding ? 5000 : 0,
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
