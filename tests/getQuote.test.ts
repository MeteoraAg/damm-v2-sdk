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
  SwapParams,
} from "../src";
import { DECIMALS, U64_MAX } from "./bankrun-utils";
import { beforeEach, describe, it, expect } from "vitest";

const poolModes = [
  {
    label: "BothToken",
    collectFeeMode: CollectFeeMode.BothToken,
    compoundingFeeBps: 0,
  },
  {
    label: "Compounding",
    collectFeeMode: CollectFeeMode.Compounding,
    compoundingFeeBps: 5000,
  },
] as const;

describe("getQuote", () => {
  describe.each(poolModes)(
    "Concentrated liquidity pool (BothToken) ($label)",
    ({ collectFeeMode, compoundingFeeBps }) => {
      let context: ProgramTestContext;
      let payer: Keypair;
      let ammInstance: CpAmm;
      let pool: PublicKey;
      let position: PublicKey;
      let positionNft: Keypair;

      beforeEach(async () => {
        context = await startTest();
        const prepareContext = await setupTestContext(
          context.banksClient,
          context.payer,
          false,
        );

        payer = prepareContext.payer;
        const creator = prepareContext.poolCreator;
        const tokenX = prepareContext.tokenAMint;
        const tokenY = prepareContext.tokenBMint;
        const connection = new Connection(clusterApiUrl("devnet"));
        ammInstance = new CpAmm(connection);

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

        positionNft = Keypair.generate();

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
        pool = createResult.pool;
        position = createResult.position;

        await executeTransaction(context.banksClient, createResult.tx, [
          payer,
          positionNft,
        ]);

        const poolState = await getPool(
          context.banksClient,
          ammInstance._program,
          pool,
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
        const addLiquidityTx =
          await ammInstance.addLiquidity(addLiquidityParams);
        await executeTransaction(context.banksClient, addLiquidityTx, [payer]);
      });

      it("quotes A-to-B swap with valid output and fees", async () => {
        const poolState = await getPool(
          context.banksClient,
          ammInstance._program,
          pool,
        );
        const clock = await context.banksClient.getClock();
        const currentTime = Number(clock.unixTimestamp);
        const currentSlot = Number(clock.slot);

        const inAmount = new BN(100 * 10 ** DECIMALS);
        const quote = ammInstance.getQuote({
          inAmount,
          inputTokenMint: poolState.tokenAMint,
          slippage: 100,
          poolState,
          currentTime,
          currentSlot,
          tokenADecimal: DECIMALS,
          tokenBDecimal: DECIMALS,
          hasReferral: false,
        });

        expect(quote.swapInAmount.eq(inAmount)).toBe(true);
        expect(quote.swapOutAmount.gt(new BN(0))).toBe(true);
        expect(quote.consumedInAmount.gt(new BN(0))).toBe(true);
        expect(quote.totalFee.gt(new BN(0))).toBe(true);
        expect(quote.minSwapOutAmount.lte(quote.swapOutAmount)).toBe(true);

        // execute swap using the quoted minSwapOutAmount
        const swapParams: SwapParams = {
          payer: payer.publicKey,
          pool,
          inputTokenMint: poolState.tokenAMint,
          outputTokenMint: poolState.tokenBMint,
          amountIn: inAmount,
          minimumAmountOut: quote.minSwapOutAmount,
          tokenAMint: poolState.tokenAMint,
          tokenBMint: poolState.tokenBMint,
          tokenAVault: poolState.tokenAVault,
          tokenBVault: poolState.tokenBVault,
          tokenAProgram: getTokenProgram(poolState.tokenAFlag),
          tokenBProgram: getTokenProgram(poolState.tokenBFlag),
          referralTokenAccount: null,
          poolState,
        };
        const swapTx = await ammInstance.swap(swapParams);
        await executeTransaction(context.banksClient, swapTx, [payer]);
      });

      it("quotes B-to-A swap with valid output and fees", async () => {
        const poolState = await getPool(
          context.banksClient,
          ammInstance._program,
          pool,
        );
        const clock = await context.banksClient.getClock();
        const currentTime = Number(clock.unixTimestamp);
        const currentSlot = Number(clock.slot);

        const inAmount = new BN(50 * 10 ** DECIMALS);
        const quote = ammInstance.getQuote({
          inAmount,
          inputTokenMint: poolState.tokenBMint,
          slippage: 100,
          poolState,
          currentTime,
          currentSlot,
          tokenADecimal: DECIMALS,
          tokenBDecimal: DECIMALS,
          hasReferral: false,
        });

        expect(quote.swapOutAmount.gt(new BN(0))).toBe(true);
        expect(quote.totalFee.gt(new BN(0))).toBe(true);

        const swapParams: SwapParams = {
          payer: payer.publicKey,
          pool,
          inputTokenMint: poolState.tokenBMint,
          outputTokenMint: poolState.tokenAMint,
          amountIn: inAmount,
          minimumAmountOut: quote.minSwapOutAmount,
          tokenAMint: poolState.tokenAMint,
          tokenBMint: poolState.tokenBMint,
          tokenAVault: poolState.tokenAVault,
          tokenBVault: poolState.tokenBVault,
          tokenAProgram: getTokenProgram(poolState.tokenAFlag),
          tokenBProgram: getTokenProgram(poolState.tokenBFlag),
          referralTokenAccount: null,
          poolState,
        };
        const swapTx = await ammInstance.swap(swapParams);
        await executeTransaction(context.banksClient, swapTx, [payer]);
      });
    },
  );

  describe("Compounding liquidity pool", () => {
    let context: ProgramTestContext;
    let payer: Keypair;
    let ammInstance: CpAmm;
    let pool: PublicKey;
    let position: PublicKey;
    let positionNft: Keypair;

    beforeEach(async () => {
      context = await startTest();
      const prepareContext = await setupTestContext(
        context.banksClient,
        context.payer,
        false,
      );

      payer = prepareContext.payer;
      const tokenX = prepareContext.tokenAMint;
      const tokenY = prepareContext.tokenBMint;
      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);

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

      positionNft = Keypair.generate();

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
        collectFeeMode: CollectFeeMode.Compounding,
        activationPoint: null,
        tokenAProgram: TOKEN_PROGRAM_ID,
        tokenBProgram: TOKEN_PROGRAM_ID,
      };

      const createResult = await ammInstance.createCustomPool(params);
      pool = createResult.pool;
      position = createResult.position;

      await executeTransaction(context.banksClient, createResult.tx, [
        payer,
        positionNft,
      ]);

      const poolState = await getPool(
        context.banksClient,
        ammInstance._program,
        pool,
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
      await executeTransaction(context.banksClient, addLiquidityTx, [payer]);
    });

    it("quotes A-to-B swap with compounding fees", async () => {
      const poolState = await getPool(
        context.banksClient,
        ammInstance._program,
        pool,
      );
      const clock = await context.banksClient.getClock();
      const currentTime = Number(clock.unixTimestamp);
      const currentSlot = Number(clock.slot);

      const inAmount = new BN(100 * 10 ** DECIMALS);
      const quote = ammInstance.getQuote({
        inAmount,
        inputTokenMint: poolState.tokenAMint,
        slippage: 100,
        poolState,
        currentTime,
        currentSlot,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
      });

      expect(quote.swapOutAmount.gt(new BN(0))).toBe(true);
      expect(quote.totalFee.gt(new BN(0))).toBe(true);
      expect(quote.minSwapOutAmount.lte(quote.swapOutAmount)).toBe(true);

      const swapParams: SwapParams = {
        payer: payer.publicKey,
        pool,
        inputTokenMint: poolState.tokenAMint,
        outputTokenMint: poolState.tokenBMint,
        amountIn: inAmount,
        minimumAmountOut: quote.minSwapOutAmount,
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAProgram: getTokenProgram(poolState.tokenAFlag),
        tokenBProgram: getTokenProgram(poolState.tokenBFlag),
        referralTokenAccount: null,
        poolState,
      };
      const swapTx = await ammInstance.swap(swapParams);
      await executeTransaction(context.banksClient, swapTx, [payer]);
    });

    it("quotes B-to-A swap with compounding fees", async () => {
      const poolState = await getPool(
        context.banksClient,
        ammInstance._program,
        pool,
      );
      const clock = await context.banksClient.getClock();
      const currentTime = Number(clock.unixTimestamp);
      const currentSlot = Number(clock.slot);

      const inAmount = new BN(50 * 10 ** DECIMALS);
      const quote = ammInstance.getQuote({
        inAmount,
        inputTokenMint: poolState.tokenBMint,
        slippage: 100,
        poolState,
        currentTime,
        currentSlot,
        tokenADecimal: DECIMALS,
        tokenBDecimal: DECIMALS,
        hasReferral: false,
      });

      expect(quote.swapOutAmount.gt(new BN(0))).toBe(true);
      expect(quote.totalFee.gt(new BN(0))).toBe(true);

      const swapParams: SwapParams = {
        payer: payer.publicKey,
        pool,
        inputTokenMint: poolState.tokenBMint,
        outputTokenMint: poolState.tokenAMint,
        amountIn: inAmount,
        minimumAmountOut: quote.minSwapOutAmount,
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAProgram: getTokenProgram(poolState.tokenAFlag),
        tokenBProgram: getTokenProgram(poolState.tokenBFlag),
        referralTokenAccount: null,
        poolState,
      };
      const swapTx = await ammInstance.swap(swapParams);
      await executeTransaction(context.banksClient, swapTx, [payer]);
    });
  });
});
