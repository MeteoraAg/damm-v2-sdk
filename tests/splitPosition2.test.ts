import { ProgramTestContext } from "solana-bankrun";
import {
  executeTransaction,
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
import { expect } from "chai";

import {
  ActivationType,
  BaseFeeMode,
  CpAmm,
  CreatePositionParams,
  derivePositionAddress,
  derivePositionNftAccount,
  getBaseFeeParams,
  InitializeCustomizeablePoolParams,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
  PoolVersion,
  SPLIT_POSITION_DENOMINATOR,
  SplitPosition2Params,
} from "../src";
import { DECIMALS } from "./bankrun-utils";

describe("Split Position 2", () => {
  describe("Split position 2 with SPL-Token", () => {
    let context: ProgramTestContext;
    let payer: Keypair;
    let poolCreator: Keypair;
    let user: Keypair;
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

      poolCreator = prepareContext.poolCreator;
      user = prepareContext.user;
      payer = prepareContext.payer;
      tokenX = prepareContext.tokenAMint;
      tokenY = prepareContext.tokenBMint;
      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);
    });

    it("Should successfully split position 2 between poolCreator and user", async () => {
      const tokenBDecimal = 9;
      const activationType = ActivationType.Timestamp;
      const poolVersion = PoolVersion.V0;
      const baseFee = getBaseFeeParams(
        {
          baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
          feeSchedulerParam: {
            startingFeeBps: 100,
            endingFeeBps: 100,
            numberOfPeriod: 0,
            totalDuration: 0,
          },
        },
        tokenBDecimal,
        activationType
      );
      const poolFees: PoolFeesParams = {
        baseFee,
        padding: [],
        dynamicFee: null,
      };

      // 1. Create pool with first position (owned by poolCreator)
      const firstPositionNft = Keypair.generate();
      const tokenAAmount = new BN(1000 * 10 ** DECIMALS);
      const tokenBAmount = new BN(1000 * 10 ** DECIMALS);
      const { liquidityDelta: initPoolLiquidityDelta, initSqrtPrice } =
        ammInstance.preparePoolCreationParams({
          tokenAAmount,
          tokenBAmount,
          minSqrtPrice: MIN_SQRT_PRICE,
          maxSqrtPrice: MAX_SQRT_PRICE,
        });

      const createPoolParams: InitializeCustomizeablePoolParams = {
        payer: payer.publicKey,
        creator: poolCreator.publicKey,
        positionNft: firstPositionNft.publicKey,
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
        tx: createPoolTransaction,
        pool,
        position: firstPosition,
      } = await ammInstance.createCustomPool(createPoolParams);

      await executeTransaction(context.banksClient, createPoolTransaction, [
        payer,
        firstPositionNft,
      ]);

      // 2. Create second position (owned by user)
      const secondPositionNft = Keypair.generate();
      const createSecondPositionParams: CreatePositionParams = {
        owner: user.publicKey,
        payer: user.publicKey,
        pool,
        positionNft: secondPositionNft.publicKey,
      };
      const createSecondPositionTx = await ammInstance.createPosition(
        createSecondPositionParams
      );
      await executeTransaction(context.banksClient, createSecondPositionTx, [
        user,
        secondPositionNft,
      ]);

      const secondPosition = derivePositionAddress(secondPositionNft.publicKey);

      // 3. Execute split position
      const splitPositionParams: SplitPosition2Params = {
        firstPositionOwner: poolCreator.publicKey,
        secondPositionOwner: user.publicKey,
        pool,
        firstPosition,
        firstPositionNftAccount: derivePositionNftAccount(
          firstPositionNft.publicKey
        ),
        secondPosition,
        secondPositionNftAccount: derivePositionNftAccount(
          secondPositionNft.publicKey
        ),
        numerator: SPLIT_POSITION_DENOMINATOR / 2,
      };

      const splitPositionTx = await ammInstance.splitPosition2(
        splitPositionParams
      );
      await executeTransaction(context.banksClient, splitPositionTx, [
        poolCreator,
        user,
      ]);

      const afterFirstPositionState = await getPosition(
        context.banksClient,
        ammInstance._program,
        firstPosition
      );
      const afterSecondPositionState = await getPosition(
        context.banksClient,
        ammInstance._program,
        secondPosition
      );

      expect(afterFirstPositionState.unlockedLiquidity.toString()).eq(
        afterSecondPositionState.unlockedLiquidity.toString()
      );
      expect(afterFirstPositionState.permanentLockedLiquidity.toString()).eq(
        afterSecondPositionState.permanentLockedLiquidity.toString()
      );
      expect(afterFirstPositionState.feeAPending.toString()).eq(
        afterSecondPositionState.feeAPending.toString()
      );
      expect(afterFirstPositionState.feeBPending.toString()).eq(
        afterSecondPositionState.feeBPending.toString()
      );
    });
  });

  describe("Split position 2 with Token 2022", () => {
    let context: ProgramTestContext;
    let payer: Keypair;
    let poolCreator: Keypair;
    let user: Keypair;
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

      poolCreator = prepareContext.poolCreator;
      user = prepareContext.user;
      payer = prepareContext.payer;
      tokenX = prepareContext.tokenAMint;
      tokenY = prepareContext.tokenBMint;

      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection);
    });

    it("Should successfully split position 2 between poolCreator and user with Token 2022", async () => {
      const tokenBDecimal = 9;
      const activationType = ActivationType.Timestamp;
      const poolVersion = PoolVersion.V0;
      const baseFee = getBaseFeeParams(
        {
          baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
          feeSchedulerParam: {
            startingFeeBps: 100,
            endingFeeBps: 100,
            numberOfPeriod: 0,
            totalDuration: 0,
          },
        },
        tokenBDecimal,
        activationType
      );
      const poolFees: PoolFeesParams = {
        baseFee,
        padding: [],
        dynamicFee: null,
      };

      // 1. Create pool with first position (owned by poolCreator)
      const firstPositionNft = Keypair.generate();
      const tokenAAmount = new BN(1000 * 10 ** DECIMALS);
      const tokenBAmount = new BN(1000 * 10 ** DECIMALS);
      const { liquidityDelta: initPoolLiquidityDelta, initSqrtPrice } =
        ammInstance.preparePoolCreationParams({
          tokenAAmount,
          tokenBAmount,
          minSqrtPrice: MIN_SQRT_PRICE,
          maxSqrtPrice: MAX_SQRT_PRICE,
        });

      const createPoolParams: InitializeCustomizeablePoolParams = {
        payer: payer.publicKey,
        creator: poolCreator.publicKey,
        positionNft: firstPositionNft.publicKey,
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
        tx: createPoolTransaction,
        pool,
        position: firstPosition,
      } = await ammInstance.createCustomPool(createPoolParams);

      await executeTransaction(context.banksClient, createPoolTransaction, [
        payer,
        firstPositionNft,
      ]);

      // 2. Create second position (owned by user)
      const secondPositionNft = Keypair.generate();
      const createSecondPositionParams: CreatePositionParams = {
        owner: user.publicKey,
        payer: user.publicKey,
        pool,
        positionNft: secondPositionNft.publicKey,
      };
      const createSecondPositionTx = await ammInstance.createPosition(
        createSecondPositionParams
      );
      await executeTransaction(context.banksClient, createSecondPositionTx, [
        user,
        secondPositionNft,
      ]);

      const secondPosition = derivePositionAddress(secondPositionNft.publicKey);

      // 3. Execute split position
      const splitPositionParams: SplitPosition2Params = {
        firstPositionOwner: poolCreator.publicKey,
        secondPositionOwner: user.publicKey,
        pool,
        firstPosition,
        firstPositionNftAccount: derivePositionNftAccount(
          firstPositionNft.publicKey
        ),
        secondPosition,
        secondPositionNftAccount: derivePositionNftAccount(
          secondPositionNft.publicKey
        ),
        numerator: SPLIT_POSITION_DENOMINATOR / 2,
      };

      const splitPositionTx = await ammInstance.splitPosition2(
        splitPositionParams
      );
      await executeTransaction(context.banksClient, splitPositionTx, [
        poolCreator,
        user,
      ]);

      const afterFirstPositionState = await getPosition(
        context.banksClient,
        ammInstance._program,
        firstPosition
      );
      const afterSecondPositionState = await getPosition(
        context.banksClient,
        ammInstance._program,
        secondPosition
      );

      expect(afterFirstPositionState.unlockedLiquidity.toString()).eq(
        afterSecondPositionState.unlockedLiquidity.toString()
      );
      expect(afterFirstPositionState.permanentLockedLiquidity.toString()).eq(
        afterSecondPositionState.permanentLockedLiquidity.toString()
      );
      expect(afterFirstPositionState.feeAPending.toString()).eq(
        afterSecondPositionState.feeAPending.toString()
      );
      expect(afterFirstPositionState.feeBPending.toString()).eq(
        afterSecondPositionState.feeBPending.toString()
      );
    });
  });
});
