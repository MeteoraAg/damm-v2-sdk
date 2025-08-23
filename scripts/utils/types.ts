export interface PoolFeeData {
  poolAddress: string;
  tokenAMint: string;
  tokenBMint: string;
  protocolAFee: string;
  protocolBFee: string;
  totalProtocolFee: string;
  collectFeeMode: string;
}

export interface ClaimResult {
  poolAddress: string;
  tokenAMint: string;
  tokenBMint: string;
  protocolAFeeBefore: string;
  protocolBFeeBefore: string;
  protocolAFeeAfter: string;
  protocolBFeeAfter: string;
  claimedAAmount: string;
  claimedBAmount: string;
  transactionSignature: string;
  gasFeeLamports: number;
  gasFeeSOL: number;
  collectFeeMode: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface TokenClaimSummary {
  tokenMint: string;
  totalClaimedAmount: string;
  poolsClaimed: number;
  totalGasFeeLamports: number;
  totalGasFeeSOL: number;
}

export interface ComprehensiveClaimSummary {
  totalPoolsEligible: number;
  totalPoolsClaimed: number;
  totalPoolsFailed: number;
  totalGasFeeLamports: number;
  totalGasFeeSOL: number;
  tokenSummaries: TokenClaimSummary[];
  claimResults: ClaimResult[];
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

export interface TokenFeeAccumulator {
  [tokenMint: string]: {
    totalFee: string;
    poolCount: number;
  };
}

export interface ProtocolFeeSummary {
  totalPools: number;
  poolsWithFees: number;
  feesByTokenMint: TokenFeeAccumulator;
  pools: PoolFeeData[];
}