import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export const CP_AMM_PROGRAM_ID = new PublicKey(
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"
);

export const SCALE_OFFSET = 64;
export const BASIS_POINT_MAX = 10_000;
export const MAX_FEE_NUMERATOR = 500_000_000;
export const FEE_DENOMINATOR = 1_000_000_000;

export const MIN_SQRT_PRICE = new BN("4295048016");
export const MAX_SQRT_PRICE = new BN("79226673521066979257578248091");
export const MIN_CU_BUFFER = 50_000;
export const MAX_CU_BUFFER = 200_000;
