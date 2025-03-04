import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export const CP_AMM_PROGRAM_ID = new PublicKey("");
export const CP_AMM_PROGRAM_ID_DEVNET = new PublicKey("");

export const SCALE_OFFSET = 64;

export const U128_MAX = new BN(2).pow(new BN(128)).sub(new BN(1));

export const ONE = new BN(1).shln(SCALE_OFFSET);

export const MIN_SQRT_PRICE = new BN("4295048016");
export const MAX_SQRT_PRICE = new BN("79226673521066979257578248091");
