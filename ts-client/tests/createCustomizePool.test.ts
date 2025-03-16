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
  BaseFee,
  CpAmm,
  InitializeCustomizeablePoolParams,
  PoolFeesParams,
} from "../src";
import { CP_AMM_PROGRAM_ID, DECIMALS } from "./bankrun-utils";

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
      ammInstance = new CpAmm(connection, CP_AMM_PROGRAM_ID);
    });

    it("Initialize customizeable pool with spl token", async () => {
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

      const params: InitializeCustomizeablePoolParams = {
        payer: payer.publicKey,
        creator: creator.publicKey,
        positionNft: positionNft.publicKey,
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
      ammInstance = new CpAmm(connection, CP_AMM_PROGRAM_ID);
    });

    it("Initialize customizeable pool with spl token", async () => {
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

      const params: InitializeCustomizeablePoolParams = {
        payer: payer.publicKey,
        creator: creator.publicKey,
        positionNft: positionNft.publicKey,
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
