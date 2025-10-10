import BN from "bn.js";
import { BaseFeeMode } from "../../types";
import { BASIS_POINT_MAX, ONE_Q64, U16_MAX } from "../../constants";
import { pow } from "../utilsMath";

/**
 * Gets the max base fee numerator.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @returns The max base fee numerator.
 */
export function getMaxBaseFeeNumerator(cliffFeeNumerator: BN): BN {
  return cliffFeeNumerator;
}

/**
 * Gets the min base fee numerator.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param numberOfPeriod - The number of periods.
 * @param periodFrequency - The period frequency.
 * @param reductionFactor - The reduction factor.
 * @param feeSchedulerMode - The fee scheduler mode.
 * @returns The min base fee numerator.
 */
export function getMinBaseFeeNumerator(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  reductionFactor: BN,
  feeSchedulerMode: BaseFeeMode
): BN {
  return getBaseFeeNumeratorByPeriod(
    cliffFeeNumerator,
    numberOfPeriod,
    new BN(numberOfPeriod),
    reductionFactor,
    feeSchedulerMode
  );
}

/**
 * Gets the base fee numerator by period.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param numberOfPeriod - The number of periods.
 * @param period - The period.
 * @param reductionFactor - The reduction factor.
 * @param feeSchedulerMode - The fee scheduler mode.
 * @returns The base fee numerator by period.
 */
export function getBaseFeeNumeratorByPeriod(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  period: BN,
  reductionFactor: BN,
  feeSchedulerMode: BaseFeeMode
): BN {
  const periodValue = BN.min(period, new BN(numberOfPeriod));
  const periodNumber = periodValue.toNumber();
  if (periodNumber > U16_MAX) {
    throw new Error("Math overflow");
  }

  switch (feeSchedulerMode) {
    case BaseFeeMode.FeeSchedulerLinear: {
      const feeNumerator = getFeeNumeratorOnLinearFeeScheduler(
        cliffFeeNumerator,
        reductionFactor,
        periodNumber
      );
      return feeNumerator;
    }
    case BaseFeeMode.FeeSchedulerExponential: {
      const feeNumerator = getFeeNumeratorOnExponentialFeeScheduler(
        cliffFeeNumerator,
        reductionFactor,
        periodNumber
      );
      return feeNumerator;
    }
    default:
      throw new Error("Invalid fee scheduler mode");
  }
}

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
  period: number
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
  period: number
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
 * Gets the base fee numerator.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param numberOfPeriod - The number of periods.
 * @param periodFrequency - The period frequency.
 * @param reductionFactor - The reduction factor.
 * @param feeSchedulerMode - The fee scheduler mode.
 * @param currentPoint - The current point.
 * @param activationPoint - The activation point.
 * @returns The base fee numerator.
 */
export function getBaseFeeNumerator(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  periodFrequency: BN,
  reductionFactor: BN,
  feeSchedulerMode: BaseFeeMode,
  currentPoint: BN,
  activationPoint: BN
): BN {
  if (periodFrequency.isZero()) {
    return cliffFeeNumerator;
  }

  let period: BN;

  if (currentPoint.lt(activationPoint)) {
    period = new BN(numberOfPeriod);
  } else {
    period = currentPoint.sub(activationPoint).div(periodFrequency);

    // clamp to maximum period
    if (period.gt(new BN(numberOfPeriod))) {
      period = new BN(numberOfPeriod);
    }
  }

  return getBaseFeeNumeratorByPeriod(
    cliffFeeNumerator,
    numberOfPeriod,
    period,
    reductionFactor,
    feeSchedulerMode
  );
}
