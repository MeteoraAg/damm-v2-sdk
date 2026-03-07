/**
 * DAMM v2 SDK — Devnet Integration Test (Concentrated Liquidity / CLMM)
 *
 * Same 7-instruction test suite as the Compounding test, but using
 * CollectFeeMode.BothToken (standard concentrated liquidity pool).
 *
 * Verifies SDK quotes match actual on-chain execution.
 */
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import BN from "bn.js";
import {
  getAccount,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  derivePositionNftAccount,
  getBaseFeeParams,
  MIN_SQRT_PRICE,
  MAX_SQRT_PRICE,
  PoolFeesParams,
} from "./src";
import * as fs from "fs";
import * as os from "os";

const keypairPath = `${os.homedir()}/.config/solana/id.json`;
const wallet = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")))
);
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
const cpAmm = new CpAmm(connection);

function log(msg: string) { console.log(msg); }
function pass(label: string, extra?: string) {
  log(`  ✅ PASS: ${label}${extra ? " — " + extra : ""}`);
}
function fail(label: string, detail: string): never {
  log(`  ❌ FAIL: ${label} — ${detail}`);
  process.exit(1);
}
function assertClose(label: string, actual: BN, expected: BN, toleranceBps = 100) {
  const diff = actual.sub(expected).abs();
  const threshold = expected.muln(toleranceBps).divn(10000);
  if (diff.lte(threshold)) {
    pass(label, `actual=${actual}, expected=${expected}, diff=${diff}`);
  } else {
    fail(label, `actual=${actual}, expected=${expected}, diff=${diff} exceeds ${toleranceBps}bps`);
  }
}
function assertLte(label: string, actual: BN, expected: BN) {
  if (actual.lte(expected)) {
    pass(label, `actual=${actual} <= expected=${expected}`);
  } else {
    fail(label, `actual=${actual} > expected=${expected}`);
  }
}

