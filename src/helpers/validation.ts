import BN from "bn.js";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  PoolVersion,
} from "../types";
import {
  getFeeNumeratorFromIncludedFeeAmount,
  getMaxBaseFeeNumerator,
  getFeeTimeMinBaseFeeNumerator,
  isNonZeroRateLimiter,
  isZeroRateLimiter,
  getFeeMarketCapMinBaseFeeNumerator,
} from "../math/poolFees";
import {
  FEE_DENOMINATOR,
  MAX_RATE_LIMITER_DURATION_IN_SECONDS,
  MAX_RATE_LIMITER_DURATION_IN_SLOTS,
  MIN_FEE_NUMERATOR,
} from "../constants";
import { toNumerator } from "../math";
import { getMaxFeeBps, getMaxFeeNumerator } from "../math";

/**
 * Validate fee scheduler parameters
 * @param numberOfPeriod Number of periods
 * @param periodFrequency Period frequency
 * @param reductionFactor Reduction factor
 * @param cliffFeeNumerator Cliff fee numerator
 * @param baseFeeMode Base fee mode
 * @param poolVersion Pool version
 * @throws Error if the fee time scheduler is invalid.
 * @returns True if the fee time scheduler is valid, otherwise false.
 */
export function validateFeeTimeScheduler(
  numberOfPeriod: number,
  periodFrequency: BN,
  reductionFactor: BN,
  cliffFeeNumerator: BN,
  baseFeeMode: BaseFeeMode,
  poolVersion: PoolVersion
): boolean {
  if (
    !periodFrequency.eq(new BN(0)) ||
    numberOfPeriod !== 0 ||
    !reductionFactor.eq(new BN(0))
  ) {
    if (
      numberOfPeriod === 0 ||
      periodFrequency.eq(new BN(0)) ||
      reductionFactor.eq(new BN(0))
    ) {
      throw new Error("PoolError::InvalidFeeTimeScheduler");
    }
  }

  const minFeeNumerator = getFeeTimeMinBaseFeeNumerator(
    cliffFeeNumerator,
    numberOfPeriod,
    reductionFactor,
    baseFeeMode
  );
  const maxFeeNumerator = getMaxBaseFeeNumerator(cliffFeeNumerator);
  validateFeeFraction(minFeeNumerator, new BN(FEE_DENOMINATOR));
  validateFeeFraction(maxFeeNumerator, new BN(FEE_DENOMINATOR));

  if (
    minFeeNumerator.lt(new BN(MIN_FEE_NUMERATOR)) ||
    maxFeeNumerator.gt(getMaxFeeNumerator(poolVersion))
  ) {
    throw new Error("PoolError::ExceedMaxFeeBps");
  }

  return true;
}

/**
 * Validates whether the base fee is static based on the scheduler's expiration.
 * @param currentPoint - The current point as BN.
 * @param activationPoint - The activation point as BN.
 * @param numberOfPeriod - The total number of periods as BN.
 * @param periodFrequency - The period frequency as BN.
 * @returns True if the base fee is static, otherwise false.
 */
export function validateFeeTimeSchedulerBaseFeeIsStatic(
  currentPoint: BN,
  activationPoint: BN,
  numberOfPeriod: BN,
  periodFrequency: BN
): boolean {
  // schedulerExpirationPoint = activationPoint + (numberOfPeriod * periodFrequency)
  const schedulerExpirationPoint = activationPoint.add(
    numberOfPeriod.mul(periodFrequency)
  );

  return currentPoint.gt(schedulerExpirationPoint);
}

/**
 * Validates the Market Cap Fee Scheduler parameters.
 * This checks for non-zero scheduler fields and validates fee fractions and limits, following the Rust logic.
 * @param cliffFeeNumerator - The cliff fee numerator as BN.
 * @param numberOfPeriod - Number of periods (number).
 * @param sqrtPriceStepBps - The sqrt price step in basis points (BN).
 * @param reductionFactor - The reduction factor as BN.
 * @param schedulerExpirationDuration - The scheduler expiration duration as BN.
 * @param feeMarketCapSchedulerMode - The fee scheduler mode (BaseFeeMode).
 * @param poolVersion - The pool version.
 * @throws Error if validation fails.
 * @returns True if the fee market cap scheduler is valid, otherwise false.
 */
