import { BN } from "@coral-xyz/anchor";
import { divCeil, mulDiv, shlDiv } from "../math";
import { CollectFeeMode, Rounding } from "../types";
import {
  FEE_DENOMINATOR,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  SCALE_OFFSET,
} from "../constants";

// aToB
// √P' = √P * L / (L + Δx*√P)
// bToA
// √P' = √P + Δy / L
export function getNextSqrtPrice(
  amount: BN,
  sqrtPrice: BN,
  liquidity: BN,
  aToB: boolean
) {
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

/// Gets the delta amount_a for given liquidity and price range
///
/// # Formula
///
/// * `Δa = L * (1 / √P_lower - 1 / √P_upper)`
/// * i.e. `L * (√P_upper - √P_lower) / (√P_upper * √P_lower)`
export function getDeltaAmountA(
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  liquidity: BN,
  rounding: Rounding
): BN {
  // deltaSqrtPrice: Q64.64, L: Q64.64 => prod: Q128.128, denominator: Q128.128
  const deltaSqrtPrice = upperSqrtPrice.sub(lowerSqrtPrice);
  const prod = liquidity.mul(deltaSqrtPrice);
  const denominator = lowerSqrtPrice.mul(upperSqrtPrice);
  const result = shlDiv(prod, denominator, SCALE_OFFSET, rounding);

  return result.shrn(SCALE_OFFSET);
}

/// Gets the delta amount_b for given liquidity and price range
/// * `Δb = L (√P_upper - √P_lower)`
export function getDeltaAmountB(
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  liquidity: BN,
  rounding: Rounding
): BN {
  const deltaSqrtPrice = upperSqrtPrice.sub(lowerSqrtPrice);
  const prod = liquidity.mul(deltaSqrtPrice);

  let result: BN;
  if (rounding == Rounding.Up) {
    const denominator = new BN(1).shln(SCALE_OFFSET * 2);
    result = divCeil(prod, denominator);
  } else {
    result = prod.shrn(SCALE_OFFSET * 2);
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
  maxAmountA: BN,
  lowerSqrtPrice: BN, // current sqrt price
  upperSqrtPrice: BN // max sqrt price
): BN {
  const prod = maxAmountA.mul(upperSqrtPrice.mul(lowerSqrtPrice));
  const delta = upperSqrtPrice.sub(lowerSqrtPrice);

  return prod.div(delta);
}

// Δb = L (√P_upper - √P_lower)
// L = Δb / (√P_upper - √P_lower)
export function getLiquidityDeltaFromAmountB(
  maxAmountB: BN,
  lowerSqrtPrice: BN, // min sqrt price
  upperSqrtPrice: BN // current sqrt price
): BN {
  const denominator = upperSqrtPrice.sub(lowerSqrtPrice);
  const result = maxAmountB.shln(SCALE_OFFSET * 2).div(denominator);
  return result;
}

// L = Δa * √P_upper * √P_lower / (√P_upper - √P_lower)
// Δa = L * (√P_upper - √P_lower) / √P_upper * √P_lower
export function getAmountAFromLiquidityDelta(
  liquidity: BN,
  currentSqrtPrice: BN // current sqrt price
) {
  const prod = liquidity.mul(MAX_SQRT_PRICE.sub(currentSqrtPrice));
  const denominator = currentSqrtPrice.mul(MAX_SQRT_PRICE);
  // prod: Q128.128, denominator: Q128.128
  const result = shlDiv(prod, denominator, SCALE_OFFSET, Rounding.Up);

  return result.shrn(SCALE_OFFSET);
}

// L = Δb / (√P_upper - √P_lower)
// Δb = L * (√P_upper - √P_lower)
export function getAmountBFromLiquidityDelta(
  liquidity: BN,
  currentSqrtPrice: BN // current sqrt price
): BN {
  const delta = currentSqrtPrice.sub(MIN_SQRT_PRICE);
  // Q64.64 * Q64.64 => prod: Q128.128
  const prod = liquidity.mul(delta);
  return prod.shrn(SCALE_OFFSET * 2);
}
