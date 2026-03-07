import BN from "bn.js";
import { InitialPoolInformation, Rounding, SwapAmountFromInput, SwapAmountFromOutput } from "../../types";
import { mulDiv, sqrt } from "../utilsMath";
import { DEAD_LIQUIDITY, U128_MAX } from "../../constants";

/**
 * Calculate initial pool information for a Compounding pool.
 * @param sqrtPrice - Initial sqrt price
 * @param liquidity - Initial liquidity (must be > DEAD_LIQUIDITY)
 */
export function getInitialCompoundingPoolInformation(
  sqrtPrice: BN,
  liquidity: BN,
): InitialPoolInformation {
  if (liquidity.lte(DEAD_LIQUIDITY)) {
    throw new Error("InvalidMinimumLiquidity");
  }

  const tokenAAmount = getInitialTokenAForCompoundingLiquidity(sqrtPrice, liquidity);
  const tokenBAmount = getInitialTokenBForCompoundingLiquidity(sqrtPrice, liquidity);

  return {
    tokenAAmount,
    tokenBAmount,
    sqrtPrice: getSqrtPriceFromAmountsForCompoundingLiquidity(tokenAAmount, tokenBAmount),
    initialLiquidity: liquidity.sub(DEAD_LIQUIDITY),
    sqrtMinPrice: new BN(0),
    sqrtMaxPrice: U128_MAX,
  };
}

/**
 * Get token amounts for modifying (adding/removing) liquidity in a Compounding pool.
 */
export function getAmountsForModifyForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  liquidity: BN,
  liquidityDelta: BN,
  round: Rounding,
): [BN, BN] {
  const amountA = getAmountAFromLiquidityDeltaForCompoundingLiquidity(
    tokenAAmount, liquidity, liquidityDelta, round,
  );
  const amountB = getAmountBFromLiquidityDeltaForCompoundingLiquidity(
    tokenBAmount, liquidity, liquidityDelta, round,
  );
  return [amountA, amountB];
}

/**
 * Swap A→B exact input in a Compounding pool.
 * Formula: output_b = tokenB * amountIn / (tokenA + amountIn)  [floor]
 */
export function calculateAtoBFromAmountInForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountIn: BN,
): SwapAmountFromInput {
  const outputAmount = mulDiv(tokenBAmount, amountIn, tokenAAmount.add(amountIn), Rounding.Down);
  return { outputAmount, nextSqrtPrice: new BN(0), amountLeft: new BN(0) };
}

/**
 * Swap B→A exact input in a Compounding pool.
 * Formula: output_a = tokenA * amountIn / (tokenB + amountIn)  [floor]
 */
export function calculateBtoAFromAmountInForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountIn: BN,
): SwapAmountFromInput {
  const outputAmount = mulDiv(tokenAAmount, amountIn, tokenBAmount.add(amountIn), Rounding.Down);
  return { outputAmount, nextSqrtPrice: new BN(0), amountLeft: new BN(0) };
}

/**
 * Swap A→B partial input — no price range in Compounding, delegates to full.
 */
export function calculateAtoBFromPartialAmountInForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountIn: BN,
): SwapAmountFromInput {
  return calculateAtoBFromAmountInForCompoundingLiquidity(tokenAAmount, tokenBAmount, amountIn);
}

/**
 * Swap B→A partial input — no price range in Compounding, delegates to full.
 */
export function calculateBtoAFromPartialAmountInForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountIn: BN,
): SwapAmountFromInput {
  return calculateBtoAFromAmountInForCompoundingLiquidity(tokenAAmount, tokenBAmount, amountIn);
}

/**
 * Swap A→B exact output in a Compounding pool.
 * Formula: input_a = tokenA * amountOut / (tokenB - amountOut)  [ceil]
 */
export function calculateAtoBFromAmountOutForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountOut: BN,
): SwapAmountFromOutput {
  const inputAmount = mulDiv(tokenAAmount, amountOut, tokenBAmount.sub(amountOut), Rounding.Up);
  return { inputAmount, nextSqrtPrice: new BN(0) };
}

/**
 * Swap B→A exact output in a Compounding pool.
 * Formula: input_b = tokenB * amountOut / (tokenA - amountOut)  [ceil]
 */
export function calculateBtoAFromAmountOutForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountOut: BN,
): SwapAmountFromOutput {
  const inputAmount = mulDiv(tokenBAmount, amountOut, tokenAAmount.sub(amountOut), Rounding.Up);
  return { inputAmount, nextSqrtPrice: new BN(0) };
}

/**
 * Returns current reserves as [tokenAAmount, tokenBAmount].
 */
export function getReservesAmountForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
): [BN, BN] {
  return [tokenAAmount, tokenBAmount];
}

/**
 * Computes current sqrt price from reserves.
 * sqrt_price = sqrt((tokenB << 128) / tokenA)
 */
export function getSqrtPriceFromAmountsForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
): BN {
  const tokenBShifted = tokenBAmount.ushln(128);
  const price = tokenBShifted.div(tokenAAmount);
  const sqrtPrice = sqrt(price);
  if (!sqrtPrice) {
    throw new Error("MathOverflow in getSqrtPriceFromAmounts");
  }
  return sqrtPrice;
}

/**
 * Derives next sqrt price after a swap from current reserves.
 */
export function getNextSqrtPriceForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
): BN {
  return getSqrtPriceFromAmountsForCompoundingLiquidity(tokenAAmount, tokenBAmount);
}

/**
 * Initial token A required: ceil(liquidity / sqrtPrice)
 */
export function getInitialTokenAForCompoundingLiquidity(sqrtPrice: BN, liquidity: BN): BN {
  return liquidity.add(sqrtPrice.subn(1)).div(sqrtPrice);
}

/**
 * Initial token B required: ceil(liquidity * sqrtPrice / 2^128)
 */
export function getInitialTokenBForCompoundingLiquidity(sqrtPrice: BN, liquidity: BN): BN {
  const numerator = liquidity.mul(sqrtPrice);
  const denominator = new BN(1).ushln(128);
  return numerator.add(denominator.subn(1)).div(denominator);
}

/**
 * Amount of token A from liquidity delta: mulDiv(liquidityDelta, tokenAAmount, liquidity, round)
 */
export function getAmountAFromLiquidityDeltaForCompoundingLiquidity(
  tokenAAmount: BN,
  liquidity: BN,
  liquidityDelta: BN,
  round: Rounding,
): BN {
  return mulDiv(liquidityDelta, tokenAAmount, liquidity, round);
}

/**
 * Amount of token B from liquidity delta: mulDiv(liquidityDelta, tokenBAmount, liquidity, round)
 */
export function getAmountBFromLiquidityDeltaForCompoundingLiquidity(
  tokenBAmount: BN,
  liquidity: BN,
  liquidityDelta: BN,
  round: Rounding,
): BN {
  return mulDiv(liquidityDelta, tokenBAmount, liquidity, round);
}

/**
 * Liquidity delta from amount A: amountA * sqrtPrice
 */
export function getLiquidityDeltaFromAmountAForCompoundingLiquidity(
  amountA: BN,
  sqrtPrice: BN,
): BN {
  return amountA.mul(sqrtPrice);
}

/**
 * Liquidity delta from amount B: amountB << 128 / sqrtPrice
 */
export function getLiquidityDeltaFromAmountBForCompoundingLiquidity(
  amountB: BN,
  sqrtPrice: BN,
): BN {
  return amountB.ushln(128).div(sqrtPrice);
}
