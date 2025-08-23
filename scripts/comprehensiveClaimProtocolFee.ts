import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { CpAmm } from "../src";
import BN from "bn.js";
import { getProtocolFeesByTokenMints } from "./getProtocolFeesByTokenMints";
import {
  ClaimResult,
  ComprehensiveClaimSummary,
  PoolFeeData,
  TokenClaimSummary,
} from "./utils/types";
import {
  DEFAULT_TARGET_TOKENS,
  BLACKLISTED_TOKENS,
  DEFAULT_CONCURRENCY,
  DEFAULT_CLAIMS_PER_TX,
  DEFAULT_TREASURY,
} from "./utils/constants";
import { exportEligiblePools, exportClaimResults } from "./utils/csvExporter";
import { executeTransaction } from "./utils/transactionUtils";
import {
  getPoolFees,
  createClaimResult,
  updateTokenSummary,
  filterEligiblePools,
} from "./utils/poolStateUtils";

const RPC = process.env.RPC;
const WALLET_PATH = process.env.WALLET_PATH;
const CONCURRENCY = parseInt(process.env.CONCURRENCY || DEFAULT_CONCURRENCY.toString());
const TREASURY = process.env.TREASURY || DEFAULT_TREASURY;
const CLAIMS_PER_TX = parseInt(process.env.CLAIMS_PER_TX || DEFAULT_CLAIMS_PER_TX.toString());


class ProtocolFeeClaimer {
  private connection: Connection;
  private wallet: Keypair;
  private treasury: PublicKey;
  private cpAmm: CpAmm;
  private claimResults: ClaimResult[] = [];
  private tokenSummaries: Map<string, TokenClaimSummary> = new Map();
  private totalGasFeeLamports = 0;

  constructor(rpc: string, walletPath: string, treasury: string) {
    this.connection = new Connection(rpc);
    this.wallet = Keypair.fromSecretKey(Uint8Array.from(require(walletPath)));
    this.treasury = new PublicKey(treasury);
    this.cpAmm = new CpAmm(this.connection);
  }


  private async processBatch(
    poolBatch: PoolFeeData[],
    targetTokenMints: string[]
  ): Promise<ClaimResult[]> {
    try {
      const beforeStates = await Promise.all(
        poolBatch.map(pool => getPoolFees(this.cpAmm, pool.poolAddress))
      );
      
      const instructions = await Promise.all(
        poolBatch.map(pool => 
          this.cpAmm.claimProtocolFee({
            pool: new PublicKey(pool.poolAddress),
            treasury: this.treasury,
            operator: this.wallet.publicKey,
          }).then(res => res.instructions)
        )
      ).then(res => res.flat());
      
      const signature = await executeTransaction(
        instructions,
        this.connection,
        this.wallet
      );
      
      const afterStates = await Promise.all(
        poolBatch.map(pool => getPoolFees(this.cpAmm, pool.poolAddress))
      );
      
      const results = poolBatch.map((pool, index) => {
        const result = createClaimResult(
          pool,
          beforeStates[index],
          afterStates[index],
          signature,
          true
        );
        
        updateTokenSummary(this.tokenSummaries, result, pool, targetTokenMints);
        return result;
      });
      
      return results;
      
    } catch (error) {
      return poolBatch.map(pool => 
        createClaimResult(
          pool,
          { protocolAFee: new BN(pool.protocolAFee), protocolBFee: new BN(pool.protocolBFee) },
          { protocolAFee: new BN(pool.protocolAFee), protocolBFee: new BN(pool.protocolBFee) },
          "",
          false,
          error?.message || "Transaction failed"
        )
      );
    }
  }


