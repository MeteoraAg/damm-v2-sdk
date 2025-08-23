import {
  Connection,
} from "@solana/web3.js";
import { CpAmm } from "../src";
import BN from "bn.js";

interface PoolFeeData {
  poolAddress: string;
  tokenAMint: string;
  tokenBMint: string;
  protocolAFee: string;
  protocolBFee: string;
  totalProtocolFee: string;
  collectFeeMode: string;
}

interface TokenFeeAccumulator {
  [tokenMint: string]: {
    totalFee: string;
    poolCount: number;
  };
}

interface ProtocolFeeSummary {
  totalPools: number;
  poolsWithFees: number;
  feesByTokenMint: TokenFeeAccumulator;
  pools: PoolFeeData[];
}

async function getProtocolFeesByTokenMints(
  rpc: string,
  targetTokenMints: string[],
  claimableOnly: boolean = false,
  blacklistedTokens: string[] = [],
): Promise<ProtocolFeeSummary> {
  console.log(">>> Connecting to Solana RPC...");
  const connection = new Connection(rpc);
  const cpAmm = new CpAmm(connection);

  console.log(">>> Fetching all pools...");
  const allPools = await cpAmm.getAllPools();
  console.log(`Found ${allPools.length} total pools`);

  // Convert target mints and blacklisted mints to Set for faster lookup
  const targetMintSet = new Set(targetTokenMints.map(mint => mint.toLowerCase()));
  const blacklistMintSet = new Set(blacklistedTokens.map(mint => mint.toLowerCase()));

  console.log(`>>> Filtering pools by token mints: ${targetTokenMints.join(", ")}`);
  if (blacklistedTokens.length > 0) {
    console.log(`>>> Excluding pools with blacklisted tokens: ${blacklistedTokens.join(", ")}`);
  }
  if (claimableOnly) {
    console.log(">>> Applying claimable-only filter based on collectFeeMode");
  }
  
  const filteredPools = allPools.filter(pool => {
    const tokenAMintStr = pool.account.tokenAMint.toBase58().toLowerCase();
    const tokenBMintStr = pool.account.tokenBMint.toBase58().toLowerCase();
    const collectFeeMode = pool.account.collectFeeMode;
    
    // First check blacklist - exclude pool if either token is blacklisted
    if (blacklistMintSet.has(tokenAMintStr) || blacklistMintSet.has(tokenBMintStr)) {
      return false;
    }
    
    if (claimableOnly) {
      // collectFeeMode = 0 (BothToken): Both token A and B must be in target mints
      // collectFeeMode = 1 (OnlyB): Only token B must be in target mints
      if (collectFeeMode === 0) {
        return targetMintSet.has(tokenAMintStr) && targetMintSet.has(tokenBMintStr);
      } else if (collectFeeMode === 1) {
        return targetMintSet.has(tokenBMintStr);
      }
      return false;
    } else {
      // Original behavior: include if either token matches
      return targetMintSet.has(tokenAMintStr) || targetMintSet.has(tokenBMintStr);
    }
  });

  console.log(`Found ${filteredPools.length} pools matching specified token mints`);

  let poolsWithFees = 0;
  const feesByTokenMint: TokenFeeAccumulator = {};
  // Track unique pools per token to avoid double counting
  const poolsPerToken: { [tokenMint: string]: Set<string> } = {};

  const poolsData: PoolFeeData[] = filteredPools.map(pool => {
    const protocolAFee = pool.account.protocolAFee;
    const protocolBFee = pool.account.protocolBFee;
    const tokenAMint = pool.account.tokenAMint.toBase58();
    const tokenBMint = pool.account.tokenBMint.toBase58();
    const poolAddress = pool.publicKey.toBase58();
    const collectFeeMode = pool.account.collectFeeMode;

    if (!protocolAFee.isZero() || !protocolBFee.isZero()) {
      poolsWithFees++;
    }

    // Aggregate fees based on claimableOnly flag and collectFeeMode
    if (claimableOnly) {
      // Only count fees that are actually claimable based on collectFeeMode
      if (collectFeeMode === 0) {
        // BothToken mode: both A and B fees are claimable if both tokens are targets
        if (targetMintSet.has(tokenAMint.toLowerCase()) && !protocolAFee.isZero()) {
          if (!feesByTokenMint[tokenAMint]) {
            feesByTokenMint[tokenAMint] = { totalFee: "0", poolCount: 0 };
            poolsPerToken[tokenAMint] = new Set();
          }
          const currentTotal = new BN(feesByTokenMint[tokenAMint].totalFee);
          feesByTokenMint[tokenAMint].totalFee = currentTotal.add(protocolAFee).toString();
          poolsPerToken[tokenAMint].add(poolAddress);
        }
        if (targetMintSet.has(tokenBMint.toLowerCase()) && !protocolBFee.isZero()) {
          if (!feesByTokenMint[tokenBMint]) {
            feesByTokenMint[tokenBMint] = { totalFee: "0", poolCount: 0 };
            poolsPerToken[tokenBMint] = new Set();
          }
          const currentTotal = new BN(feesByTokenMint[tokenBMint].totalFee);
          feesByTokenMint[tokenBMint].totalFee = currentTotal.add(protocolBFee).toString();
          poolsPerToken[tokenBMint].add(poolAddress);
        }
      } else if (collectFeeMode === 1) {
        // OnlyB mode: only B fees are claimable
        if (targetMintSet.has(tokenBMint.toLowerCase()) && !protocolBFee.isZero()) {
          if (!feesByTokenMint[tokenBMint]) {
            feesByTokenMint[tokenBMint] = { totalFee: "0", poolCount: 0 };
            poolsPerToken[tokenBMint] = new Set();
          }
          const currentTotal = new BN(feesByTokenMint[tokenBMint].totalFee);
          feesByTokenMint[tokenBMint].totalFee = currentTotal.add(protocolBFee).toString();
          poolsPerToken[tokenBMint].add(poolAddress);
        }
      }
    } else {
      // Original behavior: aggregate fees for tokens that match our target list
      if (targetMintSet.has(tokenAMint.toLowerCase()) && !protocolAFee.isZero()) {
        if (!feesByTokenMint[tokenAMint]) {
          feesByTokenMint[tokenAMint] = { totalFee: "0", poolCount: 0 };
          poolsPerToken[tokenAMint] = new Set();
        }
        const currentTotal = new BN(feesByTokenMint[tokenAMint].totalFee);
        feesByTokenMint[tokenAMint].totalFee = currentTotal.add(protocolAFee).toString();
        poolsPerToken[tokenAMint].add(poolAddress);
      }

      if (targetMintSet.has(tokenBMint.toLowerCase()) && !protocolBFee.isZero()) {
        if (!feesByTokenMint[tokenBMint]) {
          feesByTokenMint[tokenBMint] = { totalFee: "0", poolCount: 0 };
          poolsPerToken[tokenBMint] = new Set();
        }
        const currentTotal = new BN(feesByTokenMint[tokenBMint].totalFee);
        feesByTokenMint[tokenBMint].totalFee = currentTotal.add(protocolBFee).toString();
        poolsPerToken[tokenBMint].add(poolAddress);
      }
    }

    return {
      poolAddress,
      tokenAMint,
      tokenBMint,
      protocolAFee: protocolAFee.toString(),
      protocolBFee: protocolBFee.toString(),
      totalProtocolFee: protocolAFee.add(protocolBFee).toString(),
      collectFeeMode: pool.account.collectFeeMode.toString(),
    };
  });

  // Set correct pool counts using unique pool tracking
  Object.keys(feesByTokenMint).forEach(tokenMint => {
    feesByTokenMint[tokenMint].poolCount = poolsPerToken[tokenMint].size;
  });

  poolsData.sort((a, b) => {
    const aTotal = new BN(a.totalProtocolFee);
    const bTotal = new BN(b.totalProtocolFee);
    return bTotal.cmp(aTotal);
  });

  return {
    totalPools: filteredPools.length,
    poolsWithFees,
    feesByTokenMint,
    pools: poolsData,
  };
}