async function sendTx(tx: Transaction, signers: Keypair[], label: string): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = wallet.publicKey;
  tx.instructions.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }));
  const sig = await sendAndConfirmTransaction(connection, tx, signers, {
    commitment: "confirmed",
    maxRetries: 5,
  });
  log(`     tx: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  return sig;
}

async function getTokenBalance(ata: PublicKey): Promise<BN> {
  const info = await getAccount(connection, ata);
  return new BN(info.amount.toString());
}

async function main() {
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("  DAMM v2 SDK — Devnet Test (Concentrated Liquidity)");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log(`  Wallet:  ${wallet.publicKey}`);
  const bal = await connection.getBalance(wallet.publicKey);
  log(`  Balance: ${(bal / LAMPORTS_PER_SOL).toFixed(3)} SOL`);

  // ── Mints ─────────────────────────────────────────────────────────────────
  log("\n[Setup] Creating token mints...");
  const DECIMALS = 6;
  const tokenAMint = await createMint(connection, wallet, wallet.publicKey, null, DECIMALS, undefined, undefined, TOKEN_PROGRAM_ID);
  const tokenBMint = await createMint(connection, wallet, wallet.publicKey, null, DECIMALS, undefined, undefined, TOKEN_PROGRAM_ID);
  log(`  Token A: ${tokenAMint}`);
  log(`  Token B: ${tokenBMint}`);

  const tokenAAccount = await getOrCreateAssociatedTokenAccount(connection, wallet, tokenAMint, wallet.publicKey);
  const tokenBAccount = await getOrCreateAssociatedTokenAccount(connection, wallet, tokenBMint, wallet.publicKey);
  await mintTo(connection, wallet, tokenAMint, tokenAAccount.address, wallet, 10_000_000_000);
  await mintTo(connection, wallet, tokenBMint, tokenBAccount.address, wallet, 10_000_000_000);
  log("  Minted 10,000 of each token");

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 1: Create Concentrated Liquidity Pool (BothToken mode)
  // ══════════════════════════════════════════════════════════════════════════
  log("\n[Test 1] Create Concentrated Liquidity Pool (BothToken)");

  const positionNft = Keypair.generate();
  const tokenAAmount = new BN(1_000 * 10 ** DECIMALS);
  const tokenBAmount = new BN(1_000 * 10 ** DECIMALS);

  // Use preparePoolCreationParams for CLMM (standard concentrated liquidity math)
  const { liquidityDelta, initSqrtPrice } = cpAmm.preparePoolCreationParams({
    tokenAAmount,
    tokenBAmount,
    minSqrtPrice: MIN_SQRT_PRICE,
    maxSqrtPrice: MAX_SQRT_PRICE,
  });

  const baseFee = getBaseFeeParams(
    {
      baseFeeMode: BaseFeeMode.FeeTimeSchedulerExponential,
      feeTimeSchedulerParam: {
        startingFeeBps: 300,
        endingFeeBps: 25,
        numberOfPeriod: 60,
        totalDuration: 3600,
      },
    },
    DECIMALS,
    ActivationType.Timestamp
  );

  const poolFees: PoolFeesParams = {
    baseFee,
    compoundingFeeBps: 0,
    padding: 0,
    dynamicFee: null,
  };

  const { tx: createTx, pool, position } = await cpAmm.createCustomPool({
    payer: wallet.publicKey,
    creator: wallet.publicKey,
    positionNft: positionNft.publicKey,
    tokenAMint,
    tokenBMint,
    tokenAAmount,
    tokenBAmount,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    liquidityDelta,
    initSqrtPrice,
    poolFees,
    hasAlphaVault: false,
    activationType: ActivationType.Timestamp,
    collectFeeMode: CollectFeeMode.BothToken,
    activationPoint: null,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
  });

  await sendTx(createTx, [wallet, positionNft], "createCustomPool");
  log(`  Pool:     ${pool}`);
  log(`  Position: ${position}`);

  let poolState = await cpAmm.fetchPoolState(pool);
  pass("Pool created", `collectFeeMode=${poolState.collectFeeMode}`);
  if (poolState.collectFeeMode !== CollectFeeMode.BothToken) {
    fail("collectFeeMode", `expected BothToken(0), got ${poolState.collectFeeMode}`);
  }
  pass("collectFeeMode is BothToken (CLMM)");

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 2: Swap A→B + Quote Verification
  // ══════════════════════════════════════════════════════════════════════════
  log("\n[Test 2] Swap A→B + Quote Verification");
  poolState = await cpAmm.fetchPoolState(pool);
  const slot2 = await connection.getSlot();
  const ts2 = await connection.getBlockTime(slot2);
  const swapAAmount = new BN(10 * 10 ** DECIMALS);

  const quoteAtoB = cpAmm.getQuote({
    inAmount: swapAAmount,
    inputTokenMint: tokenAMint,
    slippage: 1,
    poolState,
    currentTime: ts2 ?? Math.floor(Date.now() / 1000),
    currentSlot: slot2,
    tokenADecimal: DECIMALS,
    tokenBDecimal: DECIMALS,
    hasReferral: false,
  });
  log(`  SDK Quote A→B: in=${swapAAmount}, out=${quoteAtoB.swapOutAmount}, minOut=${quoteAtoB.minSwapOutAmount}`);

  const tokenBBefore2 = await getTokenBalance(tokenBAccount.address);
  const swapAToBTx = await cpAmm.swap({
    payer: wallet.publicKey,
    pool,
    inputTokenMint: tokenAMint,
    outputTokenMint: tokenBMint,
    tokenAVault: poolState.tokenAVault,
    tokenBVault: poolState.tokenBVault,
    tokenAMint,
    tokenBMint,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
    amountIn: swapAAmount,
    minimumAmountOut: quoteAtoB.minSwapOutAmount,
    referralTokenAccount: null,
  });
  await sendTx(swapAToBTx as Transaction, [wallet], "swap A→B");

  const tokenBAfter2 = await getTokenBalance(tokenBAccount.address);
  const actualOutAtoB = tokenBAfter2.sub(tokenBBefore2);
  log(`  Actual received: ${actualOutAtoB}`);
  log(`  SDK quoted:      ${quoteAtoB.swapOutAmount}`);
  assertLte("actualOut <= sdkQuote (A→B)", actualOutAtoB, quoteAtoB.swapOutAmount);
  assertLte("actualOut >= minSwapOut (A→B)", quoteAtoB.minSwapOutAmount, actualOutAtoB);
  assertClose("swap A→B quote accuracy", actualOutAtoB, quoteAtoB.swapOutAmount);

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 3: Swap B→A + Quote Verification
  // ══════════════════════════════════════════════════════════════════════════
  log("\n[Test 3] Swap B→A + Quote Verification");
  poolState = await cpAmm.fetchPoolState(pool);
  const slot3 = await connection.getSlot();
  const ts3 = await connection.getBlockTime(slot3);
  const swapBAmount = new BN(10 * 10 ** DECIMALS);

  const quoteBtoA = cpAmm.getQuote({
    inAmount: swapBAmount,
    inputTokenMint: tokenBMint,
    slippage: 1,
    poolState,
    currentTime: ts3 ?? Math.floor(Date.now() / 1000),
    currentSlot: slot3,
    tokenADecimal: DECIMALS,
    tokenBDecimal: DECIMALS,
    hasReferral: false,
  });
  log(`  SDK Quote B→A: in=${swapBAmount}, out=${quoteBtoA.swapOutAmount}, minOut=${quoteBtoA.minSwapOutAmount}`);

  const tokenABefore3 = await getTokenBalance(tokenAAccount.address);
  const swapBToATx = await cpAmm.swap({
    payer: wallet.publicKey,
    pool,
    inputTokenMint: tokenBMint,
    outputTokenMint: tokenAMint,
    tokenAVault: poolState.tokenAVault,
    tokenBVault: poolState.tokenBVault,
    tokenAMint,
    tokenBMint,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
    amountIn: swapBAmount,
    minimumAmountOut: quoteBtoA.minSwapOutAmount,
    referralTokenAccount: null,
  });
  await sendTx(swapBToATx as Transaction, [wallet], "swap B→A");

  const tokenAAfter3 = await getTokenBalance(tokenAAccount.address);
  const actualOutBtoA = tokenAAfter3.sub(tokenABefore3);
  log(`  Actual received: ${actualOutBtoA}`);
  log(`  SDK quoted:      ${quoteBtoA.swapOutAmount}`);
  assertLte("actualOut <= sdkQuote (B→A)", actualOutBtoA, quoteBtoA.swapOutAmount);
  assertLte("actualOut >= minSwapOut (B→A)", quoteBtoA.minSwapOutAmount, actualOutBtoA);
  assertClose("swap B→A quote accuracy", actualOutBtoA, quoteBtoA.swapOutAmount);

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 4: Add Liquidity
  // ══════════════════════════════════════════════════════════════════════════
  log("\n[Test 4] Add Liquidity");
  poolState = await cpAmm.fetchPoolState(pool);
  const depositAmount = new BN(100 * 10 ** DECIMALS);

  // CLMM deposit: use sqrtPrice / price range
  const depositQuote = cpAmm.getDepositQuote({
    inAmount: depositAmount,
    isTokenA: true,
    sqrtPrice: poolState.sqrtPrice,
    minSqrtPrice: poolState.sqrtMinPrice,
    maxSqrtPrice: poolState.sqrtMaxPrice,
  });
  log(`  Deposit quote: liquidityDelta=${depositQuote.liquidityDelta}, tokenBRequired=${depositQuote.outputAmount}`);

  const addLiqTx = await cpAmm.addLiquidity({
    owner: wallet.publicKey,
    pool,
    position,
    positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
    liquidityDelta: depositQuote.liquidityDelta,
    maxAmountTokenA: depositAmount.muln(2),
    maxAmountTokenB: depositQuote.outputAmount.muln(2),
    tokenAAmountThreshold: depositAmount.muln(2),
    tokenBAmountThreshold: depositQuote.outputAmount.muln(2),
    tokenAVault: poolState.tokenAVault,
    tokenBVault: poolState.tokenBVault,
    tokenAMint,
    tokenBMint,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
  });
  await sendTx(addLiqTx as Transaction, [wallet], "addLiquidity");
  pass("Add liquidity succeeded");

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 5: Remove Liquidity
  // ══════════════════════════════════════════════════════════════════════════
  log("\n[Test 5] Remove Liquidity");
  poolState = await cpAmm.fetchPoolState(pool);
  const positionState = await cpAmm.fetchPositionState(position);
  const totalLiquidity = positionState.unlockedLiquidity
    .add(positionState.vestedLiquidity)
    .add(positionState.permanentLockedLiquidity);
  log(`  Position liquidity: ${totalLiquidity}`);

  const removeLiqDelta = totalLiquidity.divn(10);

  // CLMM withdraw quote: use sqrtPrice / price range
  const withdrawQuote = cpAmm.getWithdrawQuote({
    liquidityDelta: removeLiqDelta,
    sqrtPrice: poolState.sqrtPrice,
    minSqrtPrice: poolState.sqrtMinPrice,
    maxSqrtPrice: poolState.sqrtMaxPrice,
  });
  log(`  Withdraw quote: tokenA=${withdrawQuote.outAmountA}, tokenB=${withdrawQuote.outAmountB}`);

  const tokenABefore5 = await getTokenBalance(tokenAAccount.address);
  const tokenBBefore5 = await getTokenBalance(tokenBAccount.address);

  const removeLiqTx = await cpAmm.removeLiquidity({
    owner: wallet.publicKey,
    pool,
    position,
    positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
    liquidityDelta: removeLiqDelta,
    tokenAAmountThreshold: new BN(0),
    tokenBAmountThreshold: new BN(0),
    tokenAVault: poolState.tokenAVault,
    tokenBVault: poolState.tokenBVault,
    tokenAMint,
    tokenBMint,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
    vestings: [],
    currentPoint: new BN(Math.floor(Date.now() / 1000)),
  });
  await sendTx(removeLiqTx as Transaction, [wallet], "removeLiquidity");

  const tokenAAfter5 = await getTokenBalance(tokenAAccount.address);
  const tokenBAfter5 = await getTokenBalance(tokenBAccount.address);
  const actualA5 = tokenAAfter5.sub(tokenABefore5);
  const actualB5 = tokenBAfter5.sub(tokenBBefore5);
  log(`  Actual received: tokenA=${actualA5}, tokenB=${actualB5}`);
  assertClose("removeLiquidity tokenA accuracy", actualA5, withdrawQuote.outAmountA);
  assertClose("removeLiquidity tokenB accuracy", actualB5, withdrawQuote.outAmountB);

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 6: Claim Position Fees
  // ══════════════════════════════════════════════════════════════════════════
  log("\n[Test 6] Claim Position Fees");
  poolState = await cpAmm.fetchPoolState(pool);
  const claimFeesTx = await cpAmm.claimPositionFee({
    owner: wallet.publicKey,
    pool,
    position,
    positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
    tokenAVault: poolState.tokenAVault,
    tokenBVault: poolState.tokenBVault,
    tokenAMint,
    tokenBMint,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
  });
  await sendTx(claimFeesTx as Transaction, [wallet], "claimPositionFee");
  pass("Claim fees succeeded");

  // ══════════════════════════════════════════════════════════════════════════
  // TEST 7: Close Position
  // ══════════════════════════════════════════════════════════════════════════
  log("\n[Test 7] Close Position");
  poolState = await cpAmm.fetchPoolState(pool);
  const positionState2 = await cpAmm.fetchPositionState(position);
  const remaining = positionState2.unlockedLiquidity
    .add(positionState2.vestedLiquidity)
    .add(positionState2.permanentLockedLiquidity);

  if (remaining.gtn(0)) {
    const removeAllTx = await cpAmm.removeAllLiquidity({
      owner: wallet.publicKey,
      pool,
      position,
      positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
      tokenAAmountThreshold: new BN(0),
      tokenBAmountThreshold: new BN(0),
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAMint,
      tokenBMint,
      tokenAProgram: TOKEN_PROGRAM_ID,
      tokenBProgram: TOKEN_PROGRAM_ID,
      vestings: [],
      currentPoint: new BN(Math.floor(Date.now() / 1000)),
    });
    await sendTx(removeAllTx as Transaction, [wallet], "removeAllLiquidity");
    log("  Removed remaining liquidity");

    try {
      poolState = await cpAmm.fetchPoolState(pool);
      const claimTx2 = await cpAmm.claimPositionFee({
        owner: wallet.publicKey,
        pool,
        position,
        positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAMint,
        tokenBMint,
        tokenAProgram: TOKEN_PROGRAM_ID,
        tokenBProgram: TOKEN_PROGRAM_ID,
      });
      await sendTx(claimTx2 as Transaction, [wallet], "claimPositionFee (residual)");
    } catch (_e) { log("  (no residual fees)"); }
  }

  const closePosTx = await cpAmm.closePosition({
    owner: wallet.publicKey,
    pool,
    position,
    positionNftMint: positionNft.publicKey,
    positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
  });
  await sendTx(closePosTx as Transaction, [wallet], "closePosition");
  pass("Close position succeeded");

  log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  log("  🎉 ALL CLMM TESTS PASSED — SDK quotes verified on-chain");
  log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((err) => {
  console.error("\n❌ TEST FAILED:", err.message ?? err);
  if (err.logs) console.error("Logs:", err.logs.join("\n"));
  else console.error(err);
  process.exit(1);
});
