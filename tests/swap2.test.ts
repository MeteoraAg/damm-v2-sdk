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
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

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
  Swap2Params,
  SwapMode,
} from "../src";
import { DECIMALS, U64_MAX } from "./bankrun-utils";
import { beforeEach, describe, it } from "vitest";

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

describe("Swap2", () => {
  describe.each(poolModes)(
    "Swap2 with SPL-Token ($label)",
    ({ collectFeeMode, compoundingFeeBps }) => {
      let context: ProgramTestContext;
      let payer: Keypair;
      let creator: PublicKey;
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

        creator = prepareContext.poolCreator.publicKey;
        payer = prepareContext.payer;
        tokenX = prepareContext.tokenAMint;
        tokenY = prepareContext.tokenBMint;
        const connection = new Connection(clusterApiUrl("devnet"));
        ammInstance = new CpAmm(connection);
      });

      it("Swap2 ExactIn", async () => {
        const baseFee = getBaseFeeParams(
          {
            baseFeeMode: BaseFeeMode.FeeTimeSchedulerExponential,
            feeTimeSchedulerParam: {
              startingFeeBps: 5000,
              endingFeeBps: 100,
              numberOfPeriod: 180,
              totalDuration: 180,
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
          tokenAAmount: new BN(1000 * 10 ** DECIMALS),
          tokenBAmount: new BN(1000 * 10 ** DECIMALS),
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

        const {
          tx: transaction,
          pool,
          position,
        } = await ammInstance.createCustomPool(params);

        await executeTransaction(context.banksClient, transaction, [
          payer,
          positionNft,
        ]);

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

        const swap2Params: Swap2Params = {
          payer: payer.publicKey,
          pool,
          inputTokenMint: poolState.tokenAMint,
          outputTokenMint: poolState.tokenBMint,
          tokenAMint: poolState.tokenAMint,
          tokenBMint: poolState.tokenBMint,
          tokenAVault: poolState.tokenAVault,
          tokenBVault: poolState.tokenBVault,
          tokenAProgram: getTokenProgram(poolState.tokenAFlag),
          tokenBProgram: getTokenProgram(poolState.tokenBFlag),
          referralTokenAccount: null,
          poolState,
          swapMode: SwapMode.ExactIn,
          amountIn: new BN(100 * 10 ** DECIMALS),
          minimumAmountOut: new BN(0),
        };
        const swap2Tx = await ammInstance.swap2(swap2Params);
        await executeTransaction(context.banksClient, swap2Tx, [payer]);
      });

      it("Swap2 ExactOut", async () => {
        const baseFee = getBaseFeeParams(
          {
            baseFeeMode: BaseFeeMode.FeeTimeSchedulerExponential,
            feeTimeSchedulerParam: {
              startingFeeBps: 5000,
              endingFeeBps: 100,
              numberOfPeriod: 180,
              totalDuration: 180,
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
          tokenAAmount: new BN(1000 * 10 ** DECIMALS),
          tokenBAmount: new BN(1000 * 10 ** DECIMALS),
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

        const {
          tx: transaction,
          pool,
          position,
        } = await ammInstance.createCustomPool(params);

        await executeTransaction(context.banksClient, transaction, [
          payer,
          positionNft,
        ]);

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

        const swap2Params: Swap2Params = {
          payer: payer.publicKey,
          pool,
          inputTokenMint: poolState.tokenAMint,
          outputTokenMint: poolState.tokenBMint,
          tokenAMint: poolState.tokenAMint,
          tokenBMint: poolState.tokenBMint,
          tokenAVault: poolState.tokenAVault,
          tokenBVault: poolState.tokenBVault,
          tokenAProgram: getTokenProgram(poolState.tokenAFlag),
          tokenBProgram: getTokenProgram(poolState.tokenBFlag),
          referralTokenAccount: null,
          poolState,
          swapMode: SwapMode.ExactOut,
          amountOut: new BN(50 * 10 ** DECIMALS),
          maximumAmountIn: new BN(500 * 10 ** DECIMALS),
        };
        const swap2Tx = await ammInstance.swap2(swap2Params);
        await executeTransaction(context.banksClient, swap2Tx, [payer]);
      });

      it("Swap2 PartialFill", async () => {
        const baseFee = getBaseFeeParams(
          {
            baseFeeMode: BaseFeeMode.FeeTimeSchedulerExponential,
            feeTimeSchedulerParam: {
              startingFeeBps: 5000,
              endingFeeBps: 100,
              numberOfPeriod: 180,
              totalDuration: 180,
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
          tokenAAmount: new BN(1000 * 10 ** DECIMALS),
          tokenBAmount: new BN(1000 * 10 ** DECIMALS),
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

        const {
          tx: transaction,
          pool,
          position,
        } = await ammInstance.createCustomPool(params);

        await executeTransaction(context.banksClient, transaction, [
          payer,
          positionNft,
        ]);

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

        const swap2Params: Swap2Params = {
          payer: payer.publicKey,
          pool,
          inputTokenMint: poolState.tokenAMint,
          outputTokenMint: poolState.tokenBMint,
          tokenAMint: poolState.tokenAMint,
          tokenBMint: poolState.tokenBMint,
          tokenAVault: poolState.tokenAVault,
          tokenBVault: poolState.tokenBVault,
          tokenAProgram: getTokenProgram(poolState.tokenAFlag),
          tokenBProgram: getTokenProgram(poolState.tokenBFlag),
          referralTokenAccount: null,
          poolState,
          swapMode: SwapMode.PartialFill,
          amountIn: new BN(100 * 10 ** DECIMALS),
          minimumAmountOut: new BN(0),
        };
        const swap2Tx = await ammInstance.swap2(swap2Params);
        await executeTransaction(context.banksClient, swap2Tx, [payer]);
      });
    },
  );

  describe.each(poolModes)(
    "Swap2 with Token 2022 ($label)",
    ({ collectFeeMode, compoundingFeeBps }) => {
      let context: ProgramTestContext;
      let payer: Keypair;
      let creator: PublicKey;
      let tokenX: PublicKey;
      let tokenY: PublicKey;
      let ammInstance: CpAmm;

      beforeEach(async () => {
        context = await startTest();
        const extensions = [ExtensionType.TransferFeeConfig];
        const prepareContext = await setupTestContext(
          context.banksClient,
          context.payer,
          true,
          extensions,
        );

        creator = prepareContext.poolCreator.publicKey;
        payer = prepareContext.payer;
        tokenX = prepareContext.tokenAMint;
        tokenY = prepareContext.tokenBMint;

        const connection = new Connection(clusterApiUrl("devnet"));
        ammInstance = new CpAmm(connection);
      });

      it("Swap2 ExactIn", async () => {
        const baseFee = getBaseFeeParams(
          {
            baseFeeMode: BaseFeeMode.FeeTimeSchedulerExponential,
            feeTimeSchedulerParam: {
              startingFeeBps: 5000,
              endingFeeBps: 100,
              numberOfPeriod: 180,
              totalDuration: 180,
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
          tokenAAmount: new BN(1000 * 10 ** DECIMALS),
          tokenBAmount: new BN(1000 * 10 ** DECIMALS),
          sqrtMinPrice: MIN_SQRT_PRICE,
          sqrtMaxPrice: MAX_SQRT_PRICE,
          liquidityDelta: initPoolLiquidityDelta,
          initSqrtPrice,
          poolFees,
          hasAlphaVault: false,
          activationType: 1,
          collectFeeMode,
          activationPoint: null,
          tokenAProgram: TOKEN_2022_PROGRAM_ID,
          tokenBProgram: TOKEN_2022_PROGRAM_ID,
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

        const swap2Params: Swap2Params = {
          payer: payer.publicKey,
          pool,
          inputTokenMint: poolState.tokenAMint,
          outputTokenMint: poolState.tokenBMint,
          tokenAMint: poolState.tokenAMint,
          tokenBMint: poolState.tokenBMint,
          tokenAVault: poolState.tokenAVault,
          tokenBVault: poolState.tokenBVault,
          tokenAProgram: getTokenProgram(poolState.tokenAFlag),
          tokenBProgram: getTokenProgram(poolState.tokenBFlag),
          referralTokenAccount: null,
          poolState,
          swapMode: SwapMode.ExactIn,
          amountIn: new BN(100 * 10 ** DECIMALS),
          minimumAmountOut: new BN(0),
        };
        const swap2Tx = await ammInstance.swap2(swap2Params);
        await executeTransaction(context.banksClient, swap2Tx, [payer]);
      });

      it("Swap2 ExactOut", async () => {
        const baseFee = getBaseFeeParams(
          {
            baseFeeMode: BaseFeeMode.FeeTimeSchedulerExponential,
            feeTimeSchedulerParam: {
              startingFeeBps: 5000,
              endingFeeBps: 100,
              numberOfPeriod: 180,
              totalDuration: 180,
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
          tokenAAmount: new BN(1000 * 10 ** DECIMALS),
          tokenBAmount: new BN(1000 * 10 ** DECIMALS),
          sqrtMinPrice: MIN_SQRT_PRICE,
          sqrtMaxPrice: MAX_SQRT_PRICE,
          liquidityDelta: initPoolLiquidityDelta,
          initSqrtPrice,
          poolFees,
          hasAlphaVault: false,
          activationType: 1,
          collectFeeMode,
          activationPoint: null,
          tokenAProgram: TOKEN_2022_PROGRAM_ID,
          tokenBProgram: TOKEN_2022_PROGRAM_ID,
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

        const swap2Params: Swap2Params = {
          payer: payer.publicKey,
          pool,
          inputTokenMint: poolState.tokenAMint,
          outputTokenMint: poolState.tokenBMint,
          tokenAMint: poolState.tokenAMint,
          tokenBMint: poolState.tokenBMint,
          tokenAVault: poolState.tokenAVault,
          tokenBVault: poolState.tokenBVault,
          tokenAProgram: getTokenProgram(poolState.tokenAFlag),
          tokenBProgram: getTokenProgram(poolState.tokenBFlag),
          referralTokenAccount: null,
          poolState,
          swapMode: SwapMode.ExactOut,
          amountOut: new BN(50 * 10 ** DECIMALS),
          maximumAmountIn: new BN(500 * 10 ** DECIMALS),
        };
        const swap2Tx = await ammInstance.swap2(swap2Params);
        await executeTransaction(context.banksClient, swap2Tx, [payer]);
      });

      it("Swap2 PartialFill", async () => {
        const baseFee = getBaseFeeParams(
          {
            baseFeeMode: BaseFeeMode.FeeTimeSchedulerExponential,
            feeTimeSchedulerParam: {
              startingFeeBps: 5000,
              endingFeeBps: 100,
              numberOfPeriod: 180,
              totalDuration: 180,
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
          tokenAAmount: new BN(1000 * 10 ** DECIMALS),
          tokenBAmount: new BN(1000 * 10 ** DECIMALS),
          sqrtMinPrice: MIN_SQRT_PRICE,
          sqrtMaxPrice: MAX_SQRT_PRICE,
          liquidityDelta: initPoolLiquidityDelta,
          initSqrtPrice,
          poolFees,
          hasAlphaVault: false,
          activationType: 1,
          collectFeeMode,
          activationPoint: null,
          tokenAProgram: TOKEN_2022_PROGRAM_ID,
          tokenBProgram: TOKEN_2022_PROGRAM_ID,
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

        const swap2Params: Swap2Params = {
          payer: payer.publicKey,
          pool,
          inputTokenMint: poolState.tokenAMint,
          outputTokenMint: poolState.tokenBMint,
          tokenAMint: poolState.tokenAMint,
          tokenBMint: poolState.tokenBMint,
          tokenAVault: poolState.tokenAVault,
          tokenBVault: poolState.tokenBVault,
          tokenAProgram: getTokenProgram(poolState.tokenAFlag),
          tokenBProgram: getTokenProgram(poolState.tokenBFlag),
          referralTokenAccount: null,
          poolState,
          swapMode: SwapMode.PartialFill,
          amountIn: new BN(100 * 10 ** DECIMALS),
          minimumAmountOut: new BN(0),
        };
        const swap2Tx = await ammInstance.swap2(swap2Params);
        await executeTransaction(context.banksClient, swap2Tx, [payer]);
      });
    },
  );
});
