import { BanksClient, Clock, ProgramTestContext } from "solana-bankrun";
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
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

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

describe("Permissionless reward", () => {
  let context: ProgramTestContext;
  let payer: Keypair;
  let creator: Keypair;
  let tokenAMint: PublicKey;
  let tokenBMint: PublicKey;
  let rewardMint: PublicKey;
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
    tokenAMint = prepareContext.tokenAMint;
    tokenBMint = prepareContext.tokenBMint;
    rewardMint = prepareContext.rewardMint;
    const connection = new Connection(clusterApiUrl("devnet"));
    ammInstance = new CpAmm(connection);
  });

  it("Full flow ", async () => {
    const { pool, position } = await createPool(
      context.banksClient,
      ammInstance,
      payer,
      creator,
      tokenAMint,
      tokenBMint
    );
    const rewardIndex = 0;
    const rewardDuration = new BN(24 * 60 * 60);
    await rewardFlow(
      context,
      ammInstance,
      creator,
      payer,
      rewardMint,
      rewardIndex,
      payer.publicKey,
      pool,
      rewardDuration
    );
  });
});

async function createPool(
  banksClient: BanksClient,
  ammInstance: CpAmm,
  payer: Keypair,
  creator: Keypair,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey
): Promise<{ pool: PublicKey; position: PublicKey }> {
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
    tokenAMint,
    tokenBMint,
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
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    })
  );
  transaction.recentBlockhash = (await banksClient.getLatestBlockhash())[0];
  transaction.sign(payer, positionNft);

  await processTransactionMaybeThrow(banksClient, transaction);

  return { pool, position };
}

async function rewardFlow(
  context: ProgramTestContext,
  ammInstance: CpAmm,
  creator: Keypair,
  payer: Keypair,
  rewardMint: PublicKey,
  rewardIndex: number,
  funder: PublicKey,
  pool: PublicKey,
  rewardDuration: BN
) {
  const transaction = await ammInstance.initializeReward({
    rewardDuration,
    rewardIndex,
    rewardMint,
    pool,
    funder,
    payer: payer.publicKey,
    creator: creator.publicKey,
    rewardMintProgram: TOKEN_PROGRAM_ID,
  });

  transaction.recentBlockhash = (
    await context.banksClient.getLatestBlockhash()
  )[0];
  transaction.sign(payer, creator);

  await processTransactionMaybeThrow(context.banksClient, transaction);

  // update reward duration
  const updateRewardDuration = await ammInstance.updateRewardDuration({
    pool,
    signer: creator.publicKey,
    rewardIndex,
    newDuration: new BN(2 * 24 * 60 * 60),
  });

  updateRewardDuration.recentBlockhash = (
    await context.banksClient.getLatestBlockhash()
  )[0];
  updateRewardDuration.sign(creator);

  await processTransactionMaybeThrow(context.banksClient, updateRewardDuration);

  // update reward funder
  const updateRewardFunder = await ammInstance.updateRewardFunder({
    pool,
    signer: creator.publicKey,
    rewardIndex,
    newFunder: creator.publicKey,
  });

  updateRewardFunder.recentBlockhash = (
    await context.banksClient.getLatestBlockhash()
  )[0];
  updateRewardFunder.sign(creator);

  await processTransactionMaybeThrow(context.banksClient, updateRewardFunder);
}