export function validateFeeMarketCapScheduler(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  sqrtPriceStepBps: BN,
  reductionFactor: BN,
  schedulerExpirationDuration: BN,
  feeMarketCapSchedulerMode: BaseFeeMode,
  poolVersion: PoolVersion
): boolean {
  // doesn't allow zero fee marketcap scheduler
  if (reductionFactor.lte(new BN(0))) {
    throw new Error("PoolError::InvalidFeeMarketCapScheduler");
  }

  if (sqrtPriceStepBps.lte(new BN(0))) {
    throw new Error("PoolError::InvalidFeeMarketCapScheduler");
  }

  if (schedulerExpirationDuration.lte(new BN(0))) {
    throw new Error("PoolError::InvalidFeeMarketCapScheduler");
  }

  if (numberOfPeriod <= 0) {
    throw new Error("PoolError::InvalidFeeMarketCapScheduler");
  }

  const minFeeNumerator = getFeeMarketCapMinBaseFeeNumerator(
    cliffFeeNumerator,
    numberOfPeriod,
    reductionFactor,
    feeMarketCapSchedulerMode
  );
  const maxFeeNumerator = cliffFeeNumerator;

  validateFeeFraction(minFeeNumerator, new BN(FEE_DENOMINATOR));
  validateFeeFraction(maxFeeNumerator, new BN(FEE_DENOMINATOR));

  const maxAllowedFeeNumerator = getMaxFeeNumerator(poolVersion);

  if (
    minFeeNumerator.lt(new BN(MIN_FEE_NUMERATOR)) ||
    maxFeeNumerator.gt(maxAllowedFeeNumerator)
  ) {
    throw new Error("PoolError::ExceedMaxFeeBps");
  }

  return true;
}

/**
 * Validates whether the base fee is static for market cap fee scheduler, based on scheduler's expiration
 * @param currentPoint - The current point as BN.
 * @param activationPoint - The activation point as BN.
 * @param schedulerExpirationDuration - The scheduler expiration duration as BN.
 * @returns True if the base fee is static, otherwise false.
 */
export function validateFeeMarketCapBaseFeeIsStatic(
  currentPoint: BN,
  activationPoint: BN,
  schedulerExpirationDuration: BN
): boolean {
  // schedulerExpirationPoint = activationPoint + schedulerExpirationDuration
  const schedulerExpirationPoint = activationPoint.add(
    schedulerExpirationDuration
  );

  return currentPoint.gt(schedulerExpirationPoint);
}

/**
 * Validate rate limiter parameters
 * @param cliffFeeNumerator - Cliff fee numerator
 * @param feeIncrementBps - Fee increment bps
 * @param maxLimiterDuration - Max limiter duration
 * @param referenceAmount - Reference amount
 * @param collectFeeMode - Collect fee mode
 * @param activationType - Activation type (slot or timestamp)
 * @returns Validation result
 */
