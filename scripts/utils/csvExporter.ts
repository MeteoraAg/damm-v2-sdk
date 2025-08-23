import * as fs from "fs";
import BN from "bn.js";
import { ComprehensiveClaimSummary, PoolFeeData } from "./types";

export function exportEligiblePools(pools: PoolFeeData[], targetTokenMints: string[]): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetMintSet = new Set(targetTokenMints.map(mint => mint.toLowerCase()));
  
  const header = "pool_address,token_a_mint,token_b_mint,protocol_fee_a_amount,protocol_fee_b_amount,collect_fee_mode,claimable_a,claimable_b,is_a_target_mint,is_b_target_mint,generation_timestamp\n";
  
  const sortedPools = pools.sort((a, b) => a.poolAddress.localeCompare(b.poolAddress));
  
  const rows = sortedPools.map(pool => {
    const isATargetMint = targetMintSet.has(pool.tokenAMint.toLowerCase());
    const isBTargetMint = targetMintSet.has(pool.tokenBMint.toLowerCase());
    const collectFeeMode = parseInt(pool.collectFeeMode);
    
    let claimableA = false;
    let claimableB = false;
    
    if (collectFeeMode === 0) {
      claimableA = isATargetMint && !new BN(pool.protocolAFee).isZero();
      claimableB = isBTargetMint && !new BN(pool.protocolBFee).isZero();
    } else if (collectFeeMode === 1) {
      claimableA = false;
      claimableB = isBTargetMint && !new BN(pool.protocolBFee).isZero();
    }
    
    return `${pool.poolAddress},${pool.tokenAMint},${pool.tokenBMint},${pool.protocolAFee},${pool.protocolBFee},${pool.collectFeeMode},${claimableA},${claimableB},${isATargetMint},${isBTargetMint},${timestamp}`;
  }).join("\n");
  
  const filename = `eligible_pools_for_claiming_${timestamp}.csv`;
  fs.writeFileSync(filename, header + rows);
  
  console.log(`📄 Exported ${pools.length} eligible pools to: ${filename}`);
  return filename;
}

export function exportClaimResults(summary: ComprehensiveClaimSummary, outputPrefix = "comprehensive_claim") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  
  const detailsHeader = "pool_address,token_a_mint,token_b_mint,protocol_fee_a_before,protocol_fee_b_before,protocol_fee_a_after,protocol_fee_b_after,claimed_a_amount,claimed_b_amount,transaction_signature,gas_fee_lamports,gas_fee_sol,collect_fee_mode,timestamp,success,error\n";
  const detailsRows = summary.claimResults.map(result => 
    `${result.poolAddress},${result.tokenAMint},${result.tokenBMint},${result.protocolAFeeBefore},${result.protocolBFeeBefore},${result.protocolAFeeAfter},${result.protocolBFeeAfter},${result.claimedAAmount},${result.claimedBAmount},${result.transactionSignature},${result.gasFeeLamports},${result.gasFeeSOL},${result.collectFeeMode},${result.timestamp},${result.success},${result.error || ""}`
  ).join("\n");
  
  const summaryHeader = "token_mint,total_claimed_amount,pools_claimed,total_gas_fee_lamports,total_gas_fee_sol\n";
  const summaryRows = summary.tokenSummaries.map(token =>
    `${token.tokenMint},${token.totalClaimedAmount},${token.poolsClaimed},${token.totalGasFeeLamports},${token.totalGasFeeSOL}`
  ).join("\n");
  
  const overallSummary = {
    totalPoolsEligible: summary.totalPoolsEligible,
    totalPoolsClaimed: summary.totalPoolsClaimed,
    totalPoolsFailed: summary.totalPoolsFailed,
    totalGasFeeLamports: summary.totalGasFeeLamports,
    totalGasFeeSOL: summary.totalGasFeeSOL,
    startTime: summary.startTime,
    endTime: summary.endTime,
    durationSeconds: summary.durationSeconds
  };
  
  const detailsFile = `${outputPrefix}_details_${timestamp}.csv`;
  const summaryFile = `${outputPrefix}_tokens_${timestamp}.csv`;
  const overallFile = `${outputPrefix}_summary_${timestamp}.json`;
  
  fs.writeFileSync(detailsFile, detailsHeader + detailsRows);
  fs.writeFileSync(summaryFile, summaryHeader + summaryRows);
  fs.writeFileSync(overallFile, JSON.stringify(overallSummary, null, 2));
  
  console.log(`📄 Results exported: ${detailsFile}, ${summaryFile}, ${overallFile}`);
  return { detailsFile, summaryFile, overallFile };
}

export function displayClaimSummary(pools: PoolFeeData[], targetTokenMints: string[]) {
  const targetMintSet = new Set(targetTokenMints.map(mint => mint.toLowerCase()));
  
  const poolsWithClaimableA = pools.filter(pool => {
    const isATargetMint = targetMintSet.has(pool.tokenAMint.toLowerCase());
    const collectFeeMode = parseInt(pool.collectFeeMode);
    return collectFeeMode === 0 && isATargetMint && !new BN(pool.protocolAFee).isZero();
  }).length;
  
  const poolsWithClaimableB = pools.filter(pool => {
    const isBTargetMint = targetMintSet.has(pool.tokenBMint.toLowerCase());
    return isBTargetMint && !new BN(pool.protocolBFee).isZero();
  }).length;
  
  const tokenTotals = new Map<string, BN>();
  pools.forEach(pool => {
    const isATargetMint = targetMintSet.has(pool.tokenAMint.toLowerCase());
    const isBTargetMint = targetMintSet.has(pool.tokenBMint.toLowerCase());
    const collectFeeMode = parseInt(pool.collectFeeMode);
    
    if (collectFeeMode === 0 && isATargetMint) {
      const current = tokenTotals.get(pool.tokenAMint) || new BN(0);
      tokenTotals.set(pool.tokenAMint, current.add(new BN(pool.protocolAFee)));
    }
    
    if (isBTargetMint) {
      const current = tokenTotals.get(pool.tokenBMint) || new BN(0);
      tokenTotals.set(pool.tokenBMint, current.add(new BN(pool.protocolBFee)));
    }
  });
  
  console.log(`📊 ${pools.length} eligible pools (${poolsWithClaimableA} A-token, ${poolsWithClaimableB} B-token)`);
  
  console.log("\n💰 Claimable amounts by token:");
  Array.from(tokenTotals.entries())
    .sort(([,a], [,b]) => b.cmp(a))
    .slice(0, 10)
    .forEach(([mint, amount]) => {
      console.log(`${mint}: ${amount.toString()}`);
    });
}