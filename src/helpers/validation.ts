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
  getMinBaseFeeNumerator,
  isNonZeroRateLimiter,
  isZeroRateLimiter,
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
 * @returns Validation result
 */
export function validateFeeScheduler(
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
      return false;
    }
  }

  const minFeeNumerator = getMinBaseFeeNumerator(
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
