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
import { CP_AMM_PROGRAM_ID, DECIMALS } from "./bankrun-utils";
import {
  BaseFee,
  CpAmm,
  CreatePositionParams,
  InitializeCustomizeablePoolParams,
  PoolFeesParams,
} from "../src";

describe("Create position", () => {
  describe("SPL token", () => {
    let context: ProgramTestContext;
    let user: Keypair;
    let payer: Keypair;
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
      user = prepareContext.user;
      tokenX = prepareContext.tokenAMint;
      tokenY = prepareContext.tokenBMint;
      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection, CP_AMM_PROGRAM_ID);

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

      params = {
        payer: payer.publicKey,
        creator: payer.publicKey,
        positionNft: PublicKey.default,
        tokenX,
        tokenY,
        tokenXAmount: new BN(1000 * 10 ** DECIMALS),
        tokenYAmount: new BN(1000 * 10 ** DECIMALS),
        tokenXDecimal: DECIMALS,
        tokenYDecimal: DECIMALS,
        poolFees,
        hasAlphaVault: false,
        activationType: 1, // 0 slot, 1 timestamp
        collectFeeMode: 0,
        activationPoint: null,
        tokenXProgram: TOKEN_PROGRAM_ID,
        tokenYProgram: TOKEN_PROGRAM_ID,
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
        payer: payer.publicKey,
        pool,
        positionNft: userPositionNft.publicKey,
      };
      const createPositionTx = await ammInstance.createPosition(
        createPositionParams
      );
      await executeTransaction(context.banksClient, createPositionTx, [
        payer,
        userPositionNft,
      ]);
    });
  });

  describe("Token 2022", () => {
    let context: ProgramTestContext;
    let payer: Keypair;
    let user: Keypair;
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
      tokenX = prepareContext.tokenAMint;
      tokenY = prepareContext.tokenBMint;

      const connection = new Connection(clusterApiUrl("devnet"));
      ammInstance = new CpAmm(connection, CP_AMM_PROGRAM_ID);

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

      params = {
        payer: payer.publicKey,
        creator: payer.publicKey,
        positionNft: PublicKey.default,
        tokenX,
        tokenY,
        tokenXAmount: new BN(1000 * 10 ** DECIMALS),
        tokenYAmount: new BN(1000 * 10 ** DECIMALS),
        tokenXDecimal: DECIMALS,
        tokenYDecimal: DECIMALS,
        poolFees,
        hasAlphaVault: false,
        activationType: 1, // 0 slot, 1 timestamp
        collectFeeMode: 0,
        activationPoint: null,
        tokenXProgram: TOKEN_2022_PROGRAM_ID,
        tokenYProgram: TOKEN_2022_PROGRAM_ID,
      };
    });

    it("User create a position", async () => {
      const positionNft = Keypair.generate();
      params.positionNft = positionNft.publicKey;
      const { tx: transaction, pool } = await ammInstance.createCustomPool(
        params
      );
      executeTransaction(context.banksClient, transaction, [
        payer,
        positionNft,
      ]);

      // create position
      const userPositionNft = Keypair.generate();

      const createPositionParams: CreatePositionParams = {
        owner: user.publicKey,
        payer: payer.publicKey,
        pool,
        positionNft: userPositionNft.publicKey,
      };
      const createPositionTx = await ammInstance.createPosition(
        createPositionParams
      );
      await executeTransaction(context.banksClient, createPositionTx, [
        payer,
        userPositionNft,
      ]);
    });
  });
});
