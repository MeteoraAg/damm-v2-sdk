import { BN } from "@coral-xyz/anchor";
import { Rounding } from "../types";
import { BASIS_POINT_MAX, FEE_DENOMINATOR } from "../constants";
import { mulDiv } from "../math";

/**
 * Converts basis points (bps) to a fee numerator
 * 1 bps = 0.01% = 0.0001 in decimal
 *
 * @param bps - The value in basis points [1-10_000]
 * @returns The equivalent fee numerator
 */
export function bpsToFeeNumerator(bps: number): BN {
  return new BN(bps * FEE_DENOMINATOR).divn(BASIS_POINT_MAX);
}

/**
 * Converts a fee numerator back to basis points (bps)
 *
 * @param feeNumerator - The fee numerator to convert
 * @returns The equivalent value in basis points [1-10_000]
 */
export function feeNumeratorToBps(feeNumerator: BN): number {
  return feeNumerator
    .muln(BASIS_POINT_MAX)
    .div(new BN(FEE_DENOMINATOR))
    .toNumber();
}
