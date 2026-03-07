import { ProgramTestContext } from "solana-bankrun";
import {
  executeTransaction,
  getPool,
  getPosition,
  setupTestContext,
  startTest,
} from "./bankrun-utils/common";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

import {
  ActivationType,
  AddLiquidityParams,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  derivePositionNftAccount,
  getBaseFeeParams,
  getTokenProgram,
  InitializeCustomizeablePoolParams,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
  RemoveAllLiquidityParams,
  SwapParams,
} from "../src";
import { DECIMALS, U64_MAX } from "./bankrun-utils";
import { beforeEach, describe, it } from "vitest";

describe("Compounding liquidity", () => {
  let context: ProgramTestContext;
  let payer: Keypair;
  let creator: Keypair;
  let tokenX: PublicKey;
  let tokenY: PublicKey;
  let ammInstance: CpAmm;

  beforeEach(async () => {
    context = await startTest();
    const prepareContext = await setupTestContext(
      context.banksClient,
      context.payer,
      false,
    );

    creator = prepareContext.poolCreator;
    payer = prepareContext.payer;
    tokenX = prepareContext.tokenAMint;
    tokenY = prepareContext.tokenBMint;
    const connection = new Connection(clusterApiUrl("devnet"));
    ammInstance = new CpAmm(connection);
  });

  it("Full flow: create pool, add liquidity, swap, remove all liquidity", async () => {
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
      6,
      ActivationType.Timestamp,
    );

    const poolFees: PoolFeesParams = {
      baseFee,
      compoundingFeeBps: 5000,
      padding: 0,
      dynamicFee: null,
    };

    const positionNft = Keypair.generate();

    const tokenAAmount = new BN(1000 * 10 ** DECIMALS);
    const tokenBAmount = new BN(1000 * 10 ** DECIMALS);
    const { liquidityDelta: initPoolLiquidityDelta, initSqrtPrice } =
      ammInstance.preparePoolCreationParams({
        tokenAAmount,
        tokenBAmount,
        minSqrtPrice: MIN_SQRT_PRICE,
        maxSqrtPrice: MAX_SQRT_PRICE,
        collectFeeMode: CollectFeeMode.Compounding,
      });

    const params: InitializeCustomizeablePoolParams = {
      payer: payer.publicKey,
      creator: creator.publicKey,
      positionNft: positionNft.publicKey,
      tokenAMint: tokenX,
      tokenBMint: tokenY,
      tokenAAmount: new BN(1000 * 10 ** DECIMALS),
      tokenBAmount: new BN(1000 * 10 ** DECIMALS),
      sqrtMinPrice: MIN_SQRT_PRICE,
      sqrtMaxPrice: MAX_SQRT_PRICE,
      liquidityDelta: initPoolLiquidityDelta,
      initSqrtPrice,
      poolFees,
      hasAlphaVault: false,
      activationType: 1,
      collectFeeMode: CollectFeeMode.Compounding,
      activationPoint: null,
      tokenAProgram: TOKEN_PROGRAM_ID,
      tokenBProgram: TOKEN_PROGRAM_ID,
    };

    const {
      tx: transaction,
      pool,
      position,
    } = await ammInstance.createCustomPool(params);

    await executeTransaction(context.banksClient, transaction, [
      payer,
      positionNft,
    ]);

    // add liquidity
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
    const { liquidityDelta } = await ammInstance.getDepositQuote({
      inAmount: new BN(1000 * 10 ** DECIMALS),
      isTokenA: true,
      sqrtPrice: poolState.sqrtPrice,
      minSqrtPrice: poolState.sqrtMinPrice,
      maxSqrtPrice: poolState.sqrtMaxPrice,
      collectFeeMode: poolState.collectFeeMode,
      tokenAAmount: poolState.tokenAAmount,
      tokenBAmount: poolState.tokenBAmount,
      liquidity: poolState.liquidity,
    });

    const addLiquidityParams: AddLiquidityParams = {
      owner: creator.publicKey,
      position,
      pool,
      positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
      liquidityDelta,
      maxAmountTokenA: new BN(1000 * 10 ** DECIMALS),
      maxAmountTokenB: new BN(1000 * 10 ** DECIMALS),
      tokenAAmountThreshold: new BN(U64_MAX),
      tokenBAmountThreshold: new BN(U64_MAX),
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram: getTokenProgram(poolState.tokenAFlag),
      tokenBProgram: getTokenProgram(poolState.tokenBFlag),
    };
    const addLiquidityTx = await ammInstance.addLiquidity(addLiquidityParams);
    await executeTransaction(context.banksClient, addLiquidityTx, [creator]);

    // swap
    const poolStateAfterAdd = await getPool(
      context.banksClient,
      ammInstance._program,
      pool,
    );
    const swapParams: SwapParams = {
      payer: payer.publicKey,
      pool,
      inputTokenMint: poolStateAfterAdd.tokenAMint,
      outputTokenMint: poolStateAfterAdd.tokenBMint,
      amountIn: new BN(100 * 10 ** DECIMALS),
      minimumAmountOut: new BN(0),
      tokenAMint: poolStateAfterAdd.tokenAMint,
      tokenBMint: poolStateAfterAdd.tokenBMint,
      tokenAVault: poolStateAfterAdd.tokenAVault,
      tokenBVault: poolStateAfterAdd.tokenBVault,
      tokenAProgram: getTokenProgram(poolStateAfterAdd.tokenAFlag),
      tokenBProgram: getTokenProgram(poolStateAfterAdd.tokenBFlag),
      referralTokenAccount: null,
      poolState: poolStateAfterAdd,
    };
    const swapTx = await ammInstance.swap(swapParams);
    await executeTransaction(context.banksClient, swapTx, [payer]);

    // remove all liquidity
    const removeAllLiquidityParams: RemoveAllLiquidityParams = {
      owner: creator.publicKey,
      position,
      pool,
      positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
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
    };
    const removeAllLiquidityTx =
      await ammInstance.removeAllLiquidity(removeAllLiquidityParams);
    await executeTransaction(context.banksClient, removeAllLiquidityTx, [
      creator,
    ]);
  });
});
