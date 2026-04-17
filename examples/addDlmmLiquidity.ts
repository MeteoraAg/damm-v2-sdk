/**
 * DLMM 追加流动性 — 完整可运行脚本
 *
 * 运行方式：
 *   npx tsx examples/addDlmmLiquidity.ts
 *
 * 两种场景（在底部 main() 里切换）：
 *   A. 往「已有仓位」追加
 *   B. 在「已有池子」新开仓位并添加
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import DLMM, { StrategyType } from "@meteora-ag/dlmm";
import bs58 from "bs58";

// ═══════════════════════════════════════════════════════════════════════════════
// ★ 配置区 — 只需改这里
// ═══════════════════════════════════════════════════════════════════════════════
const CONFIG = {
  rpcUrl: "https://api.mainnet-beta.solana.com", // 换成你的 RPC
  cluster: "mainnet-beta" as const,              // "mainnet-beta" | "devnet"

  // 钱包私钥（base58 字符串）
  privateKey: "YOUR_PRIVATE_KEY_BASE58",

  // 池子地址（建池时返回的 pool 字段）
  poolAddress: "YOUR_LB_PAIR_ADDRESS",

  // ── 场景 A：往已有仓位追加时填这个 ──
  existingPositionAddress: "YOUR_POSITION_ADDRESS",

  // Token 相关
  tokenDecimals: 6,

  // 追加数量
  addTokenAmount: 5_000_000,  // 追加 500万 Token（不含小数位）
  addSolAmount:   0,          // 追加 SOL，不加就填 0

  // bin 配置（新开仓位时用）
  binRange:     34,           // 以当前 activeBin 为中心，上下各 34 个 bin
  strategyType: StrategyType.SpotImbalanced,
};
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 发送单笔或多笔交易（SDK 有时返回 Transaction[]）────────────────────────────
async function sendTxOrList(
  connection: Connection,
  txOrList: Transaction | Transaction[],
  signers: Keypair[]
): Promise<string> {
  const list = Array.isArray(txOrList) ? txOrList : [txOrList];
  let lastSig = "";
  for (const tx of list) {
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = signers[0].publicKey;
    lastSig = await sendAndConfirmTransaction(connection, tx, signers, {
      commitment: "confirmed",
    });
    console.log(`  ✓ tx: ${lastSig}`);
  }
  return lastSig;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 A — 往「已有仓位」追加流动性
//
// 用法：
//   仓位 bin 范围 = 仓位原有的 lowerBinId ~ upperBinId，不会改变
//   只传 tokenAmount 则单边加 Token；只传 solAmount 则单边加 SOL
// ═══════════════════════════════════════════════════════════════════════════════
async function addLiquidityToExistingPosition(
  connection: Connection,
  wallet: Keypair,
  poolAddress: string,
  positionAddress: string,
  tokenAmount: number,    // 不含小数位，例如 5_000_000
  solAmount: number,      // SOL 数量，例如 0.01；不加就填 0
  tokenDecimals: number,
  strategyType: StrategyType
) {
  console.log("\n══ 场景 A：追加到已有仓位 ══");
  console.log(`  池子:   ${poolAddress}`);
  console.log(`  仓位:   ${positionAddress}`);
  console.log(`  追加:   Token=${tokenAmount}  SOL=${solAmount}`);

  // 1. 加载池子
  const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
    cluster: CONFIG.cluster,
  });

  // 2. 读取仓位，拿到 bin 范围
  const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(
    wallet.publicKey
  );
  const target = userPositions.find(
    (p) => p.publicKey.toBase58() === positionAddress
  );
  if (!target) {
    throw new Error(
      `仓位 ${positionAddress} 不存在，或不属于钱包 ${wallet.publicKey.toBase58()}`
    );
  }

  const { lowerBinId, upperBinId } = target.positionData;
  const activeBin = await dlmmPool.getActiveBin();
  console.log(`  bin范围: [${lowerBinId}, ${upperBinId}]  activeBin=${activeBin.binId}  价格=${activeBin.price}`);

  // 3. 构造数量（BN 含小数位）
  const totalXAmount = new BN(tokenAmount).mul(new BN(10 ** tokenDecimals));
  const totalYAmount = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));

  // 4. addLiquidityByStrategy — 追加到已有仓位（不新建，不需要 positionKeypair 签名）
  const addLiqTx = await dlmmPool.addLiquidityByStrategy({
    positionPubKey: new PublicKey(positionAddress),
    user:           wallet.publicKey,
    totalXAmount,
    totalYAmount,
    strategy: {
      maxBinId:     upperBinId,
      minBinId:     lowerBinId,
      strategyType,
    },
    slippage: 0,
  });

  // 5. 发送
  const sig = await sendTxOrList(connection, addLiqTx, [wallet]);
  console.log(`  ✓ 追加成功! signature: ${sig}`);
  return sig;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 B — 在「已有池子」新开仓位并添加流动性
//
// 用法：
//   以当前 activeBin 为中心，展开 ±binRange 个 bin 的价格区间
//   Token 铺在 activeBin 及以上（卖出深度）
//   SOL   铺在 activeBin 及以下（买入深度）
// ═══════════════════════════════════════════════════════════════════════════════
async function addLiquidityNewPosition(
  connection: Connection,
  wallet: Keypair,
  poolAddress: string,
  tokenAmount: number,    // 不含小数位
  solAmount: number,
  tokenDecimals: number,
  binRange: number,
  strategyType: StrategyType
) {
  console.log("\n══ 场景 B：新开仓位并添加流动性 ══");
  console.log(`  池子:   ${poolAddress}`);
  console.log(`  添加:   Token=${tokenAmount}  SOL=${solAmount}`);

  // 1. 加载池子 & 获取当前 activeBin
  const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
    cluster: CONFIG.cluster,
  });
  const activeBin = await dlmmPool.getActiveBin();
  const currentBinId = activeBin.binId;

  const minBinId = currentBinId - binRange;
  const maxBinId = currentBinId + binRange;
  console.log(`  activeBin=${currentBinId}  价格=${activeBin.price} SOL/Token`);
  console.log(`  新仓位 bin范围: [${minBinId}, ${maxBinId}]`);

  // 2. 构造数量
  const totalXAmount = new BN(tokenAmount).mul(new BN(10 ** tokenDecimals));
  const totalYAmount = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));

  // 3. 新建仓位 Keypair（新仓位的地址就是这个 publicKey）
  const positionKeypair = Keypair.generate();
  console.log(`  新仓位地址: ${positionKeypair.publicKey.toBase58()}`);

  // 4. initializePositionAndAddLiquidityByStrategy
  //    = 新建仓位 + 存入流动性，两步合一
  //    注意：positionKeypair 必须参与签名
  const addLiqTx =
    await dlmmPool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: positionKeypair.publicKey,
      user:           wallet.publicKey,
      totalXAmount,
      totalYAmount,
      strategy: {
        maxBinId,
        minBinId,
        strategyType,
      },
      slippage: 0,
    });

  // 5. 发送（signers 包含 wallet + positionKeypair）
  const sig = await sendTxOrList(connection, addLiqTx, [wallet, positionKeypair]);
  console.log(`  ✓ 新仓位创建 + 流动性添加成功!`);
  console.log(`    signature:   ${sig}`);
  console.log(`    positionAddr: ${positionKeypair.publicKey.toBase58()}`);

  return {
    signature: sig,
    positionAddress: positionKeypair.publicKey.toBase58(),
    positionKeypair,
    minBinId,
    maxBinId,
  };
}

// ─── 查询仓位（运行前先看看当前有哪些仓位）────────────────────────────────────
async function printPositions(
  connection: Connection,
  wallet: Keypair,
  poolAddress: string
) {
  const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
    cluster: CONFIG.cluster,
  });
  const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(
    wallet.publicKey
  );
  const activeBin = await dlmmPool.getActiveBin();

  console.log(`\n══ 当前仓位列表 ══`);
  console.log(`  池子:      ${poolAddress}`);
  console.log(`  activeBin: ${activeBin.binId}  价格=${activeBin.price} SOL/Token`);
  console.log(`  仓位数量:  ${userPositions.length}`);

  for (const pos of userPositions) {
    const { lowerBinId, upperBinId, totalXAmount, totalYAmount } = pos.positionData;
    console.log(`\n  ┌ 仓位: ${pos.publicKey.toBase58()}`);
    console.log(`  │ bin范围: [${lowerBinId}, ${upperBinId}]`);
    console.log(`  │ Token(最小单位): ${totalXAmount.toString()}`);
    console.log(`  └ SOL(lamports):  ${totalYAmount.toString()}`);
  }
  return userPositions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 入口
// ═══════════════════════════════════════════════════════════════════════════════
(async () => {
  const connection = new Connection(CONFIG.rpcUrl, "confirmed");
  const wallet = Keypair.fromSecretKey(bs58.decode(CONFIG.privateKey));
  console.log(`钱包: ${wallet.publicKey.toBase58()}`);

  // ── 先查看现有仓位 ──
  await printPositions(connection, wallet, CONFIG.poolAddress);

  // ── 选择场景 ──────────────────────────────────────────────────────────────
  // ★ 场景 A：往已有仓位追加（把 existingPositionAddress 填好）
  await addLiquidityToExistingPosition(
    connection,
    wallet,
    CONFIG.poolAddress,
    CONFIG.existingPositionAddress,
    CONFIG.addTokenAmount,
    CONFIG.addSolAmount,
    CONFIG.tokenDecimals,
    CONFIG.strategyType
  );

  // ★ 场景 B：在已有池子新开仓位（与场景A二选一，注释掉不用的那个）
  // await addLiquidityNewPosition(
  //   connection,
  //   wallet,
  //   CONFIG.poolAddress,
  //   CONFIG.addTokenAmount,
  //   CONFIG.addSolAmount,
  //   CONFIG.tokenDecimals,
  //   CONFIG.binRange,
  //   CONFIG.strategyType
  // );
})();
