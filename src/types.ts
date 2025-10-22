import { IdlAccounts, IdlTypes, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import type { CpAmm as CpAmmTypes } from "./idl/cp_amm";
import { Mint } from "@solana/spl-token";
import Decimal from "decimal.js";

export type AmmProgram = Program<CpAmmTypes>;

export type TxBuilder = Promise<Transaction>;

export enum Rounding {
  Up,
  Down,
}

export enum ActivationPoint {
  Timestamp,
  Slot,
}

export enum BaseFeeMode {
  FeeSchedulerLinear,
  FeeSchedulerExponential,
  RateLimiter,
}

export enum CollectFeeMode {
  BothToken,
  OnlyB,
}

export enum TradeDirection {
  AtoB,
  BtoA,
}

export enum ActivationType {
  Slot,
  Timestamp,
}

export enum PoolVersion {
  V0,
  V1,
}

export type FeeMode = {
  feesOnInput: boolean;
  feesOnTokenA: boolean;
  hasReferral: boolean;
};

export enum PoolStatus {
  Enable,
  Disable,
}

export enum SwapMode {
  ExactIn,
  PartialFill,
  ExactOut,
}

// Account state types
export type PoolState = IdlAccounts<CpAmmTypes>["pool"];
export type PositionState = IdlAccounts<CpAmmTypes>["position"];
export type VestingState = IdlAccounts<CpAmmTypes>["vesting"];
export type ConfigState = IdlAccounts<CpAmmTypes>["config"];
export type TokenBadgeState = IdlAccounts<CpAmmTypes>["tokenBadge"];

// Program params types
// export type LockPositionParams = IdlTypes<CpAmm>["VestingParameters"];
// export type AddLiquidityParams = IdlTypes<CpAmm>["AddLiquidityParameters"];
// export type RemoveLiquidityParams =
//   IdlTypes<CpAmm>["RemoveLiquidityParameters"];
// export type SwapParams = IdlTypes<CpAmm>["SwapParameters"];
// export type InitPoolParams = IdlTypes<CpAmm>["InitializePoolParameters"];
// export type InitCustomizePoolParams =
//   IdlTypes<CpAmm>["InitializeCustomizablePoolParameters"];
export type RewardInfo = IdlTypes<CpAmmTypes>["rewardInfo"];
export type UserRewardInfo = IdlTypes<CpAmmTypes>["userRewardInfo"];

/**
 * Dynamic fee parameters
 * @param binStep
 * @param binStepU128
 * @param filterPeriod
 * @param decayPeriod
 * @param reductionFactor
 * @param maxVolatilityAccumulator
 * @param variableFeeControl
 */
export type DynamicFee = IdlTypes<CpAmmTypes>["dynamicFeeParameters"];

/**
 * Dynamic fee struct
 * @param initialized
 * @param padding
 * @param maxVolatilityAccumulator
 * @param variableFeeControl
 * @param binStep
 * @param filterPeriod
 * @param decayPeriod
 * @param reductionFactor
 * @param lastUpdateTimestamp
 * @param binStepU128
 * @param sqrtPriceReference
 * @param volatilityAccumulator
 * @param volatilityReference
 */
export type DynamicFeeStruct = IdlTypes<CpAmmTypes>["dynamicFeeStruct"];

/**
 * Base fee parameters
 * @param cliffFeeNumerator
 * @param firstFactor // feeScheduler: numberOfPeriod, rateLimiter: feeIncrementBps
 * @param secondFactor // feeScheduler: periodFrequency, rateLimiter: maxLimiterDuration
 * @param thirdFactor // feeScheduler: reductionFactor, rateLimiter: referenceAmount
 * @param baseFeeMode
 */
export type BaseFee = IdlTypes<CpAmmTypes>["baseFeeParameters"];

export type PoolFeesStruct = IdlTypes<CpAmmTypes>["poolFeesStruct"];

export type PoolFeesParams = {
  baseFee: BaseFee;
  padding: number[];
  dynamicFee: DynamicFee | null;
};

export type PrepareTokenAccountParams = {
  payer: PublicKey;
  tokenAOwner: PublicKey;
  tokenBOwner: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
};

export type PrepareCustomizablePoolParams = {
  pool: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAAmount: BN;
  tokenBAmount: BN;
  payer: PublicKey;
  positionNft: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
};

export type InitializeCustomizeablePoolParams = {
  payer: PublicKey;
  creator: PublicKey;
  positionNft: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAAmount: BN;
  tokenBAmount: BN;
  sqrtMinPrice: BN;
  sqrtMaxPrice: BN;
  liquidityDelta: BN;
  initSqrtPrice: BN;
  poolFees: PoolFeesParams;
  hasAlphaVault: boolean;
  activationType: number;
  collectFeeMode: number;
  activationPoint: BN | null;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
  isLockLiquidity?: boolean;
};

export type InitializeCustomizeablePoolWithDynamicConfigParams =
  InitializeCustomizeablePoolParams & {
    config: PublicKey;
    poolCreatorAuthority: PublicKey;
  };

export type PreparePoolCreationParams = {
  tokenAAmount: BN;
  tokenBAmount: BN;
  minSqrtPrice: BN;
  maxSqrtPrice: BN;
  tokenAInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
  tokenBInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
};

export type PreparedPoolCreation = {
  initSqrtPrice: BN;
  liquidityDelta: BN;
};

export type PreparePoolCreationSingleSide = {
  tokenAAmount: BN;
  minSqrtPrice: BN;
  maxSqrtPrice: BN;
  initSqrtPrice: BN;
  tokenAInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
};

export type CreatePoolParams = {
  creator: PublicKey;
  payer: PublicKey;
  config: PublicKey;
  positionNft: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  initSqrtPrice: BN;
  liquidityDelta: BN;
  tokenAAmount: BN;
  tokenBAmount: BN;
  activationPoint: BN | null;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
  isLockLiquidity?: boolean;
};

export type CreatePositionParams = {
  owner: PublicKey;
  payer: PublicKey;
  pool: PublicKey;
  positionNft: PublicKey;
};

export type AddLiquidityParams = {
  owner: PublicKey;
  position: PublicKey;
  pool: PublicKey;
  positionNftAccount: PublicKey;
  liquidityDelta: BN;
  maxAmountTokenA: BN;
  maxAmountTokenB: BN;
  tokenAAmountThreshold: BN;
  tokenBAmountThreshold: BN;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
};

export type CreatePositionAndAddLiquidity = {
  owner: PublicKey;
  pool: PublicKey;
  positionNft: PublicKey;
  liquidityDelta: BN;
  maxAmountTokenA: BN;
  maxAmountTokenB: BN;
  tokenAAmountThreshold: BN;
  tokenBAmountThreshold: BN;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
};

export type LiquidityDeltaParams = {
  maxAmountTokenA: BN;
  maxAmountTokenB: BN;
  sqrtPrice: BN;
  sqrtMinPrice: BN;
  sqrtMaxPrice: BN;
  tokenAInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
  tokenBInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
};

export type RemoveLiquidityParams = {
  owner: PublicKey;
  position: PublicKey;
  pool: PublicKey;
  positionNftAccount: PublicKey;
  liquidityDelta: BN;
  tokenAAmountThreshold: BN;
  tokenBAmountThreshold: BN;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
  vestings: Array<{
    account: PublicKey;
    vestingState: VestingState;
  }>;
  currentPoint: BN;
};

export type RemoveAllLiquidityParams = Omit<
  RemoveLiquidityParams,
  "liquidityDelta"
>;

export type BuildAddLiquidityParams = {
  owner: PublicKey;
  position: PublicKey;
  pool: PublicKey;
  positionNftAccount: PublicKey;
  liquidityDelta: BN;
  tokenAAccount: PublicKey;
  tokenBAccount: PublicKey;
  tokenAAmountThreshold: BN;
  tokenBAmountThreshold: BN;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
};

export type BuildLiquidatePositionInstructionParams = {
  owner: PublicKey;
  position: PublicKey;
  positionNftAccount: PublicKey;
  positionState: PositionState;
  poolState: PoolState;
  tokenAAccount: PublicKey;
  tokenBAccount: PublicKey;
  tokenAAmountThreshold: BN;
  tokenBAmountThreshold: BN;
};

export type BuildRemoveAllLiquidityInstructionParams = {
  poolAuthority: PublicKey;
  owner: PublicKey;
  position: PublicKey;
  pool: PublicKey;
  positionNftAccount: PublicKey;
  tokenAAccount: PublicKey;
  tokenBAccount: PublicKey;
  tokenAAmountThreshold: BN;
  tokenBAmountThreshold: BN;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
};

export type ClosePositionParams = {
  owner: PublicKey;
  pool: PublicKey;
  position: PublicKey;
  positionNftMint: PublicKey;
  positionNftAccount: PublicKey;
};

export type RemoveAllLiquidityAndClosePositionParams = {
  owner: PublicKey;
  position: PublicKey;
  positionNftAccount: PublicKey;
  poolState: PoolState;
  positionState: PositionState;
  tokenAAmountThreshold: BN;
  tokenBAmountThreshold: BN;
  vestings: Array<{
    account: PublicKey;
    vestingState: VestingState;
  }>;
  currentPoint: BN;
};

export type MergePositionParams = {
  owner: PublicKey;
  positionA: PublicKey;
  positionB: PublicKey;
  poolState: PoolState;
  positionBNftAccount: PublicKey;
  positionANftAccount: PublicKey;
  positionBState: PositionState;
  tokenAAmountAddLiquidityThreshold: BN;
  tokenBAmountAddLiquidityThreshold: BN;
  tokenAAmountRemoveLiquidityThreshold: BN;
  tokenBAmountRemoveLiquidityThreshold: BN;
  positionBVestings: Array<{
    account: PublicKey;
    vestingState: VestingState;
  }>;
  currentPoint: BN;
};

export type GetQuoteParams = {
  inAmount: BN;
  inputTokenMint: PublicKey;
  slippage: number;
  poolState: PoolState;
  currentTime: number;
  currentSlot: number;
  inputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
  outputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
  tokenADecimal: number;
  tokenBDecimal: number;
  hasReferral?: boolean;
};

export type GetQuote2Params = {
  inputTokenMint: PublicKey;
  slippage: number;
  currentPoint: BN;
  poolState: PoolState;
  inputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
  outputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
  tokenADecimal: number;
  tokenBDecimal: number;
  hasReferral: boolean;
} & (
  | {
      swapMode: SwapMode.ExactIn;
      amountIn: BN;
    }
  | {
      swapMode: SwapMode.PartialFill;
      amountIn: BN;
    }
  | {
      swapMode: SwapMode.ExactOut;
      amountOut: BN;
    }
);

export type SwapAmount = {
  outputAmount: BN;
  nextSqrtPrice: BN;
};

export type SwapResult = IdlTypes<CpAmmTypes>["swapResult"];

export type SwapResult2 = IdlTypes<CpAmmTypes>["swapResult2"];

export interface Quote2Result extends SwapResult2 {
  priceImpact: Decimal;
  minimumAmountOut?: BN;
  maximumAmountIn?: BN;
}

export type SwapParams = {
  payer: PublicKey;
  pool: PublicKey;
  inputTokenMint: PublicKey;
  outputTokenMint: PublicKey;
  amountIn: BN;
  minimumAmountOut: BN;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
  referralTokenAccount: PublicKey | null;
  poolState?: PoolState;
};

export type Swap2Params = {
  payer: PublicKey;
  pool: PublicKey;
  inputTokenMint: PublicKey;
  outputTokenMint: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
  referralTokenAccount: PublicKey | null;
  poolState?: PoolState;
} & (
  | {
      swapMode: SwapMode.ExactIn;
      amountIn: BN;
      minimumAmountOut: BN;
    }
  | {
      swapMode: SwapMode.PartialFill;
      amountIn: BN;
      minimumAmountOut: BN;
    }
  | {
      swapMode: SwapMode.ExactOut;
      amountOut: BN;
      maximumAmountIn: BN;
    }
);

export type LockPositionParams = {
  owner: PublicKey;
  payer: PublicKey;
  vestingAccount: PublicKey;
  position: PublicKey;
  positionNftAccount: PublicKey;
  pool: PublicKey;
  cliffPoint: BN | null;
  periodFrequency: BN;
  cliffUnlockLiquidity: BN;
  liquidityPerPeriod: BN;
  numberOfPeriod: number;
};

export type SetupFeeClaimAccountsParams = {
  payer: PublicKey;
  owner: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
  receiver?: PublicKey;
  tempWSolAccount?: PublicKey;
};

export type ClaimPositionFeeInstructionParams = {
  owner: PublicKey;
  poolAuthority: PublicKey;
  pool: PublicKey;
  position: PublicKey;
  positionNftAccount: PublicKey;
  tokenAAccount: PublicKey;
  tokenBAccount: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
};

export type ClaimPositionFeeParams = {
  owner: PublicKey;
  position: PublicKey;
  pool: PublicKey;
  positionNftAccount: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
  receiver?: PublicKey;
  feePayer?: PublicKey;
  tempWSolAccount?: PublicKey;
};

export type ClaimPositionFeeParams2 = {
  owner: PublicKey;
  position: PublicKey;
  pool: PublicKey;
  positionNftAccount: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
  receiver: PublicKey;
  feePayer?: PublicKey;
};

export type ClosePositionInstructionParams = {
  owner: PublicKey;
  poolAuthority: PublicKey;
  pool: PublicKey;
  position: PublicKey;
  positionNftMint: PublicKey;
  positionNftAccount: PublicKey;
};

export type InitializeRewardParams = {
  rewardIndex: number; // 0: for creators or admins, 1: for admins only
  rewardDuration: BN;
  pool: PublicKey;
  rewardMint: PublicKey;
  funder: PublicKey;
  payer: PublicKey;
  creator: PublicKey;
  rewardMintProgram: PublicKey;
};

export type InitializeAndFundReward = {
  rewardIndex: number; // 0: for creators or admins, 1: for admins only
  rewardDuration: BN;
  pool: PublicKey;
  creator: PublicKey;
  payer: PublicKey;
  rewardMint: PublicKey;
  carryForward: boolean;
  amount: BN;
  rewardMintProgram: PublicKey;
};

export type UpdateRewardDurationParams = {
  pool: PublicKey;
  signer: PublicKey;
  rewardIndex: number;
  newDuration: BN;
};

export type UpdateRewardFunderParams = {
  pool: PublicKey;
  signer: PublicKey;
  rewardIndex: number;
  newFunder: PublicKey;
};

export type FundRewardParams = {
  funder: PublicKey;
  rewardIndex: number;
  pool: PublicKey;
  carryForward: boolean;
  amount: BN;
  rewardMint: PublicKey;
  rewardVault: PublicKey;
  rewardMintProgram: PublicKey;
};

export type WithdrawIneligibleRewardParams = {
  rewardIndex: number;
  pool: PublicKey;
  funder: PublicKey;
};

export type ClaimPartnerFeeParams = {
  partner: PublicKey;
  pool: PublicKey;
  maxAmountA: BN;
  maxAmountB: BN;
  receiver?: PublicKey;
  feePayer?: PublicKey;
  tempWSolAccount?: PublicKey;
};

export type ClaimRewardParams = {
  user: PublicKey;
  position: PublicKey;
  poolState: PoolState;
  positionState: PositionState;
  positionNftAccount: PublicKey;
  rewardIndex: number;
  isSkipReward: boolean;
  feePayer?: PublicKey;
};

export type RefreshVestingParams = {
  owner: PublicKey;
  position: PublicKey;
  positionNftAccount: PublicKey;
  pool: PublicKey;
  vestingAccounts: PublicKey[];
};

export type PermanentLockParams = {
  owner: PublicKey;
  position: PublicKey;
  positionNftAccount: PublicKey;
  pool: PublicKey;
  unlockedLiquidity: BN;
};

export type GetDepositQuoteParams = {
  inAmount: BN;
  isTokenA: boolean;
  minSqrtPrice: BN;
  maxSqrtPrice: BN;
  sqrtPrice: BN;
  inputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
  outputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
};

export type GetWithdrawQuoteParams = {
  liquidityDelta: BN;
  minSqrtPrice: BN;
  maxSqrtPrice: BN;
  sqrtPrice: BN;
  tokenATokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
  tokenBTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  };
};

