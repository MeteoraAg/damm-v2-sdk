import BN from "bn.js";
import {
  InitialPoolInformation,
  Rounding,
  SwapAmountFromInput,
  SwapAmountFromOutput,
} from "../../types";
import { mulDiv, sqrt } from "../utilsMath";
import { DEAD_LIQUIDITY, U128_MAX } from "../../constants";
import {
  InsufficientLiquidityError,
  InvalidMinimumLiquidityError,
  MathOverflowError,
} from "../../errors";

/**
 * Calculate initial pool information given sqrtPrice and liquidity.
 * Computes the initial token A and B amounts, calculates actual initial liquidity,
 * and derives the min and max sqrt price bounds for the pool.
 * @param sqrtPrice - Initial sqrt price as BN
 * @param liquidity - Initial liquidity as BN
 * @throws {InvalidMinimumLiquidityError} If liquidity is not greater than DEAD_LIQUIDITY
 * @returns {InitialPoolInformation} The pool initialization info
 */
export function getInitialCompoundingPoolInformation(
  sqrtPrice: BN,
  liquidity: BN,
): InitialPoolInformation {
  if (liquidity.lte(DEAD_LIQUIDITY)) {
    throw new InvalidMinimumLiquidityError();
  }

  // a * b = liquidity^2
  // b / a = sqrtPrice^2
  // b = liquidity * sqrtPrice
  // a = liquidity / sqrtPrice

  const tokenAAmount =
    getPoolCreationAmountAFromLiquidityDeltaForCompoundingLiquidity(
      sqrtPrice,
      liquidity,
    );
  const tokenBAmount =
    getPoolCreationAmountBFromLiquidityDeltaForCompoundingLiquidity(
      sqrtPrice,
      liquidity,
    );

  return {
    tokenAAmount,
    tokenBAmount,
    sqrtPrice: getSqrtPriceFromAmountsForCompoundingLiquidity(
      tokenAAmount,
      tokenBAmount,
    ),
    initialLiquidity: liquidity.sub(DEAD_LIQUIDITY),
    sqrtMinPrice: new BN(0),
    sqrtMaxPrice: U128_MAX,
  };
}

/**
 * Get the proportional token amounts for a given liquidity delta in a compounding pool.
 * @param tokenAAmount - Pool's token A reserve (BN)
 * @param tokenBAmount - Pool's token B reserve (BN)
 * @param liquidity - Current pool total liquidity (BN)
 * @param liquidityDelta - Change in liquidity, positive or negative (BN)
 * @param round - Rounding mode (Rounding)
 * @returns {[BN, BN]} [amountA, amountB] as a tuple of BNs
 */
export function getAmountsForModifyForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  liquidity: BN,
  liquidityDelta: BN,
  round: Rounding,
): [BN, BN] {
  const amountA = mulDiv(liquidityDelta, tokenAAmount, liquidity, round);
  const amountB = mulDiv(liquidityDelta, tokenBAmount, liquidity, round);

  return [amountA, amountB];
}

/**
 * Calculates the output amount B received from an input amount A in a compounding pool (constant product: a * b = k).
 * Formula: outputAmount = tokenBAmount * amountIn / (tokenAAmount + amountIn)
 * @param tokenAAmount - Current token A reserve (BN)
 * @param tokenBAmount - Current token B reserve (BN)
 * @param amountIn - Input amount of token A (BN)
 * @returns {SwapAmountFromInput} The result with output amount B and meta info
 */
export function calculateAtoBFromAmountInForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountIn: BN,
): SwapAmountFromInput {
  // outputAmount = b * amountIn / (a + amountIn)
  const denominator = tokenAAmount.add(amountIn);
  const outputAmount = mulDiv(
    tokenBAmount,
    amountIn,
    denominator,
    Rounding.Down,
  );

  return {
    amountLeft: new BN(0),
    outputAmount,
    nextSqrtPrice: new BN(0),
  };
}

/**
 * Calculates the output amount A received from an input amount B in a compounding pool (constant product: a * b = k).
 * Formula: outputAmount = tokenAAmount * amountIn / (tokenBAmount + amountIn)
 * @param tokenAAmount - Current token A reserve (BN)
 * @param tokenBAmount - Current token B reserve (BN)
 * @param amountIn - Input amount of token B (BN)
 * @returns {SwapAmountFromInput} The result with output amount A and meta info
 */
export function calculateBtoAFromAmountInForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountIn: BN,
): SwapAmountFromInput {
  // outputAmount = a * amountIn / (b + amountIn)
  const denominator = tokenBAmount.add(amountIn);
  const outputAmount = mulDiv(
    tokenAAmount,
    amountIn,
    denominator,
    Rounding.Down,
  );

  return {
    amountLeft: new BN(0),
    outputAmount,
    nextSqrtPrice: new BN(0),
  };
}

/**
 * Calculates the output amount B for a partial input amount A in a compounding pool.
 * (Simply delegates to calculateAtoBFromAmountInForCompoundingLiquidity)
 * @param tokenAAmount - Current token A reserve (BN)
 * @param tokenBAmount - Current token B reserve (BN)
 * @param amountIn - Partial input amount of token A (BN)
 * @returns {SwapAmountFromInput} The result with output amount B and meta info
 */
export function calculateAtoBFromPartialAmountInForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountIn: BN,
): SwapAmountFromInput {
  // it is constant-product, so no price range
  return calculateAtoBFromAmountInForCompoundingLiquidity(
    tokenAAmount,
    tokenBAmount,
    amountIn,
  );
}

/**
 * Calculates the output amount A for a partial input amount B in a compounding pool.
 * (Simply delegates to calculateBtoAFromAmountInForCompoundingLiquidity)
 * @param tokenAAmount - Current token A reserve (BN)
 * @param tokenBAmount - Current token B reserve (BN)
 * @param amountIn - Partial input amount of token B (BN)
 * @returns {SwapAmountFromInput} The result with output amount A and meta info
 */
export function calculateBtoAFromPartialAmountInForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountIn: BN,
): SwapAmountFromInput {
  // it is constant-product, so no price range
  return calculateBtoAFromAmountInForCompoundingLiquidity(
    tokenAAmount,
    tokenBAmount,
    amountIn,
  );
}

/**
 * Calculates the input amount A required for a desired output amount B in a compounding pool (constant product: a * b = k).
 * Formula: amountIn = tokenAAmount * amountOut / (tokenBAmount - amountOut)
 * @param tokenAAmount - Current token A reserve (BN)
 * @param tokenBAmount - Current token B reserve (BN)
 * @param amountOut - Desired output amount of token B (BN)
 * @throws {InsufficientLiquidityError} If requested output >= available reserve
 * @returns {SwapAmountFromOutput} The result with required input amount A and meta info
 */
export function calculateAtoBFromAmountOutForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountOut: BN,
): SwapAmountFromOutput {
  if (amountOut.gte(tokenBAmount)) {
    throw new InsufficientLiquidityError();
  }

  const inputAmount = mulDiv(
    tokenAAmount,
    amountOut,
    tokenBAmount.sub(amountOut),
    Rounding.Up,
  );

  return {
    inputAmount,
    nextSqrtPrice: new BN(0), // don't need to care for next sqrt price now
  };
}

/**
 * Calculates the input amount B required for a desired output amount A in a compounding pool (constant product: a * b = k).
 * Formula: amountIn = tokenBAmount * amountOut / (tokenAAmount - amountOut)
 * @param tokenAAmount - Current token A reserve (BN)
 * @param tokenBAmount - Current token B reserve (BN)
 * @param amountOut - Desired output amount of token A (BN)
 * @throws {InsufficientLiquidityError} If requested output >= available reserve
 * @returns {SwapAmountFromOutput} The result with required input amount B and meta info
 */
export function calculateBtoAFromAmountOutForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
  amountOut: BN,
): SwapAmountFromOutput {
  if (amountOut.gte(tokenAAmount)) {
    throw new InsufficientLiquidityError();
  }

  const inputAmount = mulDiv(
    tokenBAmount,
    amountOut,
    tokenAAmount.sub(amountOut),
    Rounding.Up,
  );

  return {
    inputAmount,
    nextSqrtPrice: new BN(0), // don't need to care for next sqrt price now
  };
}

/**
 * Returns the current pool reserves for compounding liquidity.
 * @param tokenAAmount - Amount of token A in the pool (BN)
 * @param tokenBAmount - Amount of token B in the pool (BN)
 * @returns {[BN, BN]} A tuple of reserve amounts [tokenAAmount, tokenBAmount]
 */
export function getReservesAmountForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
): [BN, BN] {
  return [tokenAAmount, tokenBAmount];
}

/**
 * Calculates the next sqrt price from the current reserves for a compounding pool.
 * Formula: sqrtPrice = sqrt((tokenBAmount << 128) / tokenAAmount)
 * @param tokenAAmount - Amount of token A in the pool (BN)
 * @param tokenBAmount - Amount of token B in the pool (BN)
 * @returns {BN} The calculated sqrt price (u128 Q64.64)
 */
export function getNextSqrtPriceForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
): BN {
  return getSqrtPriceFromAmountsForCompoundingLiquidity(
    tokenAAmount,
    tokenBAmount,
  );
}

/**
 * Calculates the Q64.64 sqrt price from given tokenA and tokenB pool reserves.
 * Returns a BN representing a u128 Q64.64 sqrt price.
 * @param tokenAAmount - Amount of token A in pool (BN)
 * @param tokenBAmount - Amount of token B in pool (BN)
 * @throws {MathOverflowError} If sqrt computation fails
 * @returns {BN} The calculated sqrt price
 */
export function getSqrtPriceFromAmountsForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
): BN {
  // shift tokenBAmount left by 128 bits
  const tokenBShifted = tokenBAmount.ushln(128);

  // price = (tokenBAmount << 128) / tokenAAmount
  const price = tokenBShifted.div(tokenAAmount);

  const sqrtPrice = sqrt(price);

  if (!sqrtPrice) {
    throw new MathOverflowError("MathOverflow in getSqrtPriceFromAmounts");
  }

  return sqrtPrice;
}

