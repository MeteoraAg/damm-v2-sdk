import BN from "bn.js";
import { Rounding, TradeDirection } from "../../types";
import { FEE_DENOMINATOR, U64_MAX } from "../../constants";
import { getExcludedFeeAmount, getIncludedFeeAmount } from "../feeMath";
import { mulDiv, sqrt } from "../utilsMath";
import { toNumerator } from "../feeMath";

/// we denote reference_amount = x0, cliff_fee_numerator = c, fee_increment = i
/// if input_amount <= x0, then fee = input_amount * c
///
/// if input_amount > x0, then input_amount = x0 + (a * x0 + b)
/// if a < max_index
/// then fee = x0 * c + x0 * (c + i) + .... + x0 * (c + i*a) + b * (c + i * (a+1))
/// then fee = x0 * (c + c*a + i*a*(a+1)/2) + b * (c + i * (a+1))
///
/// if a >= max_index
/// if a = max_index + d, input_amount = x0 + max_index * x0 + (d * x0 + b)
/// then fee = x0 * (c + c*max_index + i*max_index*(max_index+1)/2) + (d * x0 + b) * MAX_FEE

/**
 * Checks if the rate limiter is zero.
 * @param referenceAmount - The reference amount.
 * @param maxLimiterDuration - The maximum rate limiter duration.
 * @param maxFeeBps - The maximum fee in basis points.
 * @param feeIncrementBps - The fee increment in basis points.
 * @returns True if the rate limiter is zero, false otherwise.
 */
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

/**
 * Checks if the rate limiter is non-zero.
 * @param referenceAmount - The reference amount.
 * @param maxLimiterDuration - The maximum rate limiter duration.
 * @param maxFeeBps - The maximum fee in basis points.
 * @param feeIncrementBps - The fee increment in basis points.
 * @returns True if the rate limiter is non-zero, false otherwise.
 */
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

/**
 * Checks if the rate limiter is applied.
 * @param referenceAmount - The reference amount.
 * @param maxLimiterDuration - The maximum rate limiter duration.
 * @param maxFeeBps - The maximum fee in basis points.
 * @param feeIncrementBps - The fee increment in basis points.
 * @param currentPoint - The current point.
 * @param activationPoint - The activation point.
 * @param tradeDirection - The trade direction.
 * @returns True if the rate limiter is applied, false otherwise.
 */
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

/**
 * Gets the maximum index.
 * @param maxFeeBps - The maximum fee in basis points.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param feeIncrementBps - The fee increment in basis points.
 * @returns The maximum index.
 */