export type DepositQuote = {
  actualInputAmount: BN;
  consumedInputAmount: BN;
  outputAmount: BN;
  liquidityDelta: BN;
};

export type WithdrawQuote = {
  liquidityDelta: BN;
  outAmountA: BN;
  outAmountB: BN;
};

export type DynamicFeeParams = {
  volatilityAccumulator: BN;
  binStep: number;
  variableFeeControl: number;
};

export type SplitPositionParams = {
  firstPositionOwner: PublicKey;
  secondPositionOwner: PublicKey;
  pool: PublicKey;
  firstPosition: PublicKey;
  firstPositionNftAccount: PublicKey;
  secondPosition: PublicKey;
  secondPositionNftAccount: PublicKey;
  permanentLockedLiquidityPercentage: number;
  unlockedLiquidityPercentage: number;
  feeAPercentage: number;
  feeBPercentage: number;
  reward0Percentage: number;
  reward1Percentage: number;
};

export type SplitPosition2Params = {
  firstPositionOwner: PublicKey;
  secondPositionOwner: PublicKey;
  pool: PublicKey;
  firstPosition: PublicKey;
  firstPositionNftAccount: PublicKey;
  secondPosition: PublicKey;
  secondPositionNftAccount: PublicKey;
  numerator: number;
};

export interface BaseFeeHandler {
  validate(
    collectFeeMode: CollectFeeMode,
    activationType: ActivationType,
    poolVersion: PoolVersion
  ): boolean;
  getBaseFeeNumeratorFromIncludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN,
    tradeDirection: TradeDirection,
    includedFeeAmount: BN
  ): BN;
  getBaseFeeNumeratorFromExcludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN,
    tradeDirection: TradeDirection,
    excludedFeeAmount: BN
  ): BN;
}

export interface FeeOnAmountResult {
  amount: BN;
  tradingFee: BN;
  protocolFee: BN;
  partnerFee: BN;
  referralFee: BN;
}

export interface SplitFees {
  tradingFee: BN;
  protocolFee: BN;
  referralFee: BN;
  partnerFee: BN;
}
