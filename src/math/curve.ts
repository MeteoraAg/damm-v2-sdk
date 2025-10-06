import BN from "bn.js";
import { mulDiv } from "./utilsMath";
import { SCALE_OFFSET, U64_MAX } from "../constants";
import { Rounding } from "../types";

/**
 * Gets the next sqrt price given a delta of token_b (input), rounding down.
 * √P' = √P + Δb / L
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amount - delta of token_b (BN)
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromAmountInBRoundingDown(
  sqrtPrice: BN,
  liquidity: BN,
  amount: BN
): BN {
  // quotient = (amount << (SCALE_OFFSET * 2)) / liquidity
  const quotient = amount.shln(SCALE_OFFSET * 2).div(liquidity);

  // result = sqrtPrice + quotient
  const result = sqrtPrice.add(quotient);

  return result;
}

/**
 * Gets the next sqrt price given a delta of token_b (output), rounding down.
 * √P' = √P - Δb / L
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amount - delta of token_b (BN)
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromAmountOutBRoundingDown(
  sqrtPrice: BN,
  liquidity: BN,
  amount: BN
): BN {
  // quotient = ceil((amount << (SCALE_OFFSET * 2)) / liquidity)
  const numerator = amount.shln(SCALE_OFFSET * 2);
  const quotient = numerator.add(liquidity).subn(1).div(liquidity);

  // result = sqrtPrice - quotient
  const result = sqrtPrice.sub(quotient);

  if (result.isNeg()) {
    throw new Error("sqrt price cannot be negative");
  }

  return result;
}

/**
 * Gets the next sqrt price √P' given a delta of token_a, rounding up.
 * √P' = √P * L / (L + Δa * √P)
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amount - delta of token_a (BN)
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromAmountInARoundingUp(
  sqrtPrice: BN,
  liquidity: BN,
  amount: BN
): BN {
  if (amount.isZero()) {
    return sqrtPrice;
  }

  // product = amountIn * sqrtPrice
  const product = amount.mul(sqrtPrice);

  // denominator = liquidity + product
  const denominator = liquidity.add(product);

  // result = mulDiv(liquidity, sqrtPrice, denominator, Rounding.Up)
  const result = mulDiv(liquidity, sqrtPrice, denominator, Rounding.Up);

  return result;
}

/**
 * Gets the next sqrt price √P' given a delta of token_a (output), rounding up.
 * √P' = √P * L / (L - Δa * √P)
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amount - delta of token_a (BN)
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromAmountOutARoundingUp(
  sqrtPrice: BN,
  liquidity: BN,
  amount: BN
): BN {
  if (amount.isZero()) {
    return sqrtPrice;
  }

  // product = amount * sqrtPrice
  const product = amount.mul(sqrtPrice);

  const denominator = liquidity.sub(product);
  if (denominator.lte(new BN(0))) {
    throw new Error("MathOverflow: denominator is zero or negative");
  }

  // result = mulDiv(liquidity, sqrtPrice, denominator, Rounding.Up)
  return mulDiv(liquidity, sqrtPrice, denominator, Rounding.Up);
}

/**
 * Gets the next sqrt price given an output amount of token_a or token_b.
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amountOut - output amount (BN)
 * @param aForB - true if swapping A for B, false if B for A
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromOutput(
  sqrtPrice: BN,
  liquidity: BN,
  amountOut: BN,
  aForB: boolean
): BN {
  if (sqrtPrice.lte(new BN(0))) {
    throw new Error("sqrtPrice must be greater than 0");
  }
  if (liquidity.lte(new BN(0))) {
    throw new Error("liquidity must be greater than 0");
  }

  if (aForB) {
    return getNextSqrtPriceFromAmountOutBRoundingDown(
      sqrtPrice,
      liquidity,
      amountOut
    );
  } else {
    return getNextSqrtPriceFromAmountOutARoundingUp(
      sqrtPrice,
      liquidity,
      amountOut
    );
  }
}

/**
 * Gets the next sqrt price given an input amount of token_a or token_b
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amountIn - input amount (BN)
 * @param aForB - true if swapping A for B, false if B for A
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromInput(
  sqrtPrice: BN,
  liquidity: BN,
  amountIn: BN,
  aForB: boolean
): BN {
  if (sqrtPrice.lte(new BN(0))) {
    throw new Error("sqrtPrice must be greater than 0");
  }
  if (liquidity.lte(new BN(0))) {
    throw new Error("liquidity must be greater than 0");
  }

  if (aForB) {
    // Rounding up for A to B
    return getNextSqrtPriceFromAmountInARoundingUp(
      sqrtPrice,
      liquidity,
      amountIn
    );
  } else {
    // Rounding down for B to A
    return getNextSqrtPriceFromAmountInBRoundingDown(
      sqrtPrice,
      liquidity,
      amountIn
    );
  }
}

/**
 * Gets the delta amount of token_b for given liquidity and price range. (getDeltaAmountBUnsigned)
 * @param lowerSqrtPrice - lower sqrt price (BN)
 * @param upperSqrtPrice - upper sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param rounding - rounding (Rounding)
 * @returns delta amount of token_b (BN)
 */