  async claimProtocolFees(targetTokenMints: string[]): Promise<ComprehensiveClaimSummary> {
    const startTime = new Date();
    const startBalance = await this.connection.getBalance(this.wallet.publicKey);
    
    console.log(`Starting protocol fee claim for ${targetTokenMints.length} tokens`);
    
    const protocolFeesData = await getProtocolFeesByTokenMints(
      RPC,
      targetTokenMints,
      true,
      BLACKLISTED_TOKENS
    );
    
    const eligiblePools = filterEligiblePools(protocolFeesData.pools);
    console.log(`✅ Found ${eligiblePools.length} eligible pools`);
    
    exportEligiblePools(eligiblePools, targetTokenMints);
    
    const promises = new Map<Promise<ClaimResult[]>, number>();
    
    for (let i = 0; i < eligiblePools.length; i += CLAIMS_PER_TX) {
      if (promises.size >= CONCURRENCY) {
        const results = await Promise.race(promises.keys());
        this.claimResults.push(...results);
        
        for (const [promise, _] of promises) {
          if (await promise === results) {
            promises.delete(promise);
            break;
          }
        }
      }
      
      const poolBatch = eligiblePools.slice(i, i + CLAIMS_PER_TX);
      const batchPromise = this.processBatch(poolBatch, targetTokenMints);
      
      batchPromise.then(results => {
        const successful = results.filter(r => r.success).length;
        console.log(`📦 Processed batch: ${successful}/${results.length} successful`);
      });
      
      promises.set(batchPromise, i);
    }
    
    const remainingResults = await Promise.all(promises.keys());
    remainingResults.forEach(results => this.claimResults.push(...results));
    
    const endTime = new Date();
    const endBalance = await this.connection.getBalance(this.wallet.publicKey);
    const totalSpent = startBalance - endBalance;
    this.totalGasFeeLamports = totalSpent;
    
    console.log(`Completed. Gas spent: ${(totalSpent / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
    
    return {
      totalPoolsEligible: eligiblePools.length,
      totalPoolsClaimed: this.claimResults.filter(r => r.success).length,
      totalPoolsFailed: this.claimResults.filter(r => !r.success).length,
      totalGasFeeLamports: this.totalGasFeeLamports,
      totalGasFeeSOL: this.totalGasFeeLamports / LAMPORTS_PER_SOL,
      tokenSummaries: Array.from(this.tokenSummaries.values()),
      claimResults: this.claimResults,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: (endTime.getTime() - startTime.getTime()) / 1000
    };
  }

  displayResults(summary: ComprehensiveClaimSummary) {
    console.log("\n=== CLAIM SUMMARY ===");
    console.log(`Duration: ${summary.durationSeconds.toFixed(1)}s`);
    console.log(`Pools: ${summary.totalPoolsClaimed}/${summary.totalPoolsEligible} successful`);
    console.log(`Gas: ${summary.totalGasFeeSOL.toFixed(6)} SOL`);
    
    if (summary.tokenSummaries.length > 0) {
      console.log("\nToken claims:");
      summary.tokenSummaries
        .sort((a, b) => new BN(b.totalClaimedAmount).cmp(new BN(a.totalClaimedAmount)))
        .slice(0, 5)
        .forEach(token => {
          console.log(`${token.tokenMint}: ${token.totalClaimedAmount} (${token.poolsClaimed} pools)`);
        });
    }
  }
}

async function main() {
  if (!WALLET_PATH) {
    console.error("WALLET_PATH environment variable is required");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const tokenMintsInput = args.join(" ") || process.env.TARGET_TOKENS;
  const targetTokenMints = tokenMintsInput 
    ? tokenMintsInput.split(/[,\s]+/).filter(Boolean)
    : DEFAULT_TARGET_TOKENS;

  try {
    const claimer = new ProtocolFeeClaimer(RPC, WALLET_PATH, TREASURY);
    const summary = await claimer.claimProtocolFees(targetTokenMints);
    
    claimer.displayResults(summary);
    exportClaimResults(summary);
    
    console.log("\nProtocol fee claiming completed");
    
  } catch (error) {
    console.error("Error during claiming:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ProtocolFeeClaimer };