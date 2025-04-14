import { BN } from "@coral-xyz/anchor";
import { Rounding } from "../types";
import { mulDiv } from "../math";
import { SCALE_OFFSET } from "../constants";

// aToB
// √P' = √P * L / (L + Δx*√P)
// bToA
// √P' = √P + Δy / L
export function getNextSqrtPrice(
  amount: BN,
  sqrtPrice: BN,
  liquidity: BN,
  aToB: boolean
): BN {
  let result: BN;
  if (aToB) {
    const product = amount.mul(sqrtPrice);
    const denominator = liquidity.add(product);
    result = mulDiv(liquidity, sqrtPrice, denominator, Rounding.Up);
  } else {
    const quotient = amount.shln(SCALE_OFFSET * 2).div(liquidity);
    result = sqrtPrice.add(quotient);
  }

  return result;
}

// Δa = L * (1 / √P_lower - 1 / √P_upper)
//
// Δa = L * (√P_upper - √P_lower) / (√P_upper * √P_lower)
//
// L = Δa * √P_upper * √P_lower / (√P_upper - √P_lower)
//
export function getLiquidityDeltaFromAmountA(
  amountA: BN,
  lowerSqrtPrice: BN, // current sqrt price
  upperSqrtPrice: BN // max sqrt price
): BN {
  const product = amountA.mul(lowerSqrtPrice).mul(upperSqrtPrice); // Q128.128
  const denominator = upperSqrtPrice.sub(lowerSqrtPrice); // Q64.64

  return product.div(denominator);
}

// Δb = L (√P_upper - √P_lower)
// L = Δb / (√P_upper - √P_lower)
export function getLiquidityDeltaFromAmountB(
  amountB: BN,
  lowerSqrtPrice: BN, // min sqrt price
  upperSqrtPrice: BN // current sqrt price,
): BN {
  const denominator = upperSqrtPrice.sub(lowerSqrtPrice);
  const product = amountB.shln(128);
  return product.div(denominator);
}

// L = Δa * √P_upper * √P_lower / (√P_upper - √P_lower)
// Δa = L * (√P_upper - √P_lower) / √P_upper * √P_lower
export function getAmountAFromLiquidityDelta(
  liquidity: BN,
  currentSqrtPrice: BN, // current sqrt price
  maxSqrtPrice: BN,
  rounding: Rounding
): BN {
  // Q128.128
  const product = liquidity.mul(maxSqrtPrice.sub(currentSqrtPrice));
  // Q128.128
  const denominator = currentSqrtPrice.mul(maxSqrtPrice);
  // Q64.64
  if (rounding == Rounding.Up) {
    return product.add(denominator.sub(new BN(1))).div(denominator);
  }
  return product.div(denominator);
}

// L = Δb / (√P_upper - √P_lower)
// Δb = L * (√P_upper - √P_lower)
export function getAmountBFromLiquidityDelta(
  liquidity: BN,
  currentSqrtPrice: BN, // current sqrt price,
  minSqrtPrice: BN,
  rounding: Rounding
): BN {
  const one = new BN(1).shln(128);
  const deltaPrice = currentSqrtPrice.sub(minSqrtPrice);
  const result = liquidity.mul(deltaPrice); // Q128
  if (rounding == Rounding.Up) {
    return result.add(one.sub(new BN(1))).div(one);
  }
  return result.shrn(128);
}