/**
 * Calculates the corresponding token A amount for a given liquidity delta in a compounding pool.
 * Formula: amountA = liquidityDelta * tokenAAmount / liquidity
 * @param liquidityDelta - Liquidity change (BN)
 * @param tokenAAmount - Pool's token A reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @param rounding - Rounding mode (Rounding)
 * @returns {BN} Proportional token A amount
 */
export function getAmountAFromLiquidityDeltaForCompoundingLiquidity(
  liquidityDelta: BN,
  tokenAAmount: BN,
  liquidity: BN,
  rounding: Rounding,
): BN {
  return mulDiv(liquidityDelta, tokenAAmount, liquidity, rounding);
}

/**
 * Calculates the corresponding token B amount for a given liquidity delta in a compounding pool.
 * Formula: amountB = liquidityDelta * tokenBAmount / liquidity
 * @param liquidityDelta - Liquidity change (BN)
 * @param tokenBAmount - Pool's token B reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @param rounding - Rounding mode (Rounding)
 * @returns {BN} Proportional token B amount
 */
export function getAmountBFromLiquidityDeltaForCompoundingLiquidity(
  liquidityDelta: BN,
  tokenBAmount: BN,
  liquidity: BN,
  rounding: Rounding,
): BN {
  return mulDiv(liquidityDelta, tokenBAmount, liquidity, rounding);
}

/**
 * Computes the initial amount of token A needed to create a pool, given sqrtPrice and liquidity.
 * Performs ceil(liquidity / sqrtPrice).
 * @param sqrtPrice - The sqrt price as BN
 * @param liquidity - The liquidity as BN
 * @returns {BN} Required token A amount (rounded up)
 */
export function getPoolCreationAmountAFromLiquidityDeltaForCompoundingLiquidity(
  sqrtPrice: BN,
  liquidity: BN,
): BN {
  // ceiling division: (liquidity + sqrtPrice - 1) / sqrtPrice
  const amount = liquidity.add(sqrtPrice.subn(1)).div(sqrtPrice);
  return amount;
}

/**
 * Computes the initial amount of token B needed to create a pool, given sqrtPrice and liquidity.
 * Performs ceil(liquidity * sqrtPrice / 2^128).
 * @param sqrtPrice - The sqrt price as BN
 * @param liquidity - The liquidity as BN
 * @returns {BN} Required token B amount (rounded up)
 */
export function getPoolCreationAmountBFromLiquidityDeltaForCompoundingLiquidity(
  sqrtPrice: BN,
  liquidity: BN,
): BN {
  // numerator = liquidity * sqrt_price
  // denominator = 1 << 128
  const numerator = liquidity.mul(sqrtPrice);
  const denominator = new BN(1).ushln(128);

  // ceiling division: (numerator + denominator - 1) / denominator
  const amount = numerator.add(denominator.subn(1)).div(denominator);
  return amount;
}

/**
 * Calculates the liquidity delta achievable with a given token A amount in the current pool.
 * Formula: liquidityDelta = floor(amountA * liquidity / tokenAAmount)
 * @param amountA - Provided token A amount (BN)
 * @param tokenAAmount - Pool's token A reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @returns {BN} Liquidity delta (how much liquidity user can provide)
 */
export function getLiquidityDeltaFromAmountAForCompoundingLiquidity(
  amountA: BN,
  tokenAAmount: BN,
  liquidity: BN,
): BN {
  return mulDiv(amountA, liquidity, tokenAAmount, Rounding.Down);
}

/**
 * Calculates the liquidity delta achievable with a given token B amount in the current pool.
 * Formula: liquidityDelta = floor(amountB * liquidity / tokenBAmount)
 * @param amountB - Provided token B amount (BN)
 * @param tokenBAmount - Pool's token B reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @returns {BN} Liquidity delta (how much liquidity user can provide)
 */
export function getLiquidityDeltaFromAmountBForCompoundingLiquidity(
  amountB: BN,
  tokenBAmount: BN,
  liquidity: BN,
): BN {
  return mulDiv(amountB, liquidity, tokenBAmount, Rounding.Down);
}

/**
 * Computes the liquidity delta for pool creation from a given token A amount and sqrt price.
 * Formula: liquidityDelta = amountA * sqrtPrice
 * @param amountA - User's token A amount (BN)
 * @param sqrtPrice - The sqrt price as BN
 * @returns {BN} Liquidity delta to use for pool creation
 */
export function getPoolCreationLiquidityDeltaFromAmountAForCompoundingLiquidity(
  amountA: BN,
  sqrtPrice: BN,
): BN {
  return amountA.mul(sqrtPrice);
}

/**
 * Computes the liquidity delta for pool creation from a given token B amount and sqrt price.
 * Formula: liquidityDelta = (amountB << 128) / sqrtPrice
 * @param amountB - User's token B amount (BN)
 * @param sqrtPrice - The sqrt price as BN
 * @returns {BN} Liquidity delta to use for pool creation
 */
export function getPoolCreationLiquidityDeltaFromAmountBForCompoundingLiquidity(
  amountB: BN,
  sqrtPrice: BN,
): BN {
  return amountB.ushln(128).div(sqrtPrice);
}
