import BN from "bn.js";
import { TradeDirection } from "../../types";
import { BASIS_POINT_MAX, FEE_DENOMINATOR, U64_MAX } from "../../constants";

export function isZeroRateLimiter(
  referenceAmount: BN,
  maxLimiterDuration: number,
  maxFeeBps: number,
  feeIncrementBps: number
): boolean {
  return (
    referenceAmount.isZero() &&
    maxLimiterDuration === 0 &&
    maxFeeBps === 0 &&
    feeIncrementBps === 0
  );
}

export function isNonZeroRateLimiter(
  referenceAmount: BN,
  maxLimiterDuration: number,
  maxFeeBps: number,
  feeIncrementBps: number
): boolean {
  return (
    referenceAmount.isZero() &&
    maxLimiterDuration !== 0 &&
    maxFeeBps !== 0 &&
    feeIncrementBps !== 0
  );
}

export function isRateLimiterApplied(
  referenceAmount: BN,
  maxLimiterDuration: number,
  maxFeeBps: number,
  feeIncrementBps: number,
  currentPoint: BN,
  activationPoint: BN,
  tradeDirection: TradeDirection
): boolean {
  // if rate limiter is zero, return false
  if (
    isZeroRateLimiter(
      referenceAmount,
      maxLimiterDuration,
      maxFeeBps,
      feeIncrementBps
    )
  ) {
    return false;
  }

  // only handle for the case B to A and collect fee mode in token B
  if (tradeDirection === TradeDirection.AtoB) {
    return false;
  }

  if (currentPoint.lt(activationPoint)) {
    return false;
  }

  // last_effective_rate_limiter_point = activation_point + max_limiter_duration
  const lastEffectiveRateLimiterPoint = activationPoint.add(
    new BN(maxLimiterDuration)
  );

  if (currentPoint.gt(lastEffectiveRateLimiterPoint)) {
    return false;
  }

  return true;
}

export function toNumerator(bps: BN, denominator: BN): BN {
  const numerator = bps.mul(denominator).div(new BN(BASIS_POINT_MAX));

  if (numerator.gt(new BN(U64_MAX))) {
    throw new Error("Numerator does not fit in u64");
  }

  return numerator;
}

export function getMaxIndex(
  maxFeeBps: number,
  cliffFeeNumerator: BN,
  feeIncrementBps: number
): BN {
  // Compute max_fee_numerator = to_numerator(maxFeeBps, FEE_DENOMINATOR)
  const maxFeeNumerator = toNumerator(
    new BN(maxFeeBps),
    new BN(FEE_DENOMINATOR)
  );

  // delta_numerator = max_fee_numerator.safe_sub(cliff_fee_numerator)
  if (cliffFeeNumerator.gt(maxFeeNumerator)) {
    throw new Error("cliffFeeNumerator cannot be greater than maxFeeNumerator");
  }
  const deltaNumerator = maxFeeNumerator.sub(cliffFeeNumerator);

  // fee_increment_numerator = to_numerator(feeIncrementBps, FEE_DENOMINATOR)
  const feeIncrementNumerator = toNumerator(
    new BN(feeIncrementBps),
    new BN(FEE_DENOMINATOR)
  );

  if (feeIncrementNumerator.isZero()) {
    throw new Error("feeIncrementNumerator cannot be zero");
  }

  const maxIndex = deltaNumerator.div(feeIncrementNumerator);

  return maxIndex;
}
