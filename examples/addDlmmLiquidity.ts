/**
 * DLMM 追加流动性
 *
 * 两种场景：
 *   A. addLiquidityToExistingPosition — 往「已有仓位」追加
 *   B. addLiquidityNewPosition        — 在「已有池子」新开一个仓位并追加
 *
 * 依赖：npm install @meteora-ag/dlmm
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

// ─── 工具：发送单笔或多笔交易（SDK 有时返回 Transaction[]）────────────────────
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
    console.log(`[DLMM] tx: ${lastSig}`);
  }
  return lastSig;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 A：往「已有仓位」追加流动性
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 向已有 DLMM 仓位追加流动性
 *
 * @param rpcUrl          RPC URL
 * @param wallet          操作钱包（必须是仓位 owner）
 * @param poolAddress     池子地址（lbPair）
 * @param positionAddress 仓位地址（已有的 position pubkey）
 * @param tokenAmount     追加 Token 数量（不含小数位），传 0 则只加 SOL
 * @param solAmount       追加 SOL 数量，传 0 则只加 Token
 * @param tokenDecimals   Token 小数位，默认 6
 * @param strategyType    流动性分布策略，默认 SpotImbalanced
 *
 * 注意：bin 范围复用仓位已有的 minBinId / maxBinId，保持价格区间不变
 */
export async function addLiquidityToExistingPosition(
  rpcUrl: string,
  wallet: Keypair,
  poolAddress: string,
  positionAddress: string,
  tokenAmount: number,
  solAmount: number,
  tokenDecimals: number = 6,
  strategyType: StrategyType = StrategyType.SpotImbalanced
): Promise<{ signature: string; positionAddress: string }> {
  const connection = new Connection(rpcUrl, "confirmed");

  // ── 1. 加载池子 & 仓位状态 ─────────────────────────────────────────────────
  const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
    cluster: "mainnet-beta",
  });

  // 查询当前仓位，拿到它的 minBinId / maxBinId
  const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(
    wallet.publicKey
  );
  const targetPosition = userPositions.find(
    (p) => p.publicKey.toBase58() === positionAddress
  );
  if (!targetPosition) {
    throw new Error(
      `仓位 ${positionAddress} 不存在或不属于当前钱包`
    );
  }

  const { lowerBinId, upperBinId } = targetPosition.positionData;
  const activeBin = await dlmmPool.getActiveBin();

  console.log(
    `[DLMM] 追加到仓位 ${positionAddress}`
  );
  console.log(
    `[DLMM] bin 范围: [${lowerBinId}, ${upperBinId}], 当前 activeBin: ${activeBin.binId}`
  );

  // ── 2. 构造追加数量 ────────────────────────────────────────────────────────
  const totalXAmount = new BN(tokenAmount).mul(new BN(10 ** tokenDecimals));
  const totalYAmount = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));

  console.log(
    `[DLMM] 追加: Token=${tokenAmount}, SOL=${solAmount}`
  );

  // ── 3. 调用 addLiquidityByStrategy（复用已有仓位，不新建）──────────────────
  // 区别于 initializePositionAndAddLiquidityByStrategy（那个会新建仓位）
  const addLiqTx = await dlmmPool.addLiquidityByStrategy({
    positionPubKey: new PublicKey(positionAddress),
    user: wallet.publicKey,
    totalXAmount,
    totalYAmount,
    strategy: {
      maxBinId: upperBinId,
      minBinId: lowerBinId,
      strategyType,
    },
    slippage: 0,
  });

  // ── 4. 发送交易 ────────────────────────────────────────────────────────────
  const signature = await sendTxOrList(connection, addLiqTx, [wallet]);
  console.log(`[DLMM] 追加流动性成功: ${signature}`);

  return { signature, positionAddress };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 场景 B：在「已有池子」新开仓位并追加流动性
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 在已有 DLMM 池子中新建仓位并添加流动性
 *
 * 适用场景：
 *   - 需要不同 bin 范围的第二个仓位
 *   - 原仓位 bin 范围已不覆盖当前价格
 *   - 多钱包共同做市时各自建仓
 *
 * @param rpcUrl        RPC URL
 * @param wallet        操作钱包
 * @param poolAddress   池子地址（lbPair）
 * @param tokenAmount   Token 数量（不含小数位），传 0 则只加 SOL
 * @param solAmount     SOL 数量，传 0 则只加 Token
 * @param tokenDecimals Token 小数位，默认 6
 * @param binRange      在当前 activeBin 上下各延伸多少 bin，默认 34
 *                      若想只加 Token（不含 SOL）：把 minBinId 设为 activeBinId（去掉负向区间）
 * @param strategyType  流动性分布策略，默认 SpotImbalanced
 */
