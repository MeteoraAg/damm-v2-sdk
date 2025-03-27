import { BN } from "@coral-xyz/anchor";
import { divCeil, mulDiv } from "../math";
import { CollectFeeMode, Rounding } from "../types";
import { FEE_DENOMINATOR, SCALE_OFFSET } from "../constants";

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
  tradeFeeNumerator: BN,
  aToB: boolean,
  collectFeeMode: number
): { amountOutExcludedlpFee: BN; lpFee: BN } {
  let outAmount: BN;
  let lpFee: BN;

  if (collectFeeMode === CollectFeeMode.BothToken) {
    if (aToB) {
      const nextSqrtPrice = getNextSqrtPrice(
        inAmount,
        sqrtPrice,
        liquidity,
        true
      );
      outAmount = getDeltaAmountB(
        nextSqrtPrice,
        sqrtPrice,
        liquidity,
        Rounding.Down
      );
      lpFee = mulDiv(
        outAmount,
        tradeFeeNumerator,
        new BN(FEE_DENOMINATOR),
        Rounding.Down
      );
    } else {
      const nextSqrtPrice = getNextSqrtPrice(
        inAmount,
        sqrtPrice,
        liquidity,
        false
      );

      outAmount = getDeltaAmountA(
        sqrtPrice,
        nextSqrtPrice,
        liquidity,
        Rounding.Down
      );
      lpFee = mulDiv(
        outAmount,
        tradeFeeNumerator,
        new BN(new BN(FEE_DENOMINATOR)),
        Rounding.Down
      );
    }
  } else {
    const nextSqrtPrice = getNextSqrtPrice(
      inAmount,
      sqrtPrice,
      liquidity,
      true
    );
    outAmount = getDeltaAmountB(
      nextSqrtPrice,
      sqrtPrice,
      liquidity,
      Rounding.Down
    );
    lpFee = mulDiv(
      outAmount,
      tradeFeeNumerator,
      new BN(FEE_DENOMINATOR),
      Rounding.Down
    );
    if (aToB) {
    } else {
      lpFee = mulDiv(
        inAmount,
        tradeFeeNumerator,
        new BN(FEE_DENOMINATOR),
        Rounding.Down
      );
      const nextSqrtPrice = getNextSqrtPrice(
        inAmount.sub(lpFee),
        sqrtPrice,
        liquidity,
        false
      );
      outAmount = getDeltaAmountA(
        sqrtPrice,
        nextSqrtPrice,
        liquidity,
        Rounding.Down
      );
    }
  }

  return { amountOutExcludedlpFee: outAmount.sub(lpFee), lpFee };
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
