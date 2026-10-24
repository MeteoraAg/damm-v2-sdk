/**
 * DLMM 追加流动性
 *
 * 场景 A：往已有仓位追加  → 设置 SCENE = 'A'
 * 场景 B：在已有池子新开仓位 → 设置 SCENE = 'B'
 *
 * 运行：
 *   node addLiquidity.js
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import DLMM, { StrategyType } from '@meteora-ag/dlmm';
import BN from 'bn.js';
import { readFileSync } from 'fs';

// ═══════════════════════════════════════════════════════════════════════════════
// ★ 配置区
// ═══════════════════════════════════════════════════════════════════════════════
const SCENE = 'A'; // 'A' = 往已有仓位追加 | 'B' = 新开仓位

const CONFIG = {
  rpcUrl:         'https://api.mainnet-beta.solana.com',
  cluster:        'mainnet-beta',

  walletJsonPath: '~/.config/solana/id.json',

  // 池子地址（建池时得到）
  poolAddress:    'YOUR_LB_PAIR_ADDRESS',

  // 场景 A：已有仓位地址
  positionAddress:'YOUR_POSITION_ADDRESS',

  tokenDecimals:  6,

  // 追加数量（哪个不加就填 0）
  addTokenAmount: 5_000_000,  // 追加 500万 Token
  addSolAmount:   0,          // 不追加 SOL

  // 场景 B 专用：新仓位 bin 范围（以当前 activeBin 为中心）
  binRange:       34,

  strategyType:   StrategyType.SpotImbalanced,
};
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 工具：发送单笔或多笔交易 ─────────────────────────────────────────────────
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

// ─── 场景 A：往已有仓位追加 ───────────────────────────────────────────────────
async function sceneA(connection, wallet, dlmmPool) {
  console.log('\n═══ 场景 A：追加到已有仓位 ═══');
  console.log('仓位:', CONFIG.positionAddress);

  // 读取仓位的 bin 范围
  const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(wallet.publicKey);
  const target = userPositions.find(p => p.publicKey.toBase58() === CONFIG.positionAddress);
  if (!target) {
    throw new Error(`仓位 ${CONFIG.positionAddress} 不存在或不属于当前钱包`);
  }

  const { lowerBinId, upperBinId } = target.positionData;
  const activeBin = await dlmmPool.getActiveBin();
  console.log(`bin 范围: [${lowerBinId}, ${upperBinId}]  activeBin: ${activeBin.binId}  价格: ${activeBin.price}`);
  console.log(`追加: Token=${CONFIG.addTokenAmount}  SOL=${CONFIG.addSolAmount}`);

  const totalXAmount = new BN(CONFIG.addTokenAmount).mul(new BN(10 ** CONFIG.tokenDecimals));
  const totalYAmount = new BN(Math.floor(CONFIG.addSolAmount * LAMPORTS_PER_SOL));

  // addLiquidityByStrategy = 追加到已有仓位，不新建
  // initializePositionAndAddLiquidityByStrategy = 新建仓位（场景 B）
  const tx = await dlmmPool.addLiquidityByStrategy({
    positionPubKey: target.publicKey,
    user:           wallet.publicKey,
    totalXAmount,
    totalYAmount,
    strategy: {
      maxBinId:     upperBinId,
      minBinId:     lowerBinId,
      strategyType: CONFIG.strategyType,
    },
    slippage: 0,
  });

  const sig = await sendAll(connection, tx, [wallet]);
  console.log('✅ 追加成功:', sig);
  return sig;
}

// ─── 场景 B：新开仓位并添加流动性 ────────────────────────────────────────────
async function sceneB(connection, wallet, dlmmPool) {
  console.log('\n═══ 场景 B：新开仓位 ═══');

  const activeBin   = await dlmmPool.getActiveBin();
  const currentBinId = activeBin.binId;
  const minBinId    = currentBinId - CONFIG.binRange;
  const maxBinId    = currentBinId + CONFIG.binRange;
  console.log(`activeBin: ${currentBinId}  价格: ${activeBin.price} SOL/Token`);
  console.log(`新仓位 bin 范围: [${minBinId}, ${maxBinId}]`);
  console.log(`添加: Token=${CONFIG.addTokenAmount}  SOL=${CONFIG.addSolAmount}`);

  const totalXAmount  = new BN(CONFIG.addTokenAmount).mul(new BN(10 ** CONFIG.tokenDecimals));
  const totalYAmount  = new BN(Math.floor(CONFIG.addSolAmount * LAMPORTS_PER_SOL));
  const positionKeypair = Keypair.generate();
  console.log('新仓位地址:', positionKeypair.publicKey.toBase58());

  const tx = await dlmmPool.initializePositionAndAddLiquidityByStrategy({
    positionPubKey: positionKeypair.publicKey,
    user:           wallet.publicKey,
    totalXAmount,
    totalYAmount,
    strategy: {
      maxBinId,
      minBinId,
      strategyType: CONFIG.strategyType,
    },
    slippage: 0,
  });

  // 注意：新开仓位时 positionKeypair 必须参与签名
  const sig = await sendAll(connection, tx, [wallet, positionKeypair]);
  console.log('✅ 新仓位创建成功:', positionKeypair.publicKey.toBase58());
  console.log('   tx:', sig);
  return { sig, positionAddress: positionKeypair.publicKey.toBase58() };
}

// ─── 主逻辑 ───────────────────────────────────────────────────────────────────
const connection = new Connection(CONFIG.rpcUrl, 'confirmed');
const keyPath    = CONFIG.walletJsonPath.replace('~', process.env.HOME);
const secretKey  = Uint8Array.from(JSON.parse(readFileSync(keyPath, 'utf-8')));
const wallet     = Keypair.fromSecretKey(secretKey);
console.log('钱包:', wallet.publicKey.toBase58());

// 加载池子
const { PublicKey } = await import('@solana/web3.js');
const dlmmPool = await DLMM.create(connection, new PublicKey(CONFIG.poolAddress), {
  cluster: CONFIG.cluster,
});

// 打印当前仓位列表
const { userPositions } = await dlmmPool.getPositionsByUserAndLbPair(wallet.publicKey);
const activeBin = await dlmmPool.getActiveBin();
console.log(`\n当前池子仓位数: ${userPositions.length}  activeBin: ${activeBin.binId}  价格: ${activeBin.price}`);
for (const pos of userPositions) {
  const { lowerBinId, upperBinId, totalXAmount, totalYAmount } = pos.positionData;
  console.log(`  ${pos.publicKey.toBase58()}  bin:[${lowerBinId},${upperBinId}]  Token:${totalXAmount}  SOL(lamports):${totalYAmount}`);
}

// 执行选定场景
if (SCENE === 'A') {
  await sceneA(connection, wallet, dlmmPool);
} else {
  await sceneB(connection, wallet, dlmmPool);
}