export async function addLiquidityNewPosition(
  rpcUrl: string,
  wallet: Keypair,
  poolAddress: string,
  tokenAmount: number,
  solAmount: number,
  tokenDecimals: number = 6,
  binRange: number = 34,
  strategyType: StrategyType = StrategyType.SpotImbalanced
): Promise<{
  signature: string;
  positionAddress: string;
  positionKeypair: Keypair;
  minBinId: number;
  maxBinId: number;
}> {
  const connection = new Connection(rpcUrl, "confirmed");

  // ── 1. 加载池子，拿到当前 activeBin ────────────────────────────────────────
  const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
    cluster: "mainnet-beta",
  });
  const activeBin = await dlmmPool.getActiveBin();
  const currentBinId = activeBin.binId;

  // bin 范围以「当前价格」为中心展开
  const minBinId = currentBinId - binRange;
  const maxBinId = currentBinId + binRange;

  console.log(
    `[DLMM] 池子: ${poolAddress}`
  );
  console.log(
    `[DLMM] activeBin=${currentBinId}, 新仓位 bin 范围: [${minBinId}, ${maxBinId}]`
  );
  console.log(
    `[DLMM] 当前价格: ${activeBin.price} SOL/Token`
  );

  // ── 2. 构造数量 ────────────────────────────────────────────────────────────
  const totalXAmount = new BN(tokenAmount).mul(new BN(10 ** tokenDecimals));
  const totalYAmount = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));

  // ── 3. 新建仓位 Keypair ────────────────────────────────────────────────────
  const positionKeypair = Keypair.generate();

  console.log(
    `[DLMM] 新仓位 pubkey: ${positionKeypair.publicKey.toBase58()}`
  );

  // ── 4. 新建仓位并添加流动性（两步合一）────────────────────────────────────
  const addLiqTx =
    await dlmmPool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: positionKeypair.publicKey,
      user: wallet.publicKey,
      totalXAmount,
      totalYAmount,
      strategy: {
        maxBinId,
        minBinId,
        strategyType,
      },
      slippage: 0,
    });

  // ── 5. 发送（注意：positionKeypair 也需要签名）──────────────────────────────
  const signature = await sendTxOrList(connection, addLiqTx, [
    wallet,
    positionKeypair,
  ]);
  console.log(`[DLMM] 新仓位 + 流动性添加成功: ${signature}`);

  return {
    signature,
    positionAddress: positionKeypair.publicKey.toBase58(),
    positionKeypair,
    minBinId,
    maxBinId,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 附：查询仓位信息（调用前可先确认 bin 范围是否合理）
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 查询钱包在某个池子的所有仓位信息
 */
export async function getDlmmPositions(
  rpcUrl: string,
  wallet: Keypair,
  poolAddress: string
) {
  const connection = new Connection(rpcUrl, "confirmed");
  const dlmmPool = await DLMM.create(connection, new PublicKey(poolAddress), {
    cluster: "mainnet-beta",
  });

  const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(
    wallet.publicKey
  );
  const activeBin = await dlmmPool.getActiveBin();

  console.log(`[DLMM] 池子: ${poolAddress}`);
  console.log(`[DLMM] 当前 activeBin: ${activeBin.binId} (price=${activeBin.price})`);
  console.log(`[DLMM] 仓位数量: ${userPositions.length}`);

  for (const pos of userPositions) {
    const { lowerBinId, upperBinId, totalXAmount, totalYAmount } =
      pos.positionData;
    console.log(`  仓位: ${pos.publicKey.toBase58()}`);
    console.log(
      `    bin范围: [${lowerBinId}, ${upperBinId}] | Token: ${totalXAmount.toString()} | SOL(lamports): ${totalYAmount.toString()}`
    );
  }

  return userPositions;
}

// ─── 示例调用 ─────────────────────────────────────────────────────────────────
// (async () => {
//   const wallet = Keypair.fromSecretKey(/* your key */);
//
//   // 场景 A：往已有仓位追加
//   await addLiquidityToExistingPosition(
//     "https://api.mainnet-beta.solana.com",
//     wallet,
//     "池子地址...",
//     "仓位地址...",
//     5_000_000, // 追加 500万 Token
//     0,         // 不追加 SOL
//     6
//   );
//
//   // 场景 B：在已有池子新开仓位
//   await addLiquidityNewPosition(
//     "https://api.mainnet-beta.solana.com",
//     wallet,
//     "池子地址...",
//     5_000_000, // 500万 Token
//     0.005,     // 0.005 SOL
//     6,
//     34         // ±34 bins
//   );
// })();
