import { IdlAccounts, IdlTypes, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import type { CpAmm as CpAmmTypes } from "./idl/cp_amm";

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

export enum FeeSchedulerMode {
  Linear,
  Exponential,
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

export type FeeMode = {
  feeOnInput: boolean;
  feesOnTokenA: boolean;
};

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

export type DynamicFee = {
  binStep: number;
  binStepU128: BN;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  maxVolatilityAccumulator: number;
  variableFeeControl: number;
};

export type BaseFee = {
  cliffFeeNumerator: BN;
  numberOfPeriod: number;
  periodFrequency: BN;
  reductionFactor: BN;
  feeSchedulerMode: number;
};

export type PoolFeesParams = {
  baseFee: BaseFee;
  protocolFeePercent: number;
  partnerFeePercent: number;
  referralFeePercent: number;
  dynamicFee: DynamicFee | null;
};

export type InitializeCustomizeablePoolParams = {
  payer: PublicKey;
  creator: PublicKey;
  positionNft: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAAmount: BN;
  tokenBAmount: BN;
  tokenADecimal: number;
  tokenBDecimal: number;
  poolFees: PoolFeesParams;
  hasAlphaVault: boolean;
  activationType: number;
  collectFeeMode: number;
  activationPoint: BN | null;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
};

export type PreparePoolCreationParams = {
  tokenAAmount: BN;
  tokenBAmount: BN;
  tokenADecimal: number;
  tokenBDecimal: number;
};

export type PreparedPoolCreation = {
  sqrtPriceQ64: BN;
  liquidityQ64: BN;
};

export type CreatePoolParams = {
  creator: PublicKey;
  payer: PublicKey;
  config: PublicKey;
  positionNft: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAAmount: BN;
  tokenBAmount: BN;
  tokenADecimal: number;
  tokenBDecimal: number;
  activationPoint: BN | null;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
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
  positionNftMint: PublicKey;
  liquidityDeltaQ64: BN;
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

export type LiquidityDeltaParams = {
  maxAmountTokenA: BN;
  maxAmountTokenB: BN;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  sqrtPrice: BN;
  sqrtMinPrice: BN;
  sqrtMaxPrice: BN;
};

export type RemoveLiquidityParams = AddLiquidityParams;

export type GetQuoteParams = {
  inAmount: BN;
  inputTokenMint: PublicKey;
  slippage: number;
  poolState: PoolState;
};

export type SwapQuotes = {
  totalFee: BN;
  minOutAmount: BN;
  actualAmount: BN;
};

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
};

export type LockPositionParams = {
  owner: PublicKey;
  payer: PublicKey;
  vestingAccount: PublicKey;
  position: PublicKey;
  positionNftMint: PublicKey;
  pool: PublicKey;
  cliffPoint: BN | null;
  periodFrequency: BN;
  cliffUnlockLiquidity: BN;
  liquidityPerPeriod: BN;
  numberOfPeriod: number;
  vestings: PublicKey[];
};

export type ClaimPositionFeeParams = {
  owner: PublicKey;
  position: PublicKey;
  pool: PublicKey;
  nftPositionMint: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  tokenAProgram: PublicKey;
  tokenBProgram: PublicKey;
};

export type InitializeRewardParams = {
  rewardIndex: number;
  rewardDuration: BN;
  pool: PublicKey;
  rewardMint: PublicKey;
  payer: PublicKey;
};

export type UpdateRewardDurationParams = {
  pool: PublicKey;
  admin: PublicKey;
  rewardIndex: number;
  newDuration: BN;
};

export type UpdateRewardFunderParams = {
  pool: PublicKey;
  admin: PublicKey;
  rewardIndex: number;
  newFunder: PublicKey;
};

export type FundRewardParams = {
  funder: PublicKey;
  rewardIndex: number;
  pool: PublicKey;
  carryForward: boolean;
  amount: BN;
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
};

export type ClaimRewardParams = {
  user: PublicKey;
  position: PublicKey;
  rewardIndex: number;
};

export type RefreshVestingParams = {
  owner: PublicKey;
  position: PublicKey;
  positionNftMint: PublicKey;
  pool: PublicKey;
  vestings: PublicKey[];
};

export type PermanentLockParams = {
  owner: PublicKey;
  position: PublicKey;
  positionNftMint: PublicKey;
  pool: PublicKey;
  unlockedLiquidity: BN;
};
