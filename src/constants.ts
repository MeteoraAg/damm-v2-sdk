import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export const CP_AMM_PROGRAM_ID = new PublicKey(
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"
);

export const LIQUIDITY_SCALE = 128;
export const SCALE_OFFSET = 64;
export const BASIS_POINT_MAX = 10_000;
export const MAX_FEE_NUMERATOR = 500_000_000;
export const FEE_DENOMINATOR = 1_000_000_000;

export const U64_MAX = new BN("18446744073709551615");

export const MIN_SQRT_PRICE = new BN("4295048016");
export const MAX_SQRT_PRICE = new BN("79226673521066979257578248091");
export const MIN_CU_BUFFER = 50_000;
export const MAX_CU_BUFFER = 200_000;

export const DYNAMIC_FEE_FILTER_PERIOD_DEFAULT = 10;
export const DYNAMIC_FEE_DECAY_PERIOD_DEFAULT = 120;
export const DYNAMIC_FEE_REDUCTION_FACTOR_DEFAULT = 5000; // 50%
export const BIN_STEP_BPS_DEFAULT = 1;
//  bin_step << 64 / BASIS_POINT_MAX
export const BIN_STEP_BPS_U128_DEFAULT = new BN("1844674407370955");
export const MAX_PRICE_CHANGE_BPS_DEFAULT = 1500; // 15%