function displayResults(summary: ProtocolFeeSummary, targetMints: string[]) {
  console.log("\n" + "=".repeat(80));
  console.log("PROTOCOL FEE SUMMARY");
  console.log("=".repeat(80));
  console.log(`Target Token Mints: ${targetMints.join(", ")}`);
  console.log(`Total Pools Found: ${summary.totalPools}`);
  console.log(`Pools with Fees: ${summary.poolsWithFees}`);
  console.log("=".repeat(80));

  // Display fees by token mint
  console.log("\nFEES BY TOKEN MINT:");
  console.log("-".repeat(80));
  console.log(
    "Token Mint".padEnd(45) +
    "Total Fee".padEnd(20) +
    "Pool Count"
  );
  console.log("-".repeat(80));

  const tokenMints = Object.keys(summary.feesByTokenMint).sort((a, b) => {
    const aFee = new BN(summary.feesByTokenMint[a].totalFee);
    const bFee = new BN(summary.feesByTokenMint[b].totalFee);
    return bFee.cmp(aFee); // Highest first
  });

  tokenMints.forEach(mint => {
    const feeData = summary.feesByTokenMint[mint];
    console.log(
      mint.padEnd(45) +
      feeData.totalFee.padEnd(20) +
      feeData.poolCount.toString()
    );
  });

  if (summary.pools.length > 0) {
    console.log("\nPOOL DETAILS (sorted by individual pool fee):");
    console.log("-".repeat(140));
    console.log(
      "Pool Address".padEnd(45) +
      "Token A Mint".padEnd(45) +
      "Token B Mint".padEnd(45) +
      "Protocol A Fee".padEnd(18) +
      "Protocol B Fee".padEnd(18)
    );
    console.log("-".repeat(140));

    summary.pools.forEach((pool, index) => {
      // Only show first 20 pools to avoid overwhelming output
      if (index < 20) {
        console.log(
          pool.poolAddress.padEnd(45) +
          pool.tokenAMint.padEnd(45) +
          pool.tokenBMint.padEnd(45) +
          pool.protocolAFee.padEnd(18) +
          pool.protocolBFee.padEnd(18)
        );
      }
    });

    if (summary.pools.length > 20) {
      console.log(`\n... and ${summary.pools.length - 20} more pools`);
    }
  }
}