export function getMaxIndex(
  maxFeeBps: number,
  cliffFeeNumerator: BN,
  feeIncrementBps: number
): BN {
  // max_fee_numerator = to_numerator(maxFeeBps, FEE_DENOMINATOR)
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

/**
 * Gets the fee numerator from included fee amount.
 * @param inputAmount - The input amount.
 * @param referenceAmount - The reference amount.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param maxFeeBps - The maximum fee in basis points.
 * @param feeIncrementBps - The fee increment in basis points.
 * @returns The fee numerator from included fee amount.
 */
export function getFeeNumeratorFromIncludedFeeAmount(
  inputAmount: BN,
  referenceAmount: BN,
  cliffFeeNumerator: BN,
  maxFeeBps: number,
  feeIncrementBps: number
): BN {
  if (inputAmount.lte(referenceAmount)) {
    return cliffFeeNumerator;
  } else {
    // max_fee_numerator = to_numerator(maxFeeBps, FEE_DENOMINATOR)
    const maxFeeNumerator = toNumerator(
      new BN(maxFeeBps),
      new BN(FEE_DENOMINATOR)
    );

    const c = cliffFeeNumerator;
    // a = (inputAmount - referenceAmount) / referenceAmount
    // b = (inputAmount - referenceAmount) % referenceAmount
    const inputMinusRef = inputAmount.sub(referenceAmount);
    const a = inputMinusRef.div(referenceAmount);
    const b = inputMinusRef.mod(referenceAmount);

    const maxIndex = getMaxIndex(maxFeeBps, cliffFeeNumerator, feeIncrementBps);
    const i = toNumerator(new BN(feeIncrementBps), new BN(FEE_DENOMINATOR));
    const x0 = referenceAmount;
    const one = new BN(1);
    const two = new BN(2);

    let tradingFeeNumerator: BN;
    if (a.lt(maxIndex)) {
      // numerator_1 = c + c * a + i * a * (a + one) / two
      const numerator1 = c.add(c.mul(a)).add(i.mul(a).mul(a.add(one)).div(two));
      // numerator_2 = c + i * (a + one)
      const numerator2 = c.add(i.mul(a.add(one)));
      // first_fee = x0 * numerator_1
      const firstFee = x0.mul(numerator1);
      // second_fee = b * numerator_2
      const secondFee = b.mul(numerator2);
      tradingFeeNumerator = firstFee.add(secondFee);
    } else {
      // numerator_1 = c + c * max_index + i * max_index * (max_index + one) / two
      const numerator1 = c
        .add(c.mul(maxIndex))
        .add(i.mul(maxIndex).mul(maxIndex.add(one)).div(two));
      // numerator_2 = maxFeeNumerator
      const numerator2 = maxFeeNumerator;
      // first_fee = x0 * numerator_1
      const firstFee = x0.mul(numerator1);

      // d = a - max_index
      const d = a.sub(maxIndex);
      // left_amount = d * x0 + b
      const leftAmount = d.mul(x0).add(b);
      // second_fee = left_amount * numerator_2
      const secondFee = leftAmount.mul(numerator2);
      tradingFeeNumerator = firstFee.add(secondFee);
    }

    const denominator = new BN(FEE_DENOMINATOR);
    // trading_fee = (trading_fee_numerator + denominator - one) / denominator
    const tradingFee = tradingFeeNumerator
      .add(denominator)
      .sub(one)
      .div(denominator);

    // reverse to fee numerator
    // input_amount * numerator / FEE_DENOMINATOR = trading_fee
    // then numerator = trading_fee * FEE_DENOMINATOR / input_amount (rounded up)
    const numerator = mulDiv(tradingFee, denominator, inputAmount, Rounding.Up);

    if (numerator.gt(new BN(U64_MAX))) {
      throw new Error("Numerator does not fit in u64");
    }

    return numerator;
  }
}

/**
 * Gets the excluded fee amount from included fee amount.
 * @param includedFeeAmount - The included fee amount.
 * @param referenceAmount - The reference amount.
 * @param cliffFeeNumerator - The cliff fee numerator.
 * @param maxFeeBps - The maximum fee in basis points.
 * @param feeIncrementBps - The fee increment in basis points.
 * @returns The excluded fee amount.
 */
export function getExcludedFeeAmountFromIncludedFeeAmount(
  includedFeeAmount: BN,
  referenceAmount: BN,
  cliffFeeNumerator: BN,
  maxFeeBps: number,
  feeIncrementBps: number
): BN {
  const feeNumerator = getFeeNumeratorFromIncludedFeeAmount(
    includedFeeAmount,
    referenceAmount,
    cliffFeeNumerator,
    maxFeeBps,
    feeIncrementBps
  );
  const { excludedFeeAmount } = getExcludedFeeAmount(
    feeNumerator,
    includedFeeAmount
  );
  return excludedFeeAmount;
}

/**
 * Returns checked output and input amounts, and a flag indicating if the input was capped at u64::MAX.
 * @param referenceAmount - The reference amount
 * @param cliffFeeNumerator - The cliff fee numerator
 * @param maxFeeBps - The maximum fee in basis points
 * @param feeIncrementBps - The fee increment in basis points
 * @returns [checkedOutputAmount: BN, checkedIncludedFeeAmount: BN, capped: boolean]
 */
export function getCheckedAmounts(
  referenceAmount: BN,
  cliffFeeNumerator: BN,
  maxFeeBps: number,
  feeIncrementBps: number
): [BN, BN, boolean] {
  const maxIndex = getMaxIndex(maxFeeBps, cliffFeeNumerator, feeIncrementBps);

  const x0 = referenceAmount;
  const one = new BN(1);
  const maxIndexInputAmount = maxIndex.add(one).mul(x0);

  if (maxIndexInputAmount.lte(U64_MAX)) {
    const checkedIncludedFeeAmount = maxIndexInputAmount;
    const checkedOutputAmount = getExcludedFeeAmountFromIncludedFeeAmount(
      checkedIncludedFeeAmount,
      referenceAmount,
      cliffFeeNumerator,
      maxFeeBps,
      feeIncrementBps
    );
    return [checkedOutputAmount, checkedIncludedFeeAmount, false];
  } else {
    const checkedIncludedFeeAmount = U64_MAX;
    const checkedOutputAmount = getExcludedFeeAmountFromIncludedFeeAmount(
      checkedIncludedFeeAmount,
      referenceAmount,
      cliffFeeNumerator,
      maxFeeBps,
      feeIncrementBps
    );
    return [checkedOutputAmount, checkedIncludedFeeAmount, true];
  }
}

/**
 * Calculates the fee numerator from an excluded fee amount.
 * @param excludedFeeAmount - The excluded fee amount
 * @param referenceAmount - The reference amount
 * @param cliffFeeNumerator - The cliff fee numerator
 * @param maxFeeBps - The maximum fee in basis points
 * @param feeIncrementBps - The fee increment in basis points
 * @returns The fee numerator
 */
export function getFeeNumeratorFromExcludedFeeAmount(
  excludedFeeAmount: BN,
  referenceAmount: BN,
  cliffFeeNumerator: BN,
  maxFeeBps: number,
  feeIncrementBps: number
): BN {
  // get excluded fee reference amount
  const excludedFeeReferenceAmount = getExcludedFeeAmountFromIncludedFeeAmount(
    referenceAmount,
    referenceAmount,
    cliffFeeNumerator,
    maxFeeBps,
    feeIncrementBps
  );
  if (excludedFeeAmount.lte(excludedFeeReferenceAmount)) {
    return cliffFeeNumerator;
  }

  // get checked amounts
  const [checkedExcludedFeeAmount, checkedIncludedFeeAmount, isOverflow] =
    getCheckedAmounts(
      referenceAmount,
      cliffFeeNumerator,
      maxFeeBps,
      feeIncrementBps
    );

  if (excludedFeeAmount.eq(checkedExcludedFeeAmount)) {
    return getFeeNumeratorFromIncludedFeeAmount(
      checkedIncludedFeeAmount,
      referenceAmount,
      cliffFeeNumerator,
      maxFeeBps,
      feeIncrementBps
    );
  }

  let includedFeeAmount: BN;
  if (excludedFeeAmount.lt(checkedExcludedFeeAmount)) {
    const TWO = new BN(2);
    const FOUR = new BN(4);
    // d: fee denominator
    // ex: excluded_fee_amount
    // input_amount = x0 + (a * x0)
    // fee = x0 * (c + c*a + i*a*(a+1)/2) / d
    // fee = x0 * (a+1) * (c + i*a/2) / d
    // fee = input_amount * (c + i * (input_amount/x0-1)/2) / d
    // ex = input_amount - fee
    // ex = input_amount - input_amount * (c + i * (input_amount/x0-1)/2) / d
    // ex * d * 2 = input_amount * d * 2 - input_amount * (2 * c + i * (input_amount/x0-1))
    // ex * d * 2 * x0 = input_amount * d * 2 * x0 - input_amount * (2 * c * x0 + i * (input_amount-x0))
    // ex * d * 2 * x0 = input_amount * d * 2 * x0 - input_amount * (2 * c * x0 + i * input_amount- i*x0)
    // ex * d * 2 * x0 = input_amount * d * 2 * x0 - input_amount * 2 * c * x0 - i * input_amount ^ 2 + input_amount * i*x0
    // i * input_amount ^ 2 - input_amount * (-2 * c * x0 + i*x0 + d * 2 * x0) + ex * d * 2 * x0 = 0
    // equation: x * input_amount ^ 2  - y * input_amount + z = 0
    // x = i, y =  (-2 * c * x0 + i*x0 + d * 2 * x0), z = ex * d * 2 * x0
    // input_amount = (y +(-) sqrt(y^2 - 4xz)) / 2x
    const i = toNumerator(new BN(feeIncrementBps), new BN(FEE_DENOMINATOR));
    const x0 = referenceAmount;
    const d = new BN(FEE_DENOMINATOR);
    const c = cliffFeeNumerator;
    const ex = excludedFeeAmount;

    // x = i
    const x = i;
    // y = 2*d*x0 + i*x0 - 2*c*x0
    const y = TWO.mul(d).mul(x0).add(i.mul(x0)).sub(TWO.mul(c).mul(x0)); // y is always greater than 0
    // z = 2*ex*d*x0
    const z = TWO.mul(ex).mul(d).mul(x0);

    // solve quadratic equation
    // discriminant: y^2 - 4xz
    const discriminant = y.mul(y).sub(FOUR.mul(x).mul(z));
    const sqrtDiscriminant = sqrt(discriminant);

    includedFeeAmount = y.sub(sqrtDiscriminant).div(TWO.mul(x));

    // included_fee_amount = (y - sqrt(discriminant)) / (2x)
    const numerator = y.sub(sqrtDiscriminant);
    const denominator = TWO.mul(x);

    includedFeeAmount = numerator.div(denominator);
    // a_plus_one = included_fee_amount / x0
    const aPlusOne = includedFeeAmount.div(x0);

    const firstExcludedFeeAmount = getExcludedFeeAmountFromIncludedFeeAmount(
      includedFeeAmount,
      referenceAmount,
      cliffFeeNumerator,
      maxFeeBps,
      feeIncrementBps
    );
    // excluded_fee_remaining_amount = excludedFeeAmount - firstExcludedFeeAmount
    const excludedFeeRemainingAmount = excludedFeeAmount.sub(
      firstExcludedFeeAmount
    );

    // remaining_amount_fee_numerator = c + i * a_plus_one
    const remainingAmountFeeNumerator = c.add(i.mul(aPlusOne));

    // included_fee_remaining_amount = getIncludedFeeAmount(remainingAmountFeeNumerator, excludedFeeRemainingAmount)
    const includedFeeRemainingAmount = getIncludedFeeAmount(
      remainingAmountFeeNumerator,
      excludedFeeRemainingAmount
    );

    // total_in_amount = includedFeeAmount + includedFeeRemainingAmount
    includedFeeAmount = includedFeeAmount.add(includedFeeRemainingAmount);
  } else {
    // excludedFeeAmount > checkedExcludedFeeAmount
    if (isOverflow) {
      throw new Error("Math overflow in getFeeNumeratorFromExcludedFeeAmount");
    }
    // excluded_fee_remaining_amount = excludedFeeAmount - checkedExcludedFeeAmount
    const excludedFeeRemainingAmount = excludedFeeAmount.sub(
      checkedExcludedFeeAmount
    );

    const maxFeeNumerator = toNumerator(
      new BN(maxFeeBps),
      new BN(FEE_DENOMINATOR)
    );
    const includedFeeRemainingAmount = getIncludedFeeAmount(
      maxFeeNumerator,
      excludedFeeRemainingAmount
    );

    // total_amount_in = includedFeeRemainingAmount + checkedIncludedFeeAmount
    includedFeeAmount = includedFeeRemainingAmount.add(
      checkedIncludedFeeAmount
    );
  }

  // trading_fee = includedFeeAmount - excludedFeeAmount
  const tradingFee = includedFeeAmount.sub(excludedFeeAmount);

  // fee_numerator = mulDiv(tradingFee, FEE_DENOMINATOR, includedFeeAmount, Rounding.Up)
  const feeNumerator = mulDiv(
    tradingFee,
    new BN(FEE_DENOMINATOR),
    includedFeeAmount,
    Rounding.Up
  );

  // sanity check
  if (feeNumerator.lt(cliffFeeNumerator)) {
    throw new Error("feeNumerator is less than cliffFeeNumerator");
  }

  return feeNumerator;
}
