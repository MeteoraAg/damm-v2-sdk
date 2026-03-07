import { ProgramTestContext } from "solana-bankrun";
import {
  executeTransaction,
  getPool,
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
  PoolState,
  SwapMode,
} from "../src";
import { DECIMALS, U64_MAX } from "./bankrun-utils";
import { beforeEach, describe, it, expect } from "vitest";

async function createPoolWithLiquidity(
  context: ProgramTestContext,
  ammInstance: CpAmm,
  payer: Keypair,
  tokenX: PublicKey,
  tokenY: PublicKey,
  collectFeeMode: CollectFeeMode,
  compoundingFeeBps: number,
): Promise<{ pool: PublicKey; position: PublicKey; positionNft: Keypair }> {
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
    compoundingFeeBps,
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
      collectFeeMode,
    });

  const params: InitializeCustomizeablePoolParams = {
    payer: payer.publicKey,
    creator: payer.publicKey,
    positionNft: positionNft.publicKey,
    tokenAMint: tokenX,
    tokenBMint: tokenY,
    tokenAAmount,
    tokenBAmount,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    liquidityDelta: initPoolLiquidityDelta,
    initSqrtPrice,
    poolFees,
    hasAlphaVault: false,
    activationType: 1,
    collectFeeMode,
    activationPoint: null,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
  };

  const createResult = await ammInstance.createCustomPool(params);
  await executeTransaction(context.banksClient, createResult.tx, [
    payer,
    positionNft,
  ]);

  const poolState = await getPool(
    context.banksClient,
    ammInstance._program,
    createResult.pool,
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
    owner: payer.publicKey,
    position: createResult.position,
    pool: createResult.pool,
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
  await executeTransaction(context.banksClient, addLiquidityTx, [payer]);

  return {
    pool: createResult.pool,
    position: createResult.position,
    positionNft,
  };
}

