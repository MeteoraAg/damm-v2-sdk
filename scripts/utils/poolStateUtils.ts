import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { CpAmm } from "../../src";
import { ClaimResult, PoolFeeData, TokenClaimSummary } from "./types";

export async function getPoolFees(cpAmm: CpAmm, poolAddress: string): Promise<{protocolAFee: BN, protocolBFee: BN}> {
  try {
    const poolState = await cpAmm.fetchPoolState(new PublicKey(poolAddress));
    return {
      protocolAFee: poolState.protocolAFee,
      protocolBFee: poolState.protocolBFee
    };
  } catch (error) {
    console.error(`Failed to fetch pool state for ${poolAddress}:`, error);
    return { protocolAFee: new BN(0), protocolBFee: new BN(0) };
  }
}

export function createClaimResult(
  pool: PoolFeeData,
  beforeFees: {protocolAFee: BN, protocolBFee: BN},
  afterFees: {protocolAFee: BN, protocolBFee: BN},
  signature: string,
  success: boolean,
  error?: string
): ClaimResult {
  const claimedA = beforeFees.protocolAFee.sub(afterFees.protocolAFee);
  const claimedB = beforeFees.protocolBFee.sub(afterFees.protocolBFee);
  
  return {
    poolAddress: pool.poolAddress,
    tokenAMint: pool.tokenAMint,
    tokenBMint: pool.tokenBMint,
    protocolAFeeBefore: beforeFees.protocolAFee.toString(),
    protocolBFeeBefore: beforeFees.protocolBFee.toString(),
    protocolAFeeAfter: afterFees.protocolAFee.toString(),
    protocolBFeeAfter: afterFees.protocolBFee.toString(),
    claimedAAmount: claimedA.toString(),
    claimedBAmount: claimedB.toString(),
    transactionSignature: signature,
    gasFeeLamports: 0,
    gasFeeSOL: 0,
    collectFeeMode: pool.collectFeeMode,
    timestamp: new Date().toISOString(),
    success,
    error
  };
}

export function updateTokenSummary(
  tokenSummaries: Map<string, TokenClaimSummary>,
  result: ClaimResult,
  originalPool: PoolFeeData,
  targetTokenMints: string[]
) {
  if (!result.success) return;

  const targetMintSet = new Set(targetTokenMints.map(mint => mint.toLowerCase()));
  const collectFeeMode = parseInt(result.collectFeeMode);
  const isATargetMint = targetMintSet.has(result.tokenAMint.toLowerCase());
  const isBTargetMint = targetMintSet.has(result.tokenBMint.toLowerCase());

  if (collectFeeMode === 0 && isATargetMint && !new BN(originalPool.protocolAFee).isZero()) {
    const existing = tokenSummaries.get(result.tokenAMint) || {
      tokenMint: result.tokenAMint,
      totalClaimedAmount: "0",
      poolsClaimed: 0,
      totalGasFeeLamports: 0,
      totalGasFeeSOL: 0
    };
    
    existing.totalClaimedAmount = new BN(existing.totalClaimedAmount)
      .add(new BN(originalPool.protocolAFee))
      .toString();
    existing.poolsClaimed++;
    existing.totalGasFeeLamports += result.gasFeeLamports;
    existing.totalGasFeeSOL += result.gasFeeSOL;
    
    tokenSummaries.set(result.tokenAMint, existing);
  }
  
  if (isBTargetMint && !new BN(originalPool.protocolBFee).isZero()) {
    const existing = tokenSummaries.get(result.tokenBMint) || {
      tokenMint: result.tokenBMint,
      totalClaimedAmount: "0",
      poolsClaimed: 0,
      totalGasFeeLamports: 0,
      totalGasFeeSOL: 0
    };
    
    existing.totalClaimedAmount = new BN(existing.totalClaimedAmount)
      .add(new BN(originalPool.protocolBFee))
      .toString();
    existing.poolsClaimed++;
    existing.totalGasFeeLamports += result.gasFeeLamports;
    existing.totalGasFeeSOL += result.gasFeeSOL;
    
    tokenSummaries.set(result.tokenBMint, existing);
  }
}

export function filterEligiblePools(pools: PoolFeeData[]): PoolFeeData[] {
  return pools.filter(pool => 
    pool.collectFeeMode === "1" && new BN(pool.protocolBFee).gt(new BN(0))
  );
}