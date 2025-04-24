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
  AddLiquidityParams,
  BaseFee,
  CpAmm,
  CreatePositionParams,
  derivePositionAddress,
  derivePositionNftAccount,
  getTokenProgram,
  InitializeCustomizeablePoolParams,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
} from "../src";
import { DECIMALS, U64_MAX } from "./bankrun-utils";

describe("Merge position", () => {
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

  it("Success merge two position", async () => {
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
      pool
    );
    const { liquidityDelta } = await ammInstance.getDepositQuote({
      inAmount: new BN(1000 * 10 ** DECIMALS),
      isTokenA: true,
      sqrtPrice: poolState.sqrtPrice,
      minSqrtPrice: poolState.sqrtMinPrice,
      maxSqrtPrice: poolState.sqrtMaxPrice,
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
    executeTransaction(context.banksClient, addLiquidityTx, [creator]);

    // create position 2

    const secondPositionNft = Keypair.generate();

    const createPositionParams: CreatePositionParams = {
      owner: creator.publicKey,
      payer: creator.publicKey,
      pool,
      positionNft: secondPositionNft.publicKey,
    };
    const createPositionTx = await ammInstance.createPosition(
      createPositionParams
    );
    await executeTransaction(context.banksClient, createPositionTx, [
      creator,
      secondPositionNft,
    ]);

    // add liquidity position 2
    const secondPosition = derivePositionAddress(secondPositionNft.publicKey);
    const addLiquidityParamsSecondPosition: AddLiquidityParams = {
      owner: creator.publicKey,
      position: secondPosition,
      pool,
      positionNftAccount: derivePositionNftAccount(secondPositionNft.publicKey),
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
    const addLiquiditySecondPositionTx = await ammInstance.addLiquidity(
      addLiquidityParamsSecondPosition
    );
    executeTransaction(context.banksClient, addLiquiditySecondPositionTx, [
      creator,
    ]);

    // // merge two position
    const secondPositionState = await getPosition(
      context.banksClient,
      ammInstance._program,
      position
    );

    const mergeTx = await ammInstance.mergePosition({
      owner: creator.publicKey,
      positionB: position,
      positionA: derivePositionAddress(secondPositionNft.publicKey),
      poolState,
      positionBNftAccount: derivePositionNftAccount(positionNft.publicKey),
      positionANftAccount: derivePositionNftAccount(
        secondPositionNft.publicKey
      ),
      positionBState: secondPositionState,
      tokenAAmountAddLiquidityThreshold: new BN(U64_MAX),
      tokenBAmountAddLiquidityThreshold: new BN(U64_MAX),
      tokenAAmountRemoveLiquidityThreshold: new BN(0),
      tokenBAmountRemoveLiquidityThreshold: new BN(0),
      positionBVestings: [],
      currentPoint: new BN(0),
    });

    await executeTransaction(context.banksClient, mergeTx, [creator]);
  });
});
