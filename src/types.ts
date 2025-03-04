import { IdlAccounts, IdlTypes, Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { CpAmm } from "./idl";

export type AmmProgram = Program<CpAmm>;

export enum Rounding {
  Up,
  Down,
}

export enum ActivationPoint {
  Timestamp,
  Slot,
}

// Account state types
export type PoolState = IdlAccounts<CpAmm>["pool"];
export type PositionState = IdlAccounts<CpAmm>["position"];
export type VestingState = IdlAccounts<CpAmm>["vesting"];
export type ConfigState = IdlAccounts<CpAmm>["config"];
export type TokenBadgeState = IdlAccounts<CpAmm>["tokenBadge"];

// Program params types
// export type LockPositionParams = IdlTypes<CpAmm>["VestingParameters"];
// export type AddLiquidityParams = IdlTypes<CpAmm>["AddLiquidityParameters"];
// export type RemoveLiquidityParams =
//   IdlTypes<CpAmm>["RemoveLiquidityParameters"];
// export type SwapParams = IdlTypes<CpAmm>["SwapParameters"];
// export type InitPoolParams = IdlTypes<CpAmm>["InitializePoolParameters"];
// export type InitCustomizePoolParams =
//   IdlTypes<CpAmm>["InitializeCustomizablePoolParameters"];
export type RewardInfo = IdlTypes<CpAmm>["RewardInfo"];

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
  tokenX: PublicKey;
  tokenY: PublicKey;
  poolFees: PoolFeesParams;
  hasAlphaVault: boolean;
  liquidity: BN;
  initialPrice: BN;
  activationType: number;
  collectFeeMode: number;
  activationPoint: BN | null;
};

export type CreatePoolParams = {
  creator: PublicKey;
  payer: PublicKey;
  config: PublicKey;
  tokenX: PublicKey;
  tokenY: PublicKey;
  initialPrice: BN;
  liquidity: BN;
  activationPoint: ActivationPoint;
};

export type CreatePositionParams = {
  owner: PublicKey;
  payer: PublicKey;
  pool: PublicKey;
};

export type AddLiquidityParams = {
  owner: PublicKey;
  position: PublicKey;
  liquidityDelta: BN;
  tokenAAmountThreshold: BN;
  tokenBAmountThreshold: BN;
};

export type RemoveLiquidityParams = AddLiquidityParams;

export type ClaimPositionFeeParams = {
  owner: PublicKey;
  position: PublicKey;
};

export type ClaimRewardParams = {
  user: PublicKey;
  position: PublicKey;
  rewardIndex: number;
};

export type RefreshVestingParams = {
  owner: PublicKey;
  position: PublicKey;
  vestings: PublicKey[];
};

export type PermanentLockParams = {
  owner: PublicKey;
  position: PublicKey;
};