export function getAmountBFromLiquidityDelta(
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  liquidity: BN,
  rounding: Rounding
): BN {
  const result = getDeltaAmountBUnsignedUnchecked(
    lowerSqrtPrice,
    upperSqrtPrice,
    liquidity,
    rounding
  );

  if (result.gt(U64_MAX)) {
    throw new Error("MathOverflow: result exceeds u64 max");
  }

  return result;
}

/**
 * Gets the delta amount of token_b for given liquidity and price range.
 * @param lowerSqrtPrice - lower sqrt price (BN)
 * @param upperSqrtPrice - upper sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param rounding - rounding (Rounding)
 * @returns delta amount of token_b (BN)
 */
function getDeltaAmountBUnsignedUnchecked(
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  liquidity: BN,
  rounding: Rounding
): BN {
  // delta_sqrt_price = upper_sqrt_price - lower_sqrt_price
  const deltaSqrtPrice = upperSqrtPrice.sub(lowerSqrtPrice);
  const prod = liquidity.mul(deltaSqrtPrice);

  const shift = SCALE_OFFSET * 2;

  if (rounding === Rounding.Up) {
    // denominator = 1 << (SCALE_OFFSET * 2)
    const denominator = new BN(1).ushln(shift);
    // result = ceil(prod / denominator)
    const result = prod.add(denominator.subn(1)).div(denominator);
    return result;
  } else {
    // result = prod >> (RESOLUTION * 2)
    const result = prod.ushrn(shift);
    return result;
  }
}

/**
 * Gets the delta amount_a for given liquidity and price range. (getDeltaAmountAUnsigned)
 * `Δa = L * (1 / √P_lower - 1 / √P_upper)`
 * i.e. `L * (√P_upper - √P_lower) / (√P_upper * √P_lower)`
 * @param lowerSqrtPrice - lower sqrt price (BN)
 * @param upperSqrtPrice - upper sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param rounding - rounding (Rounding)
 * @returns delta amount of token_a (BN)
 */
export function getAmountAFromLiquidityDelta(
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  liquidity: BN,
  rounding: Rounding
): BN {
  const result = getDeltaAmountAUnsignedUnchecked(
    lowerSqrtPrice,
    upperSqrtPrice,
    liquidity,
    rounding
  );

  if (result.gt(U64_MAX)) {
    throw new Error("MathOverflow: result exceeds u64 max");
  }

  return result;
}

/**
 * Computes L * (√P_upper - √P_lower) / (√P_upper * √P_lower)
 * @param lowerSqrtPrice - lower sqrt price (BN)
 * @param upperSqrtPrice - upper sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param rounding - rounding (Rounding)
 * @returns delta amount of token_a (BN)
 */
function getDeltaAmountAUnsignedUnchecked(
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  liquidity: BN,
  rounding: Rounding
): BN {
  const numerator1 = liquidity;
  const numerator2 = upperSqrtPrice.sub(lowerSqrtPrice);

  const denominator = lowerSqrtPrice.mul(upperSqrtPrice);

  if (denominator.lte(new BN(0))) {
    throw new Error("Denominator must be greater than zero");
  }

  const result = mulDiv(numerator1, numerator2, denominator, rounding);
  return result;
}

/**
 * Gets the liquidity delta from amount A
 * Δa = L * (1 / √P_lower - 1 / √P_upper)
 * Δa = L * (√P_upper - √P_lower) / (√P_upper * √P_lower)
 * L = Δa * √P_upper * √P_lower / (√P_upper - √P_lower)
 * @param amountA - The amount of token A
 * @param lowerSqrtPrice - The lower sqrt price
 * @param upperSqrtPrice - The upper sqrt price
 * @returns The liquidity delta from amount A
 */
export function getLiquidityDeltaFromAmountA(
  amountA: BN,
  lowerSqrtPrice: BN, // current sqrt price
  upperSqrtPrice: BN // max sqrt price
): BN {
  const product = amountA.mul(lowerSqrtPrice).mul(upperSqrtPrice); // Q128.128
  const denominator = upperSqrtPrice.sub(lowerSqrtPrice); // Q64.64

  return product.div(denominator);
}

/**
 * Gets the liquidity delta from amount B
 * Δb = L (√P_upper - √P_lower)
 * L = Δb / (√P_upper - √P_lower)
 * @param amountB - The amount of token B
 * @param lowerSqrtPrice - The lower sqrt price
 * @param upperSqrtPrice - The upper sqrt price
 * @returns The liquidity delta from amount B
 */
export function getLiquidityDeltaFromAmountB(
  amountB: BN,
  lowerSqrtPrice: BN, // min sqrt price
  upperSqrtPrice: BN // current sqrt price,
): BN {
  const denominator = upperSqrtPrice.sub(lowerSqrtPrice);
  const product = amountB.shln(128);
  return product.div(denominator);
}
