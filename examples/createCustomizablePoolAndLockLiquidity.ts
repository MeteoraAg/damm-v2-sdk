import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  CpAmm,
  FeeSchedulerMode,
  getBaseFeeParams,
  getDynamicFeeParams,
  getSqrtPriceFromPrice,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
} from "../src";
import {
  getMint,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

(async () => {
  const POOL_CONFIG = {
    keypairPath: "~/.config/solana/id.json",
    rpcUrl: clusterApiUrl("devnet"),
    tokenAMint: new PublicKey("Hy3yvkb8am3xcdN8nfbtKshAhF6hiYU4h5f3F5jTcBvy"),
    tokenBMint: NATIVE_MINT,
    tokenADecimals: 9,
    tokenBDecimals: 9,
    maxTokenAAmount: 1_000_000,
    maxTokenBAmount: 1, // SOL
    initialPrice: 1, // 1 base token = 1 quote token
    maxBaseFeeBps: 5000, // 50%
    minBaseFeeBps: 25, // 0.25%
    useDynamicFee: true,
    isLockLiquidity: true,
    feeSchedulerMode: FeeSchedulerMode.Exponential,
    numberOfPeriod: 60, // 60 peridos
    totalDuration: 3600, // 60 * 60
  };

  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(Uint8Array.from(require(POOL_CONFIG.keypairPath)))
  );

  const connection = new Connection(POOL_CONFIG.rpcUrl);
  const cpAmm = new CpAmm(connection);

  const tokenAAccountInfo = await connection.getAccountInfo(
    POOL_CONFIG.tokenAMint
  );

  let tokenAProgram = TOKEN_PROGRAM_ID;
  let tokenAInfo = null;
  if (tokenAAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    tokenAProgram = tokenAAccountInfo.owner;
    const baseMint = await getMint(
      connection,
      POOL_CONFIG.tokenAMint,
      connection.commitment,
      tokenAProgram
    );
    const epochInfo = await connection.getEpochInfo();
    tokenAInfo = {
      mint: baseMint,
      currentEpoch: epochInfo.epoch,
    };
  }

  const tokenAAmountInLamport = new BN(POOL_CONFIG.maxTokenAAmount).mul(
    new BN(10 ** POOL_CONFIG.tokenADecimals)
  );
  const tokenBAmountInLamport = new BN(POOL_CONFIG.maxTokenBAmount).mul(
    new BN(10 ** POOL_CONFIG.tokenBDecimals)
  );
  const initSqrtPrice = getSqrtPriceFromPrice(
    POOL_CONFIG.initialPrice.toString(),
    POOL_CONFIG.tokenADecimals,
    POOL_CONFIG.tokenBDecimals
  );
  const liquidityDelta = cpAmm.getLiquidityDelta({
    maxAmountTokenA: tokenAAmountInLamport,
    maxAmountTokenB: tokenBAmountInLamport,
    sqrtPrice: initSqrtPrice,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    tokenAInfo,
  });

  const baseFeeParams = getBaseFeeParams(
    POOL_CONFIG.maxBaseFeeBps,
    POOL_CONFIG.minBaseFeeBps,
    POOL_CONFIG.feeSchedulerMode,
    POOL_CONFIG.numberOfPeriod,
    POOL_CONFIG.totalDuration
  );
  const dynamicFeeParams = POOL_CONFIG.useDynamicFee
    ? getDynamicFeeParams(POOL_CONFIG.minBaseFeeBps)
    : null;

  const poolFees: PoolFeesParams = {
    baseFee: baseFeeParams,
    padding: [],
    dynamicFee: dynamicFeeParams,
  };
  const positionNft = Keypair.generate();

  const {
    tx: initCustomizePoolTx,
    pool,
    position,
  } = await cpAmm.createCustomPool({
    payer: wallet.publicKey,
    creator: wallet.publicKey,
    positionNft: positionNft.publicKey,
    tokenAMint: POOL_CONFIG.tokenAMint,
    tokenBMint: POOL_CONFIG.tokenBMint,
    tokenAAmount: tokenAAmountInLamport,
    tokenBAmount: tokenBAmountInLamport,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    liquidityDelta: liquidityDelta,
    initSqrtPrice: initSqrtPrice,
    poolFees: poolFees,
    hasAlphaVault: false,
    activationType: 0,
    collectFeeMode: 0,
    activationPoint: null,
    tokenAProgram,
    tokenBProgram: TOKEN_PROGRAM_ID,
    isLockLiquidity: POOL_CONFIG.isLockLiquidity,
  });

  initCustomizePoolTx.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;
  initCustomizePoolTx.feePayer = wallet.publicKey;
  initCustomizePoolTx.partialSign(wallet);
  initCustomizePoolTx.partialSign(positionNft);

  console.log(await connection.simulateTransaction(initCustomizePoolTx));
  //   const signature = await connection.sendRawTransaction(
  //     initCustomizePoolTx.serialize()
  //   );
  //   console.log({
  //     signature,
  //     pool: pool.toString(),
  //     position: position.toString(),
  //   });
})();
