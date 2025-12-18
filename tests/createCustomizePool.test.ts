import { ProgramTestContext } from "solana-bankrun";
import {
  processTransactionMaybeThrow,
  setupTestContext,
  startTest,
} from "./bankrun-utils/common";
import {
  clusterApiUrl,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import BN from "bn.js";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import {
  ActivationType,
  BaseFeeMode,
  CpAmm,
  getBaseFeeParams,
  InitializeCustomizeablePoolParams,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
} from "../src";
import { DECIMALS } from "./bankrun-utils";

describe("Initialize customizable pool", () => {
  describe("SPL-Token", () => {
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
        false
      );

      creator = prepareContext.poolCreator;
      payer = prepareContext.payer;
      tokenX = prepareContext.tokenAMint;
      tokenY = prepareContext.tokenBMint;
      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);
    });

    it("Initialize customizeable pool with spl token", async () => {
      const baseFee = getBaseFeeParams(
        new Connection(clusterApiUrl("devnet")),
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
        ActivationType.Timestamp
      );

      const poolFees: PoolFeesParams = {
        baseFee,
        padding: [],
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
        activationType: 1, // 0 slot, 1 timestamp
        collectFeeMode: 0,
        activationPoint: null,
        tokenAProgram: TOKEN_PROGRAM_ID,
        tokenBProgram: TOKEN_PROGRAM_ID,
      };

      const { tx: transaction } = await ammInstance.createCustomPool(params);
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 400_000,
        })
      );
      transaction.recentBlockhash = (
        await context.banksClient.getLatestBlockhash()
      )[0];
      transaction.sign(payer, positionNft);

      await processTransactionMaybeThrow(context.banksClient, transaction);
    });
  });

  describe("Token 2022", () => {
    let context: ProgramTestContext;
    let payer: Keypair;
    let creator: Keypair;
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

      creator = prepareContext.poolCreator;
      payer = prepareContext.payer;
      tokenX = prepareContext.tokenAMint;
      tokenY = prepareContext.tokenBMint;

      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);
    });

    it("Initialize customizeable pool with spl token", async () => {
      const baseFee = getBaseFeeParams(
        new Connection(clusterApiUrl("devnet")),
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
        ActivationType.Timestamp
      );

      const poolFees: PoolFeesParams = {
        baseFee,
        padding: [],
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
        activationType: 1, // 0 slot, 1 timestamp
        collectFeeMode: 0,
        activationPoint: null,
        tokenAProgram: TOKEN_2022_PROGRAM_ID,
        tokenBProgram: TOKEN_2022_PROGRAM_ID,
      };

      const { tx: transaction } = await ammInstance.createCustomPool(params);
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 400_000,
        })
      );
      transaction.recentBlockhash = (
        await context.banksClient.getLatestBlockhash()
      )[0];
      transaction.sign(payer, positionNft);

      await processTransactionMaybeThrow(context.banksClient, transaction);
    });
  });
});
