import BN from "bn.js";
import { InitialPoolInformation, Rounding, SwapAmountFromInput, SwapAmountFromOutput } from "../../types";
import { SCALE_OFFSET } from "../../constants";
import { mulDiv } from "../utilsMath";
import {
  getNextSqrtPriceFromInput,
  getNextSqrtPriceFromOutput,
  getAmountAFromLiquidityDelta as getAmountAFromCurve,
  getAmountBFromLiquidityDelta as getAmountBFromCurve,
  getLiquidityDeltaFromAmountA as getLiquidityDeltaAFromCurve,
  getLiquidityDeltaFromAmountB as getLiquidityDeltaBFromCurve,
} from "../curve";

/**
 * Compute initial pool information for a concentrated liquidity pool.
 */
export function getInitialConcentratedLiquidityPoolInformation(
  sqrtMinPrice: BN,
  sqrtMaxPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
): InitialPoolInformation {
  const tokenAAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice, sqrtMaxPrice, liquidity, Rounding.Up,
  );
  const tokenBAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtMinPrice, sqrtPrice, liquidity, Rounding.Up,
  );
  return {
    tokenAAmount,
    tokenBAmount,
    sqrtPrice,
    initialLiquidity: liquidity,
    sqrtMinPrice,
    sqrtMaxPrice,
  };
}

/**
 * Get amounts for modifying liquidity in a concentrated liquidity pool.
 */
export function getAmountsForModifyForConcentratedLiquidity(
  sqrtPrice: BN,
  sqrtMinPrice: BN,
  sqrtMaxPrice: BN,
  liquidityDelta: BN,
  round: Rounding,
): [BN, BN] {
  const tokenAAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice, sqrtMaxPrice, liquidityDelta, round,
  );
  const tokenBAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtMinPrice, sqrtPrice, liquidityDelta, round,
  );
  return [tokenAAmount, tokenBAmount];
}

/**
 * Swap A→B exact input in a concentrated liquidity pool.
 */
export function calculateAtoBFromAmountInForConcentratedLiquidity(
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountIn: BN,
): SwapAmountFromInput {
  const nextSqrtPrice = getNextSqrtPriceFromInput(sqrtPrice, liquidity, amountIn, true);
  if (nextSqrtPrice.lt(sqrtMinPrice)) {
    throw new Error("Price range is violated");
  }
  const outputAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    nextSqrtPrice, sqrtPrice, liquidity, Rounding.Down,
  );
  return { outputAmount, nextSqrtPrice, amountLeft: new BN(0) };
}

/**
 * Swap B→A exact input in a concentrated liquidity pool.
 */
export function calculateBtoAFromAmountInForConcentratedLiquidity(
  sqrtMaxPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountIn: BN,
): SwapAmountFromInput {
  const nextSqrtPrice = getNextSqrtPriceFromInput(sqrtPrice, liquidity, amountIn, false);
  if (nextSqrtPrice.gt(sqrtMaxPrice)) {
    throw new Error("Price range is violated");
  }
  const outputAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice, nextSqrtPrice, liquidity, Rounding.Down,
  );
  return { outputAmount, nextSqrtPrice, amountLeft: new BN(0) };
}

/**
 * Swap A→B partial input in a concentrated liquidity pool.
 */
export function calculateAtoBFromPartialAmountInForConcentratedLiquidity(
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountIn: BN,
): SwapAmountFromInput {
  const maxAmountIn = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtMinPrice, sqrtPrice, liquidity, Rounding.Up,
  );

  let consumedInAmount: BN;
  let nextSqrtPrice: BN;

  if (amountIn.gte(maxAmountIn)) {
    consumedInAmount = maxAmountIn;
    nextSqrtPrice = sqrtMinPrice;
  } else {
    nextSqrtPrice = getNextSqrtPriceFromInput(sqrtPrice, liquidity, amountIn, true);
    consumedInAmount = amountIn;
  }

  const outputAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    nextSqrtPrice, sqrtPrice, liquidity, Rounding.Down,
  );
  return { outputAmount, nextSqrtPrice, amountLeft: amountIn.sub(consumedInAmount) };
}

