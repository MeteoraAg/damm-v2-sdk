import { BN } from "@coral-xyz/anchor";
import { divCeil, mulDiv, shlDiv } from "../math";
import { Rounding } from "../types";
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
  const deltaSqrtPrice = upperSqrtPrice.sub(lowerSqrtPrice);
  const denominator = lowerSqrtPrice.mul(upperSqrtPrice);
  return mulDiv(liquidity, deltaSqrtPrice, denominator, rounding);
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

// calculate outAmount without fee charging
export function calculateSwap(
  inAmount: BN,
  sqrtPrice: BN,
  liquidity: BN,
  aToB: boolean
): BN {
  if (aToB) {
    const nextSqrtPrice = getNextSqrtPrice(
      inAmount,
      sqrtPrice,
      liquidity,
      true
    );

    return getDeltaAmountB(nextSqrtPrice, sqrtPrice, liquidity, Rounding.Down);
  } else {
    const nextSqrtPrice = getNextSqrtPrice(
      inAmount,
      sqrtPrice,
      liquidity,
      false
    );
    return getDeltaAmountA(sqrtPrice, nextSqrtPrice, liquidity, Rounding.Down);
  }
}

export function getLiquidityDeltaFromAmountA(
  maxAmountA: BN,
  lowerSqrtPrice: BN, // current sqrt price
  upperSqrtPrice: BN // max sqrt price
): BN {
  const prod = maxAmountA.mul(upperSqrtPrice.mul(lowerSqrtPrice));
  const delta = upperSqrtPrice.sub(lowerSqrtPrice);
  return prod.div(delta);
}

export function getLiquidityDeltaFromAmountB(
  maxAmountB: BN,
  lowerSqrtPrice: BN, // mint sqrt price
  upperSqrtPrice: BN // current sqrt price
): BN {
  const denominator = upperSqrtPrice.sub(lowerSqrtPrice);
  return maxAmountB.div(denominator);
}
