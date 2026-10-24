/**
 * 创建 DLMM Token + SOL 池子
 *
 * 安装依赖：
 *   cd scripts && npm install
 *
 * 运行：
 *   node createPool.js
 *
 * 私钥格式：Solana CLI 默认的 JSON 数组文件（~/.config/solana/id.json）
 * 或把 WALLET_JSON_PATH 改为你自己的路径。
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { NATIVE_MINT } from '@solana/spl-token';
import DLMM, { StrategyType } from '@meteora-ag/dlmm';
import BN from 'bn.js';
import Decimal from 'decimal.js';
import { readFileSync } from 'fs';

// ═══════════════════════════════════════════════════════════════════════════════
// ★ 配置区
// ═══════════════════════════════════════════════════════════════════════════════
const CONFIG = {
  rpcUrl:         'https://api.mainnet-beta.solana.com',
  cluster:        'mainnet-beta',             // 'mainnet-beta' | 'devnet'

  walletJsonPath: '~/.config/solana/id.json', // 私钥 JSON 数组文件路径

  tokenMint:      'YOUR_TOKEN_MINT_ADDRESS',  // 新 Token 的 mint 地址
  tokenDecimals:  6,

  // 添加流动性数量
  tokenAmount:    10_000_000,   // 1000万 Token（不含小数位）
  solAmount:      0.01,         // 0.01 SOL

  // DLMM 参数
  pricePerToken:  0.001,        // 1 Token = 0.001 SOL
  binStep:        100,          // 每个 bin 价格间距，100 bps = 1%
  binRange:       34,           // 活跃 bin 上下各 34 个 bin ≈ ±40% 深度
};
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

/** 从人类可读价格计算 DLMM activeBinId */
function getActiveBinId(pricePerToken, tokenDecimals, binStep) {
  // rawBinPrice = pricePerToken * 10^solDecimals / 10^tokenDecimals
  const rawBinPrice = new Decimal(pricePerToken)
    .mul(Decimal.pow(10, 9))            // SOL decimals = 9
    .div(Decimal.pow(10, tokenDecimals));

  const binStepFactor = new Decimal(1).add(new Decimal(binStep).div(10000));
  return rawBinPrice.ln().div(binStepFactor.ln())
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
}

/** 发送单笔或多笔交易（SDK 有时返回 Transaction[]） */
async function sendAll(connection, txOrList, signers) {
  const list = Array.isArray(txOrList) ? txOrList : [txOrList];
  let lastSig = '';
  for (const tx of list) {
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash  = blockhash;
    tx.feePayer         = signers[0].publicKey;
    lastSig = await sendAndConfirmTransaction(connection, tx, signers, {
      commitment: 'confirmed',
    });
    console.log('  tx:', lastSig);
  }
  return lastSig;
}

// ─── 主逻辑 ───────────────────────────────────────────────────────────────────
const connection = new Connection(CONFIG.rpcUrl, 'confirmed');

// 加载钱包（JSON 数组格式）
const keyPath   = CONFIG.walletJsonPath.replace('~', process.env.HOME);
const secretKey = Uint8Array.from(JSON.parse(readFileSync(keyPath, 'utf-8')));
const wallet    = Keypair.fromSecretKey(secretKey);
console.log('钱包:', wallet.publicKey.toBase58());

// ── 1. 计算 activeBinId ──────────────────────────────────────────────────────
const activeBinId = getActiveBinId(
  CONFIG.pricePerToken,
  CONFIG.tokenDecimals,
  CONFIG.binStep
);
const priceMin = CONFIG.pricePerToken * Math.pow(1 + CONFIG.binStep / 10000, -CONFIG.binRange);
const priceMax = CONFIG.pricePerToken * Math.pow(1 + CONFIG.binStep / 10000,  CONFIG.binRange);
console.log(`activeBinId = ${activeBinId}`);
console.log(`价格区间: ${priceMin.toFixed(8)} ~ ${priceMax.toFixed(8)} SOL/Token`);

// ── 2. 选择 PresetParameter（决定费率，必须是链上已存在的账户）────────────────
const allPresets   = await DLMM.getAllPresetParameters(connection);
const matched      = allPresets.filter(p => p.account.binStep === CONFIG.binStep);
if (!matched.length) {
  const available = [...new Set(allPresets.map(p => p.account.binStep))].join(', ');
  throw new Error(`没有 binStep=${CONFIG.binStep} 的预设参数，可用: ${available}`);
}
// 取 baseFactor 最小的（费率最低）
const preset = matched.reduce((a, b) => a.account.baseFactor < b.account.baseFactor ? a : b);
console.log(`presetParameter: ${preset.publicKey.toBase58()} (baseFactor=${preset.account.baseFactor})`);

// ── 3. 建池 ──────────────────────────────────────────────────────────────────
console.log('\n正在建池...');
const { PublicKey } = await import('@solana/web3.js');
const tokenXMint = new PublicKey(CONFIG.tokenMint);

const createTx = await DLMM.createPermissionlessLbPair(
  connection,
  new BN(CONFIG.binStep),
  tokenXMint,   // tokenX = 新 Token
  NATIVE_MINT,  // tokenY = SOL (WSOL)
  new BN(activeBinId),
  preset.publicKey,
  wallet.publicKey,
  { cluster: CONFIG.cluster }
);

const createSig = await sendAll(connection, createTx, [wallet]);
console.log('建池成功:', createSig);

// ── 4. 连接到新池子 ───────────────────────────────────────────────────────────
const [lbPairAddress] = DLMM.deriveLbPair(
  tokenXMint,
  NATIVE_MINT,
  new BN(CONFIG.binStep),
  preset.publicKey
);
console.log('池子地址:', lbPairAddress.toBase58());

const dlmmPool = await DLMM.create(connection, lbPairAddress, {
  cluster: CONFIG.cluster,
});

// ── 5. 创建仓位并存入流动性 ───────────────────────────────────────────────────
const positionKeypair = Keypair.generate();
console.log('\n新仓位地址:', positionKeypair.publicKey.toBase58());

const totalXAmount = new BN(CONFIG.tokenAmount).mul(new BN(10 ** CONFIG.tokenDecimals));
const totalYAmount = new BN(Math.floor(CONFIG.solAmount * LAMPORTS_PER_SOL));
const minBinId     = activeBinId - CONFIG.binRange;
const maxBinId     = activeBinId + CONFIG.binRange;

const addLiqTx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
  positionPubKey: positionKeypair.publicKey,
  user:           wallet.publicKey,
  totalXAmount,
  totalYAmount,
  strategy: {
    maxBinId,
    minBinId,
    strategyType: StrategyType.SpotImbalanced,
  },
  slippage: 0,
});

const addSig = await sendAll(connection, addLiqTx, [wallet, positionKeypair]);

console.log('\n✅ 完成!');
console.log('池子地址:', lbPairAddress.toBase58());
console.log('仓位地址:', positionKeypair.publicKey.toBase58());
console.log('添加流动性 tx:', addSig);
