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
  AddLiquidityParams,
  BaseFee,
  CpAmm,
  derivePositionNftAccount,
  getTokenProgram,
  InitializeCustomizeablePoolParams,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
  SwapParams,
} from "../src";
import { DECIMALS, U64_MAX } from "./bankrun-utils";

describe("Swap", () => {
  describe("Swap with SPL-Token", () => {
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
        false
      );

      creator = prepareContext.poolCreator.publicKey;
      payer = prepareContext.payer;
      tokenX = prepareContext.tokenAMint;
      tokenY = prepareContext.tokenBMint;
      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);
    });

    it("Swap", async () => {
      const baseFee: BaseFee = {
        cliffFeeNumerator: new BN(1_000_000), // 1%
        numberOfPeriod: 10,
        periodFrequency: new BN(10),
        reductionFactor: new BN(2),
        feeSchedulerMode: 0, // Linear
      };
      const poolFees: PoolFeesParams = {
        baseFee,
        protocolFeePercent: 20,
        partnerFeePercent: 0,
        referralFeePercent: 20,
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
          tokenADecimal: DECIMALS,
          tokenBDecimal: DECIMALS,
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
        activationType: 1, // 0 slot, 1 timestamp
        collectFeeMode: 0,
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
        ammInstance.getProgram(),
        pool
      );
      const positionState = await getPosition(
        context.banksClient,
        ammInstance.getProgram(),
        position
      );
      const { liquidityDelta } = await ammInstance.getDepositQuote({
        inAmount: new BN(1000 * 10 ** DECIMALS),
        isTokenA: true,
        sqrtPrice: poolState.sqrtPrice,
        minSqrtPrice: poolState.sqrtMinPrice,
        maxSqrtPrice: poolState.sqrtMaxPrice,
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
      executeTransaction(context.banksClient, addLiquidityTx, [payer]);

      // swap
      const swapParams: SwapParams = {
        payer: payer.publicKey,
        pool: pool,
        inputTokenMint: poolState.tokenAMint,
        outputTokenMint: poolState.tokenBMint,
        amountIn: new BN(100 * 10 ** DECIMALS),
        minimumAmountOut: new BN(0),
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAProgram: getTokenProgram(poolState.tokenAFlag),
        tokenBProgram: getTokenProgram(poolState.tokenBFlag),
        referralTokenAccount: null,
      };
      const swapTx = await ammInstance.swap(swapParams);
      executeTransaction(context.banksClient, swapTx, [payer]);
    });
  });

  describe("Swap with Token 2022", () => {
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
        extensions
      );

      creator = prepareContext.poolCreator.publicKey;
      payer = prepareContext.payer;
      tokenX = prepareContext.tokenAMint;
      tokenY = prepareContext.tokenBMint;

      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);
    });

    it("Swap", async () => {
      const baseFee: BaseFee = {
        cliffFeeNumerator: new BN(1_000_000), // 1%
        numberOfPeriod: 10,
        periodFrequency: new BN(10),
        reductionFactor: new BN(2),
        feeSchedulerMode: 0, // Linear
      };
      const poolFees: PoolFeesParams = {
        baseFee,
        protocolFeePercent: 20,
        partnerFeePercent: 0,
        referralFeePercent: 20,
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
          tokenADecimal: DECIMALS,
          tokenBDecimal: DECIMALS,
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
        activationType: 1, // 0 slot, 1 timestamp
        collectFeeMode: 0,
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

      // add liquidity
      const poolState = await getPool(
        context.banksClient,
        ammInstance.getProgram(),
        pool
      );
      const positionState = await getPosition(
        context.banksClient,
        ammInstance.getProgram(),
        position
      );
      const { liquidityDelta } = await ammInstance.getDepositQuote({
        inAmount: new BN(1000 * 10 ** DECIMALS),
        isTokenA: true,
        sqrtPrice: poolState.sqrtPrice,
        minSqrtPrice: poolState.sqrtMinPrice,
        maxSqrtPrice: poolState.sqrtMaxPrice,
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
      executeTransaction(context.banksClient, addLiquidityTx, [payer]);

      // swap
      const swapParams: SwapParams = {
        payer: payer.publicKey,
        pool: pool,
        inputTokenMint: poolState.tokenAMint,
        outputTokenMint: poolState.tokenBMint,
        amountIn: new BN(100 * 10 ** DECIMALS),
        minimumAmountOut: new BN(0),
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAProgram: getTokenProgram(poolState.tokenAFlag),
        tokenBProgram: getTokenProgram(poolState.tokenBFlag),
        referralTokenAccount: null,
      };
      const swapTx = await ammInstance.swap(swapParams);
      executeTransaction(context.banksClient, swapTx, [payer]);
    });
  });
});