describe("getQuote2", () => {
  describe("Concentrated liquidity pool (BothToken)", () => {
    let context: ProgramTestContext;
    let payer: Keypair;
    let ammInstance: CpAmm;
    let pool: PublicKey;
    let poolState: PoolState;

    beforeEach(async () => {
      context = await startTest();
      const prepareContext = await setupTestContext(
        context.banksClient,
        context.payer,
        false,
      );

      payer = prepareContext.payer;
      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);

      const result = await createPoolWithLiquidity(
        context,
        ammInstance,
        payer,
        prepareContext.tokenAMint,
        prepareContext.tokenBMint,
        CollectFeeMode.BothToken,
        0,
      );
      pool = result.pool;

      poolState = await getPool(
        context.banksClient,
        ammInstance._program,
        pool,
      );
    });

    it("ExactIn: returns valid quote with zero compounding fee", async () => {
      const clock = await context.banksClient.getClock();
      const currentPoint = new BN(Number(clock.unixTimestamp));
      const amountIn = new BN(100 * 10 ** DECIMALS);

      const quote = ammInstance.getQuote2({
        inputTokenMint: poolState.tokenAMint,
        slippage: 100,
        currentPoint,
        poolState,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
        swapMode: SwapMode.ExactIn,
        amountIn,
      });

      expect(quote.outputAmount.gt(new BN(0))).toBe(true);
      expect(quote.includedFeeInputAmount.eq(amountIn)).toBe(true);
      expect(quote.minimumAmountOut).toBeDefined();
      expect(quote.minimumAmountOut!.lte(quote.outputAmount)).toBe(true);
      expect(quote.claimingFee.gt(new BN(0))).toBe(true);
      expect(quote.compoundingFee.eq(new BN(0))).toBe(true);
    });

    it("ExactOut: returns valid quote with required input amount", async () => {
      const clock = await context.banksClient.getClock();
      const currentPoint = new BN(Number(clock.unixTimestamp));
      const amountOut = new BN(50 * 10 ** DECIMALS);

      const quote = ammInstance.getQuote2({
        inputTokenMint: poolState.tokenAMint,
        slippage: 100,
        currentPoint,
        poolState,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
        swapMode: SwapMode.ExactOut,
        amountOut,
      });

      expect(quote.outputAmount.eq(amountOut)).toBe(true);
      expect(quote.includedFeeInputAmount.gt(new BN(0))).toBe(true);
      expect(quote.maximumAmountIn).toBeDefined();
      expect(quote.maximumAmountIn!.gte(quote.includedFeeInputAmount)).toBe(
        true,
      );
      expect(quote.compoundingFee.eq(new BN(0))).toBe(true);
    });

    it("PartialFill: returns valid quote allowing partial consumption", async () => {
      const clock = await context.banksClient.getClock();
      const currentPoint = new BN(Number(clock.unixTimestamp));
      const amountIn = new BN(100 * 10 ** DECIMALS);

      const quote = ammInstance.getQuote2({
        inputTokenMint: poolState.tokenAMint,
        slippage: 100,
        currentPoint,
        poolState,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
        swapMode: SwapMode.PartialFill,
        amountIn,
      });

      expect(quote.outputAmount.gt(new BN(0))).toBe(true);
      expect(quote.minimumAmountOut).toBeDefined();
      expect(quote.compoundingFee.eq(new BN(0))).toBe(true);
    });

    it("ExactIn B-to-A: returns valid quote for reverse direction", async () => {
      const clock = await context.banksClient.getClock();
      const currentPoint = new BN(Number(clock.unixTimestamp));
      const amountIn = new BN(100 * 10 ** DECIMALS);

      const quote = ammInstance.getQuote2({
        inputTokenMint: poolState.tokenBMint,
        slippage: 100,
        currentPoint,
        poolState,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
        swapMode: SwapMode.ExactIn,
        amountIn,
      });

      expect(quote.outputAmount.gt(new BN(0))).toBe(true);
      expect(quote.claimingFee.gt(new BN(0))).toBe(true);
      expect(quote.compoundingFee.eq(new BN(0))).toBe(true);
    });
  });

  describe("Compounding liquidity pool", () => {
    let context: ProgramTestContext;
    let payer: Keypair;
    let ammInstance: CpAmm;
    let pool: PublicKey;
    let poolState: PoolState;

    beforeEach(async () => {
      context = await startTest();
      const prepareContext = await setupTestContext(
        context.banksClient,
        context.payer,
        false,
      );

      payer = prepareContext.payer;
      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);

      const result = await createPoolWithLiquidity(
        context,
        ammInstance,
        payer,
        prepareContext.tokenAMint,
        prepareContext.tokenBMint,
        CollectFeeMode.Compounding,
        5000,
      );
      pool = result.pool;

      poolState = await getPool(
        context.banksClient,
        ammInstance._program,
        pool,
      );
    });

    it("ExactIn A-to-B: returns valid quote with compounding fee split", async () => {
      const clock = await context.banksClient.getClock();
      const currentPoint = new BN(Number(clock.unixTimestamp));
      const amountIn = new BN(100 * 10 ** DECIMALS);

      const quote = ammInstance.getQuote2({
        inputTokenMint: poolState.tokenAMint,
        slippage: 100,
        currentPoint,
        poolState,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
        swapMode: SwapMode.ExactIn,
        amountIn,
      });

      expect(quote.outputAmount.gt(new BN(0))).toBe(true);
      expect(quote.includedFeeInputAmount.eq(amountIn)).toBe(true);
      expect(quote.minimumAmountOut).toBeDefined();
      expect(quote.minimumAmountOut!.lte(quote.outputAmount)).toBe(true);

      const totalFee = quote.claimingFee
        .add(quote.compoundingFee)
        .add(quote.protocolFee)
        .add(quote.referralFee);
      expect(totalFee.gt(new BN(0))).toBe(true);
    });

    it("ExactIn B-to-A: returns valid quote with fees on input", async () => {
      const clock = await context.banksClient.getClock();
      const currentPoint = new BN(Number(clock.unixTimestamp));
      const amountIn = new BN(100 * 10 ** DECIMALS);

      const quote = ammInstance.getQuote2({
        inputTokenMint: poolState.tokenBMint,
        slippage: 100,
        currentPoint,
        poolState,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
        swapMode: SwapMode.ExactIn,
        amountIn,
      });

      expect(quote.outputAmount.gt(new BN(0))).toBe(true);
      expect(quote.excludedFeeInputAmount.lt(amountIn)).toBe(true);

      const totalFee = quote.claimingFee
        .add(quote.compoundingFee)
        .add(quote.protocolFee)
        .add(quote.referralFee);
      expect(totalFee.gt(new BN(0))).toBe(true);
    });

    it("ExactOut: returns valid quote for compounding pool", async () => {
      const clock = await context.banksClient.getClock();
      const currentPoint = new BN(Number(clock.unixTimestamp));
      const amountOut = new BN(50 * 10 ** DECIMALS);

      const quote = ammInstance.getQuote2({
        inputTokenMint: poolState.tokenAMint,
        slippage: 100,
        currentPoint,
        poolState,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
        swapMode: SwapMode.ExactOut,
        amountOut,
      });

      expect(quote.outputAmount.eq(amountOut)).toBe(true);
      expect(quote.includedFeeInputAmount.gt(new BN(0))).toBe(true);
      expect(quote.maximumAmountIn).toBeDefined();
      expect(quote.maximumAmountIn!.gte(quote.includedFeeInputAmount)).toBe(
        true,
      );
    });

    it("PartialFill: returns valid quote for compounding pool", async () => {
      const clock = await context.banksClient.getClock();
      const currentPoint = new BN(Number(clock.unixTimestamp));
      const amountIn = new BN(100 * 10 ** DECIMALS);

      const quote = ammInstance.getQuote2({
        inputTokenMint: poolState.tokenAMint,
        slippage: 100,
        currentPoint,
        poolState,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
        swapMode: SwapMode.PartialFill,
        amountIn,
      });

      expect(quote.outputAmount.gt(new BN(0))).toBe(true);
      expect(quote.minimumAmountOut).toBeDefined();
    });

    it("ExactIn with referral: splits referral fee correctly", async () => {
      const clock = await context.banksClient.getClock();
      const currentPoint = new BN(Number(clock.unixTimestamp));
      const amountIn = new BN(100 * 10 ** DECIMALS);

      const quoteNoReferral = ammInstance.getQuote2({
        inputTokenMint: poolState.tokenAMint,
        slippage: 100,
        currentPoint,
        poolState,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
        swapMode: SwapMode.ExactIn,
        amountIn,
      });

      const quoteWithReferral = ammInstance.getQuote2({
        inputTokenMint: poolState.tokenAMint,
        slippage: 100,
        currentPoint,
        poolState,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: true,
        swapMode: SwapMode.ExactIn,
        amountIn,
      });

      expect(quoteNoReferral.referralFee.eq(new BN(0))).toBe(true);
      expect(quoteWithReferral.referralFee.gte(new BN(0))).toBe(true);

      const totalFeeNoRef = quoteNoReferral.claimingFee
        .add(quoteNoReferral.compoundingFee)
        .add(quoteNoReferral.protocolFee);
      const totalFeeWithRef = quoteWithReferral.claimingFee
        .add(quoteWithReferral.compoundingFee)
        .add(quoteWithReferral.protocolFee)
        .add(quoteWithReferral.referralFee);

      expect(totalFeeNoRef.eq(totalFeeWithRef)).toBe(true);
    });
  });
});
