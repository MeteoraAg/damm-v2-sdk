import { BN } from "@coral-xyz/anchor";
import { divCeil, mulDiv } from "../math";
import { Rounding } from "../types";
import { SCALE_OFFSET } from "../constants";

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

export function getLiquidityDeltaFromAmountB(
  maxAmountB: BN,
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN
) {
  const denominator = upperSqrtPrice.sub(lowerSqrtPrice);
  return maxAmountB.div(denominator);
}

export function getLiquidityDeltaFromAmountA(
  maxAmountA: BN,
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN
) {
  // TODO check overflow
  const prod = maxAmountA.mul(upperSqrtPrice.mul(lowerSqrtPrice));
  const delta = upperSqrtPrice.sub(lowerSqrtPrice);
  return prod.div(delta);
}