function exportToCsv(summary: ProtocolFeeSummary, targetTokenMints: string[], filename = "protocol_fees.csv", claimableOnly: boolean = false) {
  // Export pools data with explicit target boolean columns
  const poolsHeader = "pool_address,token_a_mint,token_b_mint,is_a_target_mint,is_b_target_mint,protocol_fee_a_amount,protocol_fee_b_amount,collect_fee_mode\n";
  const poolsRows = summary.pools.map(pool => {
    // For each pool, determine which tokens are targets
    const targetMintSet = new Set(targetTokenMints.map(mint => mint.toLowerCase()));
    
    const isATargetMint = targetMintSet.has(pool.tokenAMint.toLowerCase());
    const isBTargetMint = targetMintSet.has(pool.tokenBMint.toLowerCase());
    
    return `${pool.poolAddress},${pool.tokenAMint},${pool.tokenBMint},${isATargetMint},${isBTargetMint},${pool.protocolAFee},${pool.protocolBFee},${pool.collectFeeMode}`;
  }).join("\n");
  const poolsCsv = poolsHeader + poolsRows;
  
  // Export token mint summary
  const summaryHeader = "token_mint,total_amount,pool_count\n";
  const summaryRows = Object.entries(summary.feesByTokenMint).map(([mint, data]) =>
    `${mint},${data.totalFee},${data.poolCount}`
  ).join("\n");
  const summaryCsv = summaryHeader + summaryRows;
  
  // Use claimable filename if flag is enabled
  const actualFilename = claimableOnly ? filename.replace('protocol_fees', 'claimable_protocol_fees') : filename;
  const summaryFilename = actualFilename.replace('.csv', '_summary.csv');
  
  console.log(`\n>>> CSV export ready - Pools: ${summary.pools.length} rows, Token Summary: ${Object.keys(summary.feesByTokenMint).length} rows`);
  console.log(`>>> Exporting ${claimableOnly ? 'claimable-only' : 'unified schema'} CSV format`);
  
  require('fs').writeFileSync(actualFilename, poolsCsv);
  require('fs').writeFileSync(summaryFilename, summaryCsv);
  
  return { poolsCsv, summaryCsv };
}