/**
 * Swap B→A partial input in a concentrated liquidity pool.
 */
export function calculateBtoAFromPartialAmountInForConcentratedLiquidity(
  sqrtMaxPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountIn: BN,
): SwapAmountFromInput {
  const maxAmountIn = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice, sqrtMaxPrice, liquidity, Rounding.Up,
  );

  let consumedInAmount: BN;
  let nextSqrtPrice: BN;

  if (amountIn.gte(maxAmountIn)) {
    consumedInAmount = maxAmountIn;
    nextSqrtPrice = sqrtMaxPrice;
  } else {
    nextSqrtPrice = getNextSqrtPriceFromInput(sqrtPrice, liquidity, amountIn, false);
    consumedInAmount = amountIn;
  }

  const outputAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice, nextSqrtPrice, liquidity, Rounding.Down,
  );
  return { outputAmount, nextSqrtPrice, amountLeft: amountIn.sub(consumedInAmount) };
}

/**
 * Swap A→B exact output in a concentrated liquidity pool.
 */
export function calculateAtoBFromAmountOutForConcentratedLiquidity(
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountOut: BN,
): SwapAmountFromOutput {
  const nextSqrtPrice = getNextSqrtPriceFromOutput(sqrtPrice, liquidity, amountOut, true);
  if (nextSqrtPrice.lt(sqrtMinPrice)) {
    throw new Error("Price range violated");
  }
  const inputAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    nextSqrtPrice, sqrtPrice, liquidity, Rounding.Up,
  );
  return { inputAmount, nextSqrtPrice };
}

/**
 * Swap B→A exact output in a concentrated liquidity pool.
 */
export function calculateBtoAFromAmountOutForConcentratedLiquidity(
  sqrtMaxPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountOut: BN,
): SwapAmountFromOutput {
  const nextSqrtPrice = getNextSqrtPriceFromOutput(sqrtPrice, liquidity, amountOut, false);
  if (nextSqrtPrice.gt(sqrtMaxPrice)) {
    throw new Error("Price range violated");
  }
  const inputAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice, nextSqrtPrice, liquidity, Rounding.Up,
  );
  return { inputAmount, nextSqrtPrice };
}

/**
 * Returns virtual reserves [tokenA, tokenB] from pool state.
 */
export function getReservesAmountForConcentratedLiquidity(
  sqrtPrice: BN,
  sqrtMinPrice: BN,
  sqrtMaxPrice: BN,
  liquidity: BN,
): [BN, BN] {
  const tokenAAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice, sqrtMaxPrice, liquidity, Rounding.Down,
  );
  const tokenBAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtMinPrice, sqrtPrice, liquidity, Rounding.Down,
  );
  return [tokenAAmount, tokenBAmount];
}

// Re-export curve primitives with explicit names for concentrated liquidity
export function getAmountAFromLiquidityDeltaForConcentratedLiquidity(
  sqrtPrice: BN,
  sqrtMaxPrice: BN,
  liquidityDelta: BN,
  rounding: Rounding,
): BN {
  return getAmountAFromCurve(sqrtPrice, sqrtMaxPrice, liquidityDelta, rounding);
}

export function getAmountBFromLiquidityDeltaForConcentratedLiquidity(
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  liquidityDelta: BN,
  rounding: Rounding,
): BN {
  return getAmountBFromCurve(sqrtMinPrice, sqrtPrice, liquidityDelta, rounding);
}

export function getLiquidityDeltaFromAmountAForConcentratedLiquidity(
  amountA: BN,
  sqrtPrice: BN,
  sqrtMaxPrice: BN,
): BN {
  return getLiquidityDeltaAFromCurve(amountA, sqrtPrice, sqrtMaxPrice);
}

export function getLiquidityDeltaFromAmountBForConcentratedLiquidity(
  amountB: BN,
  sqrtMinPrice: BN,
  sqrtPrice: BN,
): BN {
  return getLiquidityDeltaBFromCurve(amountB, sqrtMinPrice, sqrtPrice);
}
