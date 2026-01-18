import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  ActivationType,
  BaseFeeMode,
  CpAmm,
  derivePoolAddress,
  derivePositionAddress,
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
import fs from "fs";
import path from "path";

/**
 * Example: Create a DAMM v2 pool with Dynamic Config and FeeMarketCapSchedulerExponential
 *
 * This example demonstrates:
 * 1. Creating a pool using createCustomPoolWithDynamicConfig
 * 2. Using FeeMarketCapSchedulerExponential for fee scheduling based on price/market cap changes
 * 3. The fee decreases as the price increases (market cap grows)
 */

// Set DRY_RUN to false to actually deploy to devnet
const DRY_RUN = true;

(async () => {
  /**
   * POOL CONFIGURATION
   *
   * IMPORTANT: Update tokenAMint and tokenBMint to your actual tokens!
   *
   * Requirements:
   * 1. Both tokens must be SPL tokens (not Token-2022) if using native SOL
   * 2. Or both tokens must be Token-2022 (no native SOL)
   * 3. You must have sufficient balance of both tokens
   * 4. createCustomPool allows only ONE pool per token pair (no config in PDA)
   *    - If pool already exists, you'll get "account already in use" error
   *    - Use createCustomPoolWithDynamicConfig with a unique config for multiple pools
   *
   * To create test SPL tokens on devnet:
   * ```
   * spl-token create-token --decimals 9
   * spl-token create-account <TOKEN_MINT>
   * spl-token mint <TOKEN_MINT> 1000000
   * ```
   */
  const POOL_CONFIG = {
    // Update this path to your keypair
    keypairPath: "~/.config/solana/id.json",
    rpcUrl: clusterApiUrl("devnet"),
    // Token mints - UPDATE THESE TO YOUR ACTUAL TOKENS!
    // NOTE: createCustomPool only allows ONE pool per token pair
    tokenAMint: new PublicKey("Bqn5Pkffz8izgXA7QxxL6vyw3LW9qK312WLe8nHhN27M"), // Test SPL token
    tokenBMint: NATIVE_MINT, // Wrapped SOL as quote token
    tokenADecimals: 9, // Test token has 9 decimals
    tokenBDecimals: 9, // SOL has 9 decimals
    // Pool amounts
    maxTokenAAmount: 1000, // 1000 test tokens
    maxTokenBAmount: 0.1, // 0.1 SOL
    initialPrice: 0.0001, // 1 test token = 0.0001 SOL (10000 tokens per SOL)
    // Fee configuration with FeeMarketCapSchedulerExponential
    startingFeeBps: 5000, // 50% starting fee (anti-sniper)
    endingFeeBps: 100, // 1% ending fee
    numberOfPeriod: 180, // 180 price steps
    sqrtPriceStepBps: 200, // 2% price step per period
    schedulerExpirationDuration: 2592000, // 30 days expiration
    // Dynamic fee on top of base fee
    useDynamicFee: true,
    // Lock liquidity permanently
    isLockLiquidity: false,
    // Dynamic config address - you need to create this first or use an existing one
    // Set to null to skip (will error if not provided)
    dynamicConfig: null as PublicKey | null,
    poolCreatorAuthority: null as PublicKey | null, // Will be set to wallet
  };

  // Load wallet from keypair file
  const keypairData = JSON.parse(
    fs.readFileSync(path.resolve(POOL_CONFIG.keypairPath), "utf-8")
  );
  const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("DRY_RUN:", DRY_RUN);

  const connection = new Connection(POOL_CONFIG.rpcUrl, "confirmed");
  const cpAmm = new CpAmm(connection);

  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Wallet balance:", balance / 1e9, "SOL");

  if (balance < 0.05 * 1e9) {
    console.error("Insufficient balance. Need at least 0.05 SOL for fees.");
    return;
  }

  // Get token A info (for Token-2022 support)
  const tokenAAccountInfo = await connection.getAccountInfo(
    POOL_CONFIG.tokenAMint
  );

  let tokenAProgram = TOKEN_PROGRAM_ID;
  let tokenAInfo = null;
  if (tokenAAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)) {
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

  // Get token B info
  const tokenBAccountInfo = await connection.getAccountInfo(
    POOL_CONFIG.tokenBMint
  );
  let tokenBProgram = TOKEN_PROGRAM_ID;
  if (tokenBAccountInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    tokenBProgram = tokenBAccountInfo.owner;
  }

  // Calculate amounts in lamports
  const tokenAAmountInLamport = new BN(
    Math.floor(POOL_CONFIG.maxTokenAAmount * 10 ** POOL_CONFIG.tokenADecimals)
  );
  const tokenBAmountInLamport = new BN(
    Math.floor(POOL_CONFIG.maxTokenBAmount * 10 ** POOL_CONFIG.tokenBDecimals)
  );

  console.log("Token A amount:", tokenAAmountInLamport.toString());
  console.log("Token B amount:", tokenBAmountInLamport.toString());

  // Calculate initial sqrt price
  const initSqrtPrice = getSqrtPriceFromPrice(
    POOL_CONFIG.initialPrice.toString(),
    POOL_CONFIG.tokenADecimals,
    POOL_CONFIG.tokenBDecimals
  );
  console.log("Init sqrt price:", initSqrtPrice.toString());

  // Calculate liquidity delta
  const liquidityDelta = cpAmm.getLiquidityDelta({
    maxAmountTokenA: tokenAAmountInLamport,
    maxAmountTokenB: tokenBAmountInLamport,
    sqrtPrice: initSqrtPrice,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    tokenAInfo,
  });
  console.log("Liquidity delta:", liquidityDelta.toString());

  // Setup base fee with FeeMarketCapSchedulerExponential
  console.log("\nFee Configuration:");
  console.log("  Base Fee Mode: FeeMarketCapSchedulerExponential");
  console.log("  Starting Fee:", POOL_CONFIG.startingFeeBps / 100, "%");
  console.log("  Ending Fee:", POOL_CONFIG.endingFeeBps / 100, "%");
  console.log("  Number of Periods:", POOL_CONFIG.numberOfPeriod);
  console.log("  Sqrt Price Step:", POOL_CONFIG.sqrtPriceStepBps / 100, "%");
  console.log(
    "  Scheduler Expiration:",
    POOL_CONFIG.schedulerExpirationDuration / 86400,
    "days"
  );

  const baseFeeParams = getBaseFeeParams(
    {
      baseFeeMode: BaseFeeMode.FeeMarketCapSchedulerExponential,
      feeMarketCapSchedulerParam: {
        startingFeeBps: POOL_CONFIG.startingFeeBps,
        endingFeeBps: POOL_CONFIG.endingFeeBps,
        numberOfPeriod: POOL_CONFIG.numberOfPeriod,
        sqrtPriceStepBps: POOL_CONFIG.sqrtPriceStepBps,
        schedulerExpirationDuration: POOL_CONFIG.schedulerExpirationDuration,
      },
    },
    POOL_CONFIG.tokenBDecimals,
    ActivationType.Timestamp
  );

  // Optional: Add dynamic fee on top
  const dynamicFeeParams = POOL_CONFIG.useDynamicFee
    ? getDynamicFeeParams(POOL_CONFIG.endingFeeBps)
    : null;

  if (dynamicFeeParams) {
    console.log("  Dynamic Fee: Enabled (20% of base fee max)");
  }

  const poolFees: PoolFeesParams = {
    baseFee: baseFeeParams,
    padding: [],
    dynamicFee: dynamicFeeParams,
  };

  const positionNft = Keypair.generate();

  // If dynamic config is not provided, use createCustomPool instead
  if (!POOL_CONFIG.dynamicConfig) {
    console.log("\nNo dynamic config provided, using createCustomPool...");

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
      activationType: ActivationType.Timestamp,
      collectFeeMode: 0,
      activationPoint: null,
      tokenAProgram,
      tokenBProgram,
      isLockLiquidity: POOL_CONFIG.isLockLiquidity,
    });

    initCustomizePoolTx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    initCustomizePoolTx.feePayer = wallet.publicKey;
    initCustomizePoolTx.partialSign(wallet);
    initCustomizePoolTx.partialSign(positionNft);

    console.log("\nPool Address:", pool.toString());
    console.log("Position Address:", position.toString());
    console.log("Position NFT:", positionNft.publicKey.toString());

    if (DRY_RUN) {
      console.log("\n--- DRY RUN: Simulating transaction ---");
      const simulation = await connection.simulateTransaction(
        initCustomizePoolTx
      );
      console.log("Simulation result:", simulation.value.err || "Success");
      if (simulation.value.logs) {
        console.log("Logs:", simulation.value.logs.slice(-10).join("\n"));
      }
      console.log("\nSet DRY_RUN = false to deploy to devnet");
    } else {
      console.log("\n--- Deploying to devnet ---");
      const signature = await connection.sendRawTransaction(
        initCustomizePoolTx.serialize()
      );
      await connection.confirmTransaction(signature, "confirmed");
      console.log("Transaction signature:", signature);
      console.log(
        "Explorer:",
        `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      );
    }
  } else {
    // Use createCustomPoolWithDynamicConfig if dynamic config is provided
    console.log("\nUsing createCustomPoolWithDynamicConfig...");
    console.log("Dynamic Config:", POOL_CONFIG.dynamicConfig.toString());

    const poolCreatorAuthority =
      POOL_CONFIG.poolCreatorAuthority || wallet.publicKey;

    const {
      tx: initPoolTx,
      pool,
      position,
    } = await cpAmm.createCustomPoolWithDynamicConfig({
      payer: wallet.publicKey,
      creator: wallet.publicKey,
      positionNft: positionNft.publicKey,
      config: POOL_CONFIG.dynamicConfig,
      poolCreatorAuthority: poolCreatorAuthority,
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
      activationType: ActivationType.Timestamp,
      collectFeeMode: 0,
      activationPoint: null,
      tokenAProgram,
      tokenBProgram,
      isLockLiquidity: POOL_CONFIG.isLockLiquidity,
    });

    initPoolTx.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    initPoolTx.feePayer = wallet.publicKey;
    initPoolTx.partialSign(wallet);
    initPoolTx.partialSign(positionNft);

    console.log("\nPool Address:", pool.toString());
    console.log("Position Address:", position.toString());
    console.log("Position NFT:", positionNft.publicKey.toString());

    if (DRY_RUN) {
      console.log("\n--- DRY RUN: Simulating transaction ---");
      const simulation = await connection.simulateTransaction(initPoolTx);
      console.log("Simulation result:", simulation.value.err || "Success");
      if (simulation.value.logs) {
        console.log("Logs:", simulation.value.logs.slice(-10).join("\n"));
      }
      console.log("\nSet DRY_RUN = false to deploy to devnet");
    } else {
      console.log("\n--- Deploying to devnet ---");
      const signature = await connection.sendRawTransaction(
        initPoolTx.serialize()
      );
      await connection.confirmTransaction(signature, "confirmed");
      console.log("Transaction signature:", signature);
      console.log(
        "Explorer:",
        `https://explorer.solana.com/tx/${signature}?cluster=devnet`
      );
    }
  }
})();
