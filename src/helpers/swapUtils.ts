import { BN } from "@coral-xyz/anchor";
import { Rounding } from "../types";
import {
  getAmountAFromLiquidityDelta,
  getAmountBFromLiquidityDelta,
  getNextSqrtPrice,
  getNextSqrtPriceFromOutput,
} from "./curve";
import { mulDiv } from "../math";
import { FEE_DENOMINATOR } from "../constants";
import { getFeeMode } from "./fee";

/**
 *
 * Calculates the output amount and fees for a swap operation in a concentrated liquidity pool.
 *
 * @param inAmount - The input amount of tokens the user is swapping
 * @param sqrtPrice - The current square root price of the pool
 * @param liquidity - The current liquidity available in the pool
 * @param tradeFeeNumerator - The fee numerator used to calculate trading fees
 * @param aToB - Direction of the swap: true for token A to token B, false for token B to token A
 * @param collectFeeMode - Determines how fees are collected (0: both tokens, 1: only token B)
 * @returns Object containing the actual output amount after fees and the total fee amount
 */
export function getSwapAmount(
  inAmount: BN,
  sqrtPrice: BN,
  liquidity: BN,
  tradeFeeNumerator: BN,
  aToB: boolean,
  collectFeeMode: number
): { amountOut: BN; totalFee: BN; nextSqrtPrice: BN } {
  let feeMode = getFeeMode(collectFeeMode, !aToB);
  let actualInAmount = inAmount;
  let totalFee = new BN(0);

  if (feeMode.feeOnInput) {
    totalFee = getTotalFeeOnAmount(inAmount, tradeFeeNumerator);
    actualInAmount = inAmount.sub(totalFee);
  }

  const nextSqrtPrice = getNextSqrtPrice(
    actualInAmount,
    sqrtPrice,
    liquidity,
    aToB
  );
  // Calculate the output amount based on swap direction
  const outAmount = aToB
    ? getAmountBFromLiquidityDelta(
        liquidity,
        sqrtPrice,
        nextSqrtPrice,
        Rounding.Down
      )
    : getAmountAFromLiquidityDelta(
        liquidity,
        sqrtPrice,
        nextSqrtPrice,
        Rounding.Down
      );

  // Apply fees to output amount if fee is taken on output
  const amountOut = feeMode.feeOnInput
    ? outAmount
    : ((totalFee = getTotalFeeOnAmount(outAmount, tradeFeeNumerator)),
      outAmount.sub(totalFee));

  return { amountOut, totalFee, nextSqrtPrice };
}

function getSwapAmountFromExactOut(
  outAmount: BN,
  sqrtPrice: BN,
  liquidity: BN,
  tradeFeeNumerator: BN,
  aToB: boolean,
  collectFeeMode: number
) {
  const bToA = !aToB;
  let feeMode = getFeeMode(collectFeeMode, bToA);
  let actualAmountOut = outAmount;
  let totalFee = new BN(0);
  if(!feeMode.feeOnInput) {
    totalFee = getTotalFeeOnAmount(outAmount, tradeFeeNumerator)
    
  }
  const nextSqrtPrice = getNextSqrtPriceFromOutput(
    outAmount,
    sqrtPrice,
    liquidity,
    aToB
  );
  const inAmount = aToB
    ? getAmountAFromLiquidityDelta(
        liquidity,
        nextSqrtPrice,
        sqrtPrice,
        Rounding.Up
      )
    : getAmountBFromLiquidityDelta(
        liquidity,
        sqrtPrice,
        nextSqrtPrice,
        Rounding.Up
      );
}

/**
 * Calculates the total fee amount based on the transaction amount and fee numerator
 *
 * @param amount - The transaction amount (BN)
 * @param tradeFeeNumerator - The fee numerator to apply (BN)
 * @returns The calculated fee amount (BN), rounded up
 */
function getTotalFeeOnAmount(amount: BN, tradeFeeNumerator: BN) {
  return mulDiv(
    amount,
    tradeFeeNumerator,
    new BN(FEE_DENOMINATOR),
    Rounding.Up
  );
}
