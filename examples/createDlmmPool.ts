/**
 * createDlmmPool — 创建 Meteora DLMM Token + SOL 池子
 *
 * 策略：集中流动性到活跃价格附近
 *   - 大量 Token 放在活跃 bin 及以上（卖出深度）
 *   - 少量 SOL   放在活跃 bin 及以下（买入深度）
 *
 * 典型参数：0.01 SOL + 1000万 Token，价格 0.001 SOL/Token
 * 效果：
 *   - 链上显示卖出深度 ≈ 1000万 Token = 10000 SOL 等值
 *   - 实际投入 SOL 只有 0.01
 *
 * 依赖：npm install @meteora-ag/dlmm
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import DLMM, { StrategyType } from "@meteora-ag/dlmm";
import { NATIVE_MINT } from "@solana/spl-token";
import Decimal from "decimal.js";

// ─── 工具：根据 binStep 和人类可读价格计算 activeBinId ────────────────────────
function getActiveBinIdFromPrice(
  pricePerToken: number, // 1 Token = ? SOL
  tokenDecimals: number,
  binStep: number // bps, 100 = 1%
): number {
  const SOL_DECIMALS = 9;
  // 将「人类可读价格」换算为 DLMM 内部 bin 价格（不含小数位偏移）
  // rawBinPrice = pricePerToken * 10^solDecimals / 10^tokenDecimals
  const rawBinPrice = new Decimal(pricePerToken)
    .mul(Decimal.pow(10, SOL_DECIMALS))
    .div(Decimal.pow(10, tokenDecimals));

  // binId = log(rawBinPrice) / log(1 + binStep/10000)
  const binStepFactor = new Decimal(1).add(
    new Decimal(binStep).div(10000)
  );
  const binId = rawBinPrice
    .ln()
    .div(binStepFactor.ln())
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();

  return binId;
}

// ─── 主函数 ───────────────────────────────────────────────────────────────────

/**
 * 创建 DLMM Token + SOL 池子（大流动性，小SOL）
 *
 * @param rpcUrl          RPC URL
 * @param wallet          操作钱包
 * @param tokenMint       Token mint（新发行的 Token）
 * @param tokenAmount     Token 数量（不含小数位，例如 10_000_000 = 1000万）
 * @param solAmount       SOL 数量（例如 0.01）
 * @param tokenDecimals   Token 小数位，默认 6
 * @param pricePerToken   初始价格：1 Token = ? SOL，默认 0.001
 * @param binStep         每个 bin 的价格间距（bps），100 = 1%，默认 100
 * @param binRange        活跃 bin 上下各延伸多少 bin，默认 34
 *                        上方 34 bins × 1% ≈ 40% 卖出深度范围
 *                        下方 34 bins × 1% ≈ 29% 买入深度范围（几乎全由 SOL 决定）
 */
