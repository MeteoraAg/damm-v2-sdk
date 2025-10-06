import { PublicKey } from "@solana/web3.js";
import { PoolStatus } from "../types";
import BN from "bn.js";

/**
 * Checks if the partner is valid
 * @param partner - The partner address
 * @returns True if the partner is valid, false otherwise
 */
export function hasPartner(partner: PublicKey): boolean {
  return !partner.equals(PublicKey.default);
}

/**
 * Checks if the swap is enabled
 * @param pool - The pool
 * @param currentPoint - The current point
 * @returns True if the swap is enabled, false otherwise
 */
export function isSwapEnabled(
  pool: { poolStatus: PoolStatus; activationPoint: BN },
  currentPoint: BN
): boolean {
  if (typeof pool.poolStatus !== "number") {
    throw new Error("invalid pool status");
  }

  return (
    pool.poolStatus === PoolStatus.Enable &&
    currentPoint.gte(pool.activationPoint)
  );
}
