import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { PoolVersion } from "./types";

export const CP_AMM_PROGRAM_ID = new PublicKey(
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"
);

export const LIQUIDITY_SCALE = 128;
export const SCALE_OFFSET = 64;
export const BASIS_POINT_MAX = 10_000;
export const FEE_DENOMINATOR = 1_000_000_000;

export const ONE_Q64 = new BN(1).shln(SCALE_OFFSET);
export const MAX_EXPONENTIAL = new BN(0x80000);
export const MAX = new BN(2).pow(new BN(128)).sub(new BN(1));

export const MIN_FEE_BPS = 1; // 0.01%
export const MIN_FEE_NUMERATOR = 100_000; // 0.01%

export const MAX_FEE_BPS_V0 = 5000; // 50%
export const MAX_FEE_NUMERATOR_V0 = 500_000_000; // 50%

export const MAX_FEE_BPS_V1 = 9900; // 99%
export const MAX_FEE_NUMERATOR_V1 = 990_000_000; // 99%

export const MIN_SQRT_PRICE = new BN("4295048016");
export const MAX_SQRT_PRICE = new BN("79226673521066979257578248091");
export const MIN_CU_BUFFER = 50_000;
export const MAX_CU_BUFFER = 200_000;

export const DYNAMIC_FEE_SCALING_FACTOR = new BN(100_000_000_000);
export const DYNAMIC_FEE_ROUNDING_OFFSET = new BN(99_999_999_999);
export const DYNAMIC_FEE_FILTER_PERIOD_DEFAULT = 10;
export const DYNAMIC_FEE_DECAY_PERIOD_DEFAULT = 120;
export const DYNAMIC_FEE_REDUCTION_FACTOR_DEFAULT = 5000; // 50%
export const BIN_STEP_BPS_DEFAULT = 1;
//  bin_step << 64 / BASIS_POINT_MAX
export const BIN_STEP_BPS_U128_DEFAULT = new BN("1844674407370955");
export const MAX_PRICE_CHANGE_BPS_DEFAULT = 1500; // 15%

export const U128_MAX = new BN("340282366920938463463374607431768211455");
export const U64_MAX = new BN("18446744073709551615");
export const U16_MAX = 65535;

export const MAX_RATE_LIMITER_DURATION_IN_SECONDS = 43200; // 12 hours
export const MAX_RATE_LIMITER_DURATION_IN_SLOTS = 108000; // 12 hours

export const SPLIT_POSITION_DENOMINATOR = 1_000_000_000;

export const CURRENT_POOL_VERSION = PoolVersion.V0;