export async function createDlmmPool(
  rpcUrl: string,
  wallet: Keypair,
  tokenMint: string,
  tokenAmount: number,
  solAmount: number,
  tokenDecimals: number = 6,
  pricePerToken: number = 0.001,
  binStep: number = 100,
  binRange: number = 34
): Promise<{
  pool: string;
  position: string;
  positionKeypair: Keypair;
  activeBinId: number;
  createPoolSignature: string;
  addLiquiditySignature: string;
}> {
  const connection = new Connection(rpcUrl, "confirmed");

  // tokenX = 新 Token，tokenY = SOL(WSOL)
  // 价格方向：price = tokenY / tokenX = SOL per Token = 0.001
  const tokenXMint = new PublicKey(tokenMint); // 新 Token
  const tokenYMint = NATIVE_MINT; // WSOL

  // ── 1. 计算 activeBinId ────────────────────────────────────────────────────
  const activeBinId = getActiveBinIdFromPrice(
    pricePerToken,
    tokenDecimals,
    binStep
  );

  console.log(`[DLMM] activeBinId = ${activeBinId}`);
  console.log(
    `[DLMM] 价格范围: ${(pricePerToken * Math.pow(1 + binStep / 10000, -binRange)).toFixed(8)} ~ ${(pricePerToken * Math.pow(1 + binStep / 10000, binRange)).toFixed(8)} SOL/Token`
  );

  // ── 2. 查找匹配 binStep 的 PresetParameter（决定池子手续费） ──────────────
  // PresetParameter 是 Meteora 预设的费率配置账户，必须选一个链上已存在的
  const allPresetParams = await DLMM.getAllPresetParameters(connection);

  // 优先找 binStep 完全匹配的；多个时选 baseFactor 最小的（费率最低）
  const matchedParams = allPresetParams.filter(
    (p) => p.account.binStep === binStep
  );
  if (matchedParams.length === 0) {
    throw new Error(
      `未找到 binStep=${binStep} 的 PresetParameter。` +
        `可用 binStep 列表: ${[...new Set(allPresetParams.map((p) => p.account.binStep))].join(", ")}`
    );
  }
  // baseFactor 越小 → 费率越低；取费率最低的
  const presetParam = matchedParams.reduce((min, cur) =>
    cur.account.baseFactor < min.account.baseFactor ? cur : min
  );
  console.log(
    `[DLMM] presetParameter = ${presetParam.publicKey.toBase58()}, baseFactor = ${presetParam.account.baseFactor}`
  );

  // ── 3. 创建 DLMM 池子 ──────────────────────────────────────────────────────
  const createPoolTx = await DLMM.createPermissionlessLbPair(
    connection,
    new BN(binStep),
    tokenXMint,
    tokenYMint,
    new BN(activeBinId),
    presetParam.publicKey,
    wallet.publicKey,
    { cluster: "mainnet-beta" } // 按需改为 "devnet"
  );

  createPoolTx.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;
  createPoolTx.feePayer = wallet.publicKey;

  const createPoolSignature = await sendAndConfirmTransaction(
    connection,
    createPoolTx,
    [wallet],
    { commitment: "confirmed" }
  );
  console.log(`[DLMM] 建池成功: ${createPoolSignature}`);

  // ── 4. 连接到刚建好的池子 ──────────────────────────────────────────────────
  // deriveLbPair 返回 PDA 地址（与建池时相同的派生逻辑）
  const [lbPairAddress] = DLMM.deriveLbPair(
    tokenXMint,
    tokenYMint,
    new BN(binStep),
    presetParam.publicKey
  );
  const dlmmPool = await DLMM.create(connection, lbPairAddress, {
    cluster: "mainnet-beta",
  });
  console.log(`[DLMM] 池子地址: ${lbPairAddress.toBase58()}`);

  // ── 5. 创建仓位并添加流动性 ────────────────────────────────────────────────
  const positionKeypair = Keypair.generate();

  // Token 数量（含小数位）
  const totalXAmount = new BN(tokenAmount).mul(
    new BN(10 ** tokenDecimals)
  );
  // SOL 数量（lamports）
  const totalYAmount = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));

  // bin 范围
  const minBinId = activeBinId - binRange; // 买入侧（SOL 区间）
  const maxBinId = activeBinId + binRange; // 卖出侧（Token 区间）

  // SpotImbalanced 策略：
  //   - Token(X) 自动分配到 activeBin 及以上的 bins（卖出深度）
  //   - SOL(Y)   自动分配到 activeBin 及以下的 bins（买入深度）
  //   - 两者比例由 totalXAmount / totalYAmount 决定，不要求等值
  const addLiquidityTx =
    await dlmmPool.initializePositionAndAddLiquidityByStrategy({
      positionPubKey: positionKeypair.publicKey,
      user: wallet.publicKey,
      totalXAmount,
      totalYAmount,
      strategy: {
        maxBinId,
        minBinId,
        strategyType: StrategyType.SpotImbalanced,
      },
      slippage: 0,
    });

  // initializePositionAndAddLiquidityByStrategy 可能返回数组（分批交易）
  const txList = Array.isArray(addLiquidityTx)
    ? addLiquidityTx
    : [addLiquidityTx];

  let addLiquiditySignature = "";
  for (const tx of txList) {
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = wallet.publicKey;
    addLiquiditySignature = await sendAndConfirmTransaction(
      connection,
      tx,
      [wallet, positionKeypair],
      { commitment: "confirmed" }
    );
  }
  console.log(`[DLMM] 添加流动性成功: ${addLiquiditySignature}`);

  // ── 6. 查询最终仓位深度（可选验证） ───────────────────────────────────────
  const activeBin = await dlmmPool.getActiveBin();
  console.log(
    `[DLMM] 当前 activeBin: id=${activeBin.binId}, price=${activeBin.price}`
  );

  return {
    pool: lbPairAddress.toBase58(),
    position: positionKeypair.publicKey.toBase58(),
    positionKeypair,
    activeBinId,
    createPoolSignature,
    addLiquiditySignature,
  };
}

// ─── 示例调用 ─────────────────────────────────────────────────────────────────
// (async () => {
//   const wallet = Keypair.fromSecretKey(/* your key */);
//   const result = await createDlmmPool(
//     "https://api.mainnet-beta.solana.com",
//     wallet,
//     "YourTokenMintAddress...",
//     10_000_000,  // 1000万 Token
//     0.01,        // 0.01 SOL
//     6,           // token decimals
//     0.001,       // 初始价格 0.001 SOL/Token
//     100,         // binStep 1%
//     34           // ±34 bins ≈ ±40% 深度范围
//   );
//   console.log(result);
// })();
