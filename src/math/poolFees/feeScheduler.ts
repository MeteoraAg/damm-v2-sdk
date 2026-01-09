import BN from "bn.js";
import { BASIS_POINT_MAX, ONE_Q64 } from "../../constants";
import { pow } from "../utilsMath";

/**
 * Gets the fee numerator on linear fee scheduler.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param reductionFactor - The reduction factor.
 * @param period - The period.
 * @returns The fee numerator on linear fee scheduler.
 */
export function getFeeNumeratorOnLinearFeeScheduler(
  cliffFeeNumerator: BN,
  reductionFactor: BN,
  period: number,
): BN {
  const reduction = new BN(period).mul(reductionFactor);

  return cliffFeeNumerator.sub(reduction);
}

/**
 * Gets the fee numerator on exponential fee scheduler.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param reductionFactor - The reduction factor.
 * @param period - The period.
 * @returns The fee numerator on exponential fee scheduler.
 */
export function getFeeNumeratorOnExponentialFeeScheduler(
  cliffFeeNumerator: BN,
  reductionFactor: BN,
  period: number,
): BN {
  if (period === 0) {
    return cliffFeeNumerator;
  }

  const basisPointMax = new BN(BASIS_POINT_MAX);
  const bps = new BN(reductionFactor).shln(64).div(basisPointMax);

  // base = ONE_Q64 - bps (equivalent to 1 - reduction_factor/10_000 in Q64.64)
  const base = ONE_Q64.sub(bps);

  const result = pow(base, new BN(period));

  // final fee: cliffFeeNumerator * result >> 64
  return cliffFeeNumerator.mul(result).div(ONE_Q64);
}

/**
 * Gets the max base fee numerator.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @returns The max base fee numerator.
 */
export function getMaxBaseFeeNumerator(cliffFeeNumerator: BN): BN {
  return cliffFeeNumerator;
}