// Main execution function
async function main() {
  // Default to some common tokens if none specified
  const defaultTokenMints = [
    "So11111111111111111111111111111111111111112", // Wrapped SOL (WSOL)
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  ];

  // Parse command line arguments
  const args = process.argv.slice(2);
  const claimableOnlyFlag = args.includes('--claimable-only');
  const exportCsvFlag = args.includes('--export-csv');
  
  // Parse RPC argument
  const rpcIndex = args.indexOf('--rpc');
  let rpcFromArgs: string | undefined;
  if (rpcIndex !== -1 && rpcIndex + 1 < args.length) {
    rpcFromArgs = args[rpcIndex + 1];
  }
  
  // Parse token-mints argument
  const tokenMintsIndex = args.indexOf('--token-mints');
  let tokenMintsFromArgs: string | undefined;
  if (tokenMintsIndex !== -1 && tokenMintsIndex + 1 < args.length) {
    tokenMintsFromArgs = args[tokenMintsIndex + 1];
  }
  
  // Parse blacklist argument
  const blacklistIndex = args.indexOf('--blacklist');
  let blacklistedTokens: string[] = [];
  if (blacklistIndex !== -1 && blacklistIndex + 1 < args.length) {
    const blacklistArg = args[blacklistIndex + 1];
    blacklistedTokens = blacklistArg.split(/[,\s]+/).filter(Boolean);
  }
  
  // Filter out flags and their values from token mints input (for backward compatibility)
  const tokenMintsArgs = args.filter((arg, index) => {
    if (arg.startsWith('--')) return false;
    if (index > 0 && (args[index - 1] === '--blacklist' || args[index - 1] === '--rpc' || args[index - 1] === '--token-mints')) return false;
    return true;
  }).join(" ");
  
  // Priority: CLI args > ENV vars > defaults
  const tokenMintsInput = tokenMintsFromArgs || tokenMintsArgs || process.env.TOKEN_MINTS;
  const targetTokenMints = tokenMintsInput 
    ? tokenMintsInput.split(/[,\s]+/).filter(Boolean)
    : defaultTokenMints;

  // Priority: CLI args > ENV vars > defaults
  const rpc = rpcFromArgs || process.env.RPC || "https://api.mainnet-beta.solana.com";
  const shouldExportCsv = exportCsvFlag || process.env.EXPORT_CSV === "true";

  try {
    console.log(`Using RPC: ${rpc}`);
    if (claimableOnlyFlag) {
      console.log(">>> Claimable-only mode enabled");
    }
    const summary = await getProtocolFeesByTokenMints(rpc, targetTokenMints, claimableOnlyFlag, blacklistedTokens);
    
    displayResults(summary, targetTokenMints);
    
    // Optionally export to CSV
    if (shouldExportCsv) {
      exportToCsv(summary, targetTokenMints, "protocol_fees.csv", claimableOnlyFlag);
    }
    
  } catch (error) {
    console.error("Error retrieving protocol fees:", error);
    process.exit(1);
  }
}

// Export functions for potential reuse
export { getProtocolFeesByTokenMints, PoolFeeData, ProtocolFeeSummary, TokenFeeAccumulator };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}