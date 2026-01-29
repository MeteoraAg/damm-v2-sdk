import BN from "bn.js";
import { BaseFeeMode } from "../../types";
import { BASIS_POINT_MAX } from "../../constants";
import {
  getFeeNumeratorOnExponentialFeeScheduler,
  getFeeNumeratorOnLinearFeeScheduler,
} from "./feeScheduler";

/**
 * Gets the base fee numerator by period for the market cap fee scheduler.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param numberOfPeriod - The number of periods.
 * @param period - The period.
 * @param reductionFactor - The reduction factor.
 * @param feeMarketCapSchedulerMode - The fee scheduler mode.
 * @returns The base fee numerator by period.
 */
export function getFeeMarketCapBaseFeeNumeratorByPeriod(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  period: BN,
  reductionFactor: BN,
  feeMarketCapSchedulerMode: BaseFeeMode,
): BN {
  const periodValue = BN.min(period, new BN(numberOfPeriod));
  const periodNumber = periodValue.toNumber();

  switch (feeMarketCapSchedulerMode) {
    case BaseFeeMode.FeeMarketCapSchedulerLinear: {
      const feeNumerator = getFeeNumeratorOnLinearFeeScheduler(
        cliffFeeNumerator,
        reductionFactor,
        periodNumber,
      );
      return feeNumerator;
    }
    case BaseFeeMode.FeeMarketCapSchedulerExponential: {
      const feeNumerator = getFeeNumeratorOnExponentialFeeScheduler(
        cliffFeeNumerator,
        reductionFactor,
        periodNumber,
      );
      return feeNumerator;
    }
    default:
      throw new Error("Invalid fee market cap scheduler mode");
  }
}

/**
 * Gets the base fee numerator for market cap scheduler.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param numberOfPeriod - The number of periods.
 * @param sqrtPriceStepBps - The sqrt price step bps.
 * @param schedulerExpirationDuration - The scheduler expiration duration.
 * @param reductionFactor - The reduction factor.
 * @param feeMarketCapSchedulerMode - The fee scheduler mode.
 * @param currentPoint - The current point.
 * @param activationPoint - The activation point.
 * @param initSqrtPrice - The initial sqrt price.
 * @param currentSqrtPrice - The current sqrt price.
 * @returns The base fee numerator.
 */
export function getFeeMarketCapBaseFeeNumerator(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  sqrtPriceStepBps: number,
  schedulerExpirationDuration: number,
  reductionFactor: BN,
  feeMarketCapSchedulerMode: BaseFeeMode,
  currentPoint: BN,
  activationPoint: BN,
  initSqrtPrice: BN,
  currentSqrtPrice: BN,
): BN {
  const schedulerExpirationPoint = activationPoint.add(
    new BN(schedulerExpirationDuration),
  );

  let period: BN;

  if (
    currentPoint.gt(schedulerExpirationPoint) ||
    currentPoint.lt(activationPoint)
  ) {
    // expired or alpha vault is buying
    period = new BN(numberOfPeriod);
  } else {
    if (currentSqrtPrice.lte(initSqrtPrice)) {
      period = new BN(0);
    } else {
      const maxBps = new BN(BASIS_POINT_MAX);
      const stepBps = new BN(sqrtPriceStepBps);
      const passedPeriod = currentSqrtPrice
        .sub(initSqrtPrice)
        .mul(maxBps)
        .div(initSqrtPrice)
        .div(stepBps);

      if (passedPeriod.gt(new BN(numberOfPeriod))) {
        period = new BN(numberOfPeriod);
      } else {
        period = passedPeriod;
      }
    }
    period = BN.min(period, new BN(numberOfPeriod));
  }

  return getFeeMarketCapBaseFeeNumeratorByPeriod(
    cliffFeeNumerator,
    numberOfPeriod,
    period,
    reductionFactor,
    feeMarketCapSchedulerMode,
  );
}

/**
 * Gets the min base fee numerator for market cap scheduler.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param numberOfPeriod - The number of periods.
 * @param reductionFactor - The reduction factor.
 * @param feeMarketCapSchedulerMode - The fee scheduler mode.
 * @returns The min base fee numerator.
 */
export function getFeeMarketCapMinBaseFeeNumerator(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  reductionFactor: BN,
  feeMarketCapSchedulerMode: BaseFeeMode,
): BN {
  return getFeeMarketCapBaseFeeNumeratorByPeriod(
    cliffFeeNumerator,
    numberOfPeriod,
    new BN(numberOfPeriod),
    reductionFactor,
    feeMarketCapSchedulerMode,
  );
}

/**
 * Gets the max base fee numerator for market cap scheduler.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @returns The max base fee numerator.
 */
export function getFeeMarketCapMaxBaseFeeNumerator(cliffFeeNumerator: BN): BN {
  return cliffFeeNumerator;
}