export function validateFeeRateLimiter(
  cliffFeeNumerator: BN,
  feeIncrementBps: number,
  maxFeeBps: number,
  maxLimiterDuration: number,
  referenceAmount: BN,
  collectFeeMode: CollectFeeMode,
  activationType: ActivationType,
  poolVersion: PoolVersion
): boolean {
  // can only be applied in OnlyB collect fee mode
  if (collectFeeMode !== CollectFeeMode.OnlyB) {
    return false;
  }

  // max_fee_numerator_from_bps = to_numerator(maxFeeBps, FEE_DENOMINATOR)
  const maxFeeNumeratorFromBps = toNumerator(
    new BN(maxFeeBps),
    new BN(FEE_DENOMINATOR)
  );

  // cliff_fee_numerator >= MIN_FEE_NUMERATOR && cliff_fee_numerator <= max_fee_numerator_from_bps
  if (
    cliffFeeNumerator.lt(new BN(MIN_FEE_NUMERATOR)) ||
    cliffFeeNumerator.gt(maxFeeNumeratorFromBps)
  ) {
    return false;
  }

  // is_zero_rate_limiter
  if (
    isZeroRateLimiter(
      referenceAmount,
      maxLimiterDuration,
      maxFeeBps,
      feeIncrementBps
    )
  ) {
    return true;
  }

  if (
    isNonZeroRateLimiter(
      referenceAmount,
      maxLimiterDuration,
      maxFeeBps,
      feeIncrementBps
    )
  ) {
    return false;
  }

  // max_limiter_duration = match activation_type
  const maxLimiterDurationLimit =
    activationType === ActivationType.Slot
      ? new BN(MAX_RATE_LIMITER_DURATION_IN_SLOTS)
      : new BN(MAX_RATE_LIMITER_DURATION_IN_SECONDS);

  if (new BN(maxLimiterDuration).gt(maxLimiterDurationLimit)) {
    return false;
  }

  // fee_increment_numerator = to_numerator(feeIncrementBps, FEE_DENOMINATOR)
  const feeIncrementNumerator = toNumerator(
    new BN(feeIncrementBps),
    new BN(FEE_DENOMINATOR)
  );
  if (feeIncrementNumerator.gte(new BN(FEE_DENOMINATOR))) {
    return false;
  }

  if (maxFeeBps > getMaxFeeBps(poolVersion)) {
    return false;
  }

  // validate max fee (more amount, then more fee)
  const minFeeNumerator = getFeeNumeratorFromIncludedFeeAmount(
    new BN(0),
    cliffFeeNumerator,
    referenceAmount,
    maxFeeBps,
    feeIncrementBps
  );
  const maxFeeNumeratorFromAmount = getFeeNumeratorFromIncludedFeeAmount(
    new BN(Number.MAX_SAFE_INTEGER),
    cliffFeeNumerator,
    referenceAmount,
    maxFeeBps,
    feeIncrementBps
  );

  if (
    minFeeNumerator.lt(new BN(MIN_FEE_NUMERATOR)) ||
    maxFeeNumeratorFromAmount.gt(getMaxFeeNumerator(poolVersion))
  ) {
    return false;
  }

  return true;
}

/**
 * Validates whether the rate limiter base fee is static based on the current and activation points, as well as the maxLimiterDuration and referenceAmount.
 * @param currentPoint - The current point as BN.
 * @param activationPoint - The activation point as BN.
 * @param maxLimiterDuration - The max limiter duration as number.
 * @param referenceAmount - The reference amount as BN.
 * @param maxFeeBps - The max fee in basis points as number.
 * @param feeIncrementBps - The fee increment in basis points as number.
 * @returns True if the base fee is static, otherwise false.
 */
export function validateFeeRateLimiterBaseFeeIsStatic(
  currentPoint: BN,
  activationPoint: BN,
  maxLimiterDuration: number,
  referenceAmount: BN,
  maxFeeBps: number,
  feeIncrementBps: number
): boolean {
  // if the rate limiter is zero, return true
  if (
    isZeroRateLimiter(
      referenceAmount,
      maxLimiterDuration,
      maxFeeBps,
      feeIncrementBps
    )
  ) {
    return true;
  }

  // last_effective_rate_limiter_point = activationPoint + maxLimiterDuration
  const lastEffectiveRateLimiterPoint = activationPoint.add(
    new BN(maxLimiterDuration)
  );

  return currentPoint.gt(lastEffectiveRateLimiterPoint);
}

/**
 * Validates that the fee fraction is valid (numerator < denominator, denominator != 0)
 * @param numerator - The numerator of the fee fraction
 * @param denominator - The denominator of the fee fraction
 * @throws Error if the fee fraction is invalid
 */
export function validateFeeFraction(numerator: BN, denominator: BN): void {
  if (denominator.isZero() || numerator.gte(denominator)) {
    throw new Error(
      "InvalidFee: Fee numerator must be less than denominator and denominator must be non-zero"
    );
  }
}
