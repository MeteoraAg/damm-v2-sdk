import { ProgramTestContext } from "solana-bankrun";
import {
  advanceTimeBy,
  attachBanksClient,
  createPool,
  executeTransaction,
  expectProgramError,
  getBalance,
  getPool,
  setupTestContext,
  startTest,
} from "./bankrun-utils/common";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from "bn.js";
import {
  CollectFeeMode,
  CpAmm,
  DEAD_LIQUIDITY,
  derivePositionNftAccount,
  getTokenProgram,
} from "../src";
import { beforeEach, describe, expect, it } from "vitest";

const REWARD_INDEX = 0;
const REWARD_DURATION = 24 * 60 * 60; // 1 day
const REWARD_AMOUNT = new BN(REWARD_DURATION * 1000);

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

  async function setupFundedRewardPool(
    collectFeeMode: CollectFeeMode,
  ): Promise<{
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
    const funderBefore = await getBalance(
      context.banksClient,
      funderRewardAta(),
    );

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

    const funderBefore = await getBalance(
      context.banksClient,
      funderRewardAta(),
    );
    const withdrawTx = await ammInstance.withdrawDeadLiquidityReward({
      rewardIndex: REWARD_INDEX,
      pool,
      funder: funder.publicKey,
    });
    await executeTransaction(context.banksClient, withdrawTx, [funder]);

    const funderAfter = await getBalance(
      context.banksClient,
      funderRewardAta(),
    );
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
