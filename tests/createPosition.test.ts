import { ProgramTestContext } from "solana-bankrun";
import {
  executeTransaction,
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
import { DECIMALS } from "./bankrun-utils";
import {
  ActivationType,
  BaseFeeMode,
  CpAmm,
  CreatePositionParams,
  getBaseFeeParams,
  InitializeCustomizeablePoolParams,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
} from "../src";

describe("Create position", () => {
  describe("SPL token", () => {
    let context: ProgramTestContext;
    let user: Keypair;
    let payer: Keypair;
    let creator: Keypair;
    let tokenX: PublicKey;
    let tokenY: PublicKey;
    let ammInstance: CpAmm;
    let params: InitializeCustomizeablePoolParams;

    beforeEach(async () => {
      context = await startTest();

      const prepareContext = await setupTestContext(
        context.banksClient,
        context.payer,
        false
      );
      payer = prepareContext.payer;
      creator = prepareContext.poolCreator;
      user = prepareContext.user;
      tokenX = prepareContext.tokenAMint;
      tokenY = prepareContext.tokenBMint;
      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);

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

      const tokenAAmount = new BN(1000 * 10 ** DECIMALS);
      const tokenBAmount = new BN(1000 * 10 ** DECIMALS);
      const { liquidityDelta: initPoolLiquidityDelta, initSqrtPrice } =
        ammInstance.preparePoolCreationParams({
          tokenAAmount,
          tokenBAmount,
          minSqrtPrice: MIN_SQRT_PRICE,
          maxSqrtPrice: MAX_SQRT_PRICE,
        });
      const positionNft = Keypair.generate();
      params = {
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
    });

    it("User create a position", async () => {
      const positionNft = Keypair.generate();
      params.positionNft = positionNft.publicKey;
      const { tx: transaction, pool } = await ammInstance.createCustomPool(
        params
      );

      await executeTransaction(context.banksClient, transaction, [
        payer,
        positionNft,
      ]);

      // create position
      const userPositionNft = Keypair.generate();

      const createPositionParams: CreatePositionParams = {
        owner: user.publicKey,
        payer: user.publicKey,
        pool,
        positionNft: userPositionNft.publicKey,
      };
      const createPositionTx = await ammInstance.createPosition(
        createPositionParams
      );
      await executeTransaction(context.banksClient, createPositionTx, [
        user,
        userPositionNft,
      ]);
    });
  });

  describe("Token 2022", () => {
    let context: ProgramTestContext;
    let payer: Keypair;
    let user: Keypair;
    let creator: Keypair;
    let tokenX: PublicKey;
    let tokenY: PublicKey;
    let ammInstance: CpAmm;
    let params: InitializeCustomizeablePoolParams;

    beforeEach(async () => {
      context = await startTest();
      const extensions = [ExtensionType.TransferFeeConfig];
      const prepareContext = await setupTestContext(
        context.banksClient,
        context.payer,
        true,
        extensions
      );
      user = prepareContext.user;
      payer = prepareContext.payer;
      creator = prepareContext.poolCreator;
      tokenX = prepareContext.tokenAMint;
      tokenY = prepareContext.tokenBMint;

      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);

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
      const tokenAAmount = new BN(1000 * 10 ** DECIMALS);
      const tokenBAmount = new BN(1000 * 10 ** DECIMALS);
      const { liquidityDelta: initPoolLiquidityDelta, initSqrtPrice } =
        ammInstance.preparePoolCreationParams({
          tokenAAmount,
          tokenBAmount,
          minSqrtPrice: MIN_SQRT_PRICE,
          maxSqrtPrice: MAX_SQRT_PRICE,
        });
      const positionNft = Keypair.generate();
      params = {
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
    });

    it("User create a position", async () => {
      const positionNft = Keypair.generate();
      params.positionNft = positionNft.publicKey;
      const { tx: transaction, pool } = await ammInstance.createCustomPool(
        params
      );
      await executeTransaction(context.banksClient, transaction, [
        payer,
        positionNft,
      ]);

      // create position
      const userPositionNft = Keypair.generate();

      const createPositionParams: CreatePositionParams = {
        owner: user.publicKey,
        payer: user.publicKey,
        pool,
        positionNft: userPositionNft.publicKey,
      };
      const createPositionTx = await ammInstance.createPosition(
        createPositionParams
      );
      await executeTransaction(context.banksClient, createPositionTx, [
        user,
        userPositionNft,
      ]);
    });
  });
});
