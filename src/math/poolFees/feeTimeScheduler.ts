import BN from "bn.js";
import { BaseFeeMode } from "../../types";
import { U16_MAX } from "../../constants";

import { BorshFeeTimeScheduler, PodAlignedFeeTimeScheduler } from "../../types";
import {
  getFeeNumeratorOnExponentialFeeScheduler,
  getFeeNumeratorOnLinearFeeScheduler,
} from "./feeScheduler";

/**
 * Converts a BorshFeeTimeScheduler object to a PodAlignedFeeTimeScheduler object,
 * @param borshFeeScheduler The BorshFeeTimeScheduler instance to convert.
 * @returns The corresponding PodAlignedFeeTimeScheduler object.
 */
export function toPodAlignedFeeTimeScheduler(
  borshFeeScheduler: BorshFeeTimeScheduler
): PodAlignedFeeTimeScheduler {
  return {
    cliffFeeNumerator: borshFeeScheduler.cliffFeeNumerator,
    baseFeeMode: borshFeeScheduler.baseFeeMode,
    padding: new Array(16).fill(0), // Assumes default/rust alignment of 16
    numberOfPeriod: borshFeeScheduler.numberOfPeriod,
    periodFrequency: borshFeeScheduler.periodFrequency,
    reductionFactor: borshFeeScheduler.reductionFactor,
  };
}

/**
 * Converts a PodAlignedFeeTimeScheduler object to a BorshFeeTimeScheduler object,
 * @param podAlignedFeeScheduler The PodAlignedFeeTimeScheduler instance to convert.
 * @returns The corresponding BorshFeeTimeScheduler object.
 */
export function toBorshFeeTimeScheduler(
  podAlignedFeeScheduler: PodAlignedFeeTimeScheduler
): BorshFeeTimeScheduler {
  return {
    cliffFeeNumerator: podAlignedFeeScheduler.cliffFeeNumerator,
    numberOfPeriod: podAlignedFeeScheduler.numberOfPeriod,
    periodFrequency: podAlignedFeeScheduler.periodFrequency,
    reductionFactor: podAlignedFeeScheduler.reductionFactor,
    baseFeeMode: podAlignedFeeScheduler.baseFeeMode,
    padding: new Array(16).fill(0), // Assumes default/rust alignment of 16
  };
}

/**
 * Gets the base fee numerator by period for the time fee scheduler.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param numberOfPeriod - The number of periods.
 * @param period - The period.
 * @param reductionFactor - The reduction factor.
 * @param feeTimeSchedulerMode - The fee scheduler mode.
 * @returns The base fee numerator by period.
 */
export function getFeeTimeBaseFeeNumeratorByPeriod(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  period: BN,
  reductionFactor: BN,
  feeTimeSchedulerMode: BaseFeeMode
): BN {
  const periodValue = BN.min(period, new BN(numberOfPeriod));
  const periodNumber = periodValue.toNumber();
  if (periodNumber > U16_MAX) {
    throw new Error("Math overflow");
  }

  switch (feeTimeSchedulerMode) {
    case BaseFeeMode.FeeTimeSchedulerLinear: {
      const feeNumerator = getFeeNumeratorOnLinearFeeScheduler(
        cliffFeeNumerator,
        reductionFactor,
        periodNumber
      );
      return feeNumerator;
    }
    case BaseFeeMode.FeeTimeSchedulerExponential: {
      const feeNumerator = getFeeNumeratorOnExponentialFeeScheduler(
        cliffFeeNumerator,
        reductionFactor,
        periodNumber
      );
      return feeNumerator;
    }
    default:
      throw new Error("Invalid fee time scheduler mode");
  }
}

/**
 * Gets the base fee numerator.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param numberOfPeriod - The number of periods.
 * @param periodFrequency - The period frequency.
 * @param reductionFactor - The reduction factor.
 * @param feeTimeSchedulerMode - The fee scheduler mode.
 * @param currentPoint - The current point.
 * @param activationPoint - The activation point.
 * @returns The base fee numerator.
 */
export function getFeeTimeBaseFeeNumerator(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  periodFrequency: BN,
  reductionFactor: BN,
  feeTimeSchedulerMode: BaseFeeMode,
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

  return getFeeTimeBaseFeeNumeratorByPeriod(
    cliffFeeNumerator,
    numberOfPeriod,
    period,
    reductionFactor,
    feeTimeSchedulerMode
  );
}

/**
 * Gets the min base fee numerator.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param numberOfPeriod - The number of periods.
 * @param periodFrequency - The period frequency.
 * @param reductionFactor - The reduction factor.
 * @param feeTimeSchedulerMode - The fee scheduler mode.
 * @returns The min base fee numerator.
 */
export function getFeeTimeMinBaseFeeNumerator(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  reductionFactor: BN,
  feeTimeSchedulerMode: BaseFeeMode
): BN {
  return getFeeTimeBaseFeeNumeratorByPeriod(
    cliffFeeNumerator,
    numberOfPeriod,
    new BN(numberOfPeriod),
    reductionFactor,
    feeTimeSchedulerMode
  );
}
