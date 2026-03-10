import BN from "bn.js";
import {
  InitialPoolInformation,
  Rounding,
  SwapAmountFromInput,
  SwapAmountFromOutput,
  TradeDirection,
} from "../../types";
import { mulDiv, sqrt } from "../utilsMath";
import { DEAD_LIQUIDITY, U128_MAX } from "../../constants";
import {
  InsufficientLiquidityError,
  InvalidMinimumLiquidityError,
  MathOverflowError,
} from "../../errors";

/**
 * Calculate initial pool information given sqrt_price and liquidity.
 * @param sqrtPrice BN
 * @param liquidity BN
 * @throws Error if liquidity is not greater than DEAD_LIQUIDITY
 * @returns InitialPoolInformation
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
 * Get the amounts for modify liquidity.
 * @param tokenAAmount - pool's token A reserve
 * @param tokenBAmount - pool's token B reserve
 * @param liquidity - pool's total liquidity
 * @param liquidityDelta - liquidity delta being added/removed
 * @param round - rounding
 * @returns [amountA, amountB] as a tuple of BN's
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
 * Calculates the output amount B from input amount A in a compounding pool (constant product: a * b = k)
 * Formula: output_amount = b * amount_in / (a + amount_in)
 * @param tokenAAmount - Current token A amount (BN)
 * @param tokenBAmount - Current token B amount (BN)
 * @param amountIn - Input amount of token A (BN)
 * @returns An object representing the swap result, { amountLeft, outputAmount, nextSqrtPrice }
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
 * Calculates the output amount A from input amount B in a compounding pool (constant product: a * b = k)
 * Formula: outputAmount = a * amountIn / (b + amountIn)
 * @param tokenAAmount - Current token A amount (BN)
 * @param tokenBAmount - Current token B amount (BN)
 * @param amountIn - Input amount of token B (BN)
 * @returns An object representing the swap result, { amountLeft, outputAmount, nextSqrtPrice }
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
 * Calculates the output amount B from a partial input amount A in a compounding pool (constant product: a * b = k).
 * @param tokenAAmount - Current token A amount (BN)
 * @param tokenBAmount - Current token B amount (BN)
 * @param amountIn - Partial input amount of token A (BN)
 * @returns An object representing the swap result, { amountLeft, outputAmount, nextSqrtPrice }
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
 * Calculates the output amount A from a partial input amount B in a compounding pool (constant product: a * b = k).
 * @param tokenAAmount - Current token A amount (BN)
 * @param tokenBAmount - Current token B amount (BN)
 * @param amountIn - Partial input amount of token B (BN)
 * @returns An object representing the swap result, { amountLeft, outputAmount, nextSqrtPrice }
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
 * a * b = (a + amount_in) * (b - amount_out)
 * => amount_in = a * amount_out / (b - amount_out)
 * @param tokenAAmount - Current token A amount (BN)
 * @param tokenBAmount - Current token B amount (BN)
 * @param amountOut - Desired output amount of token B (BN)
 * @returns An object representing { inputAmount, nextSqrtPrice }
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
    nextSqrtPrice: new BN(0), // dont need to care for next sqrt price now
  };
}

/**
 * Calculates the input amount B required for a desired output amount A in a compounding pool (constant product: a * b = k).
 * a * b = (b + amount_in) * (a - amount_out)
 * => amount_in = a * b / (a - amount_out) - b = b * amount_out / (a - amount_out)
 * @param tokenAAmount - Current token A amount (BN)
 * @param tokenBAmount - Current token B amount (BN)
 * @param amountOut - Desired output amount of token A (BN)
 * @returns An object representing { inputAmount, nextSqrtPrice }
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
 * Returns the current reserves as [tokenAAmount, tokenBAmount].
 * @param tokenAAmount - Amount of token A in the pool (BN)
 * @param tokenBAmount - Amount of token B in the pool (BN)
 * @returns A tuple of [tokenAAmount, tokenBAmount]
 */
export function getReservesAmountForCompoundingLiquidity(
  tokenAAmount: BN,
  tokenBAmount: BN,
): [BN, BN] {
  return [tokenAAmount, tokenBAmount];
}

/**
 * Calculates the next sqrt price from the current reserves.
 * price = sqrt(tokenB / tokenA) * (2^64), rounded down.
 * @param tokenAAmount - Amount of token A in the pool (BN)
 * @param tokenBAmount - Amount of token B in the pool (BN)
 * @returns The next sqrt price as a BN
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
 * Calculates the sqrt price from tokenA and tokenB amounts.
 * sqrt_price = sqrt((token_b_amount << 128) / token_a_amount)
 * Returns BN representing a u128 Q64.64 sqrt price, throws on overflow/bad cast.
 * @param tokenAAmount - BN/bignum of token A in pool
 * @param tokenBAmount - BN/bignum of token B in pool
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
 * Computes the token A amount from a liquidity delta.
 * @param liquidityDelta - The liquidity delta (BN)
 * @param tokenAAmount - Pool's token A reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @param rounding - The rounding (Rounding)
 * @returns The token A amount (BN)
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
 * Computes the token B amount from a liquidity delta.
 * @param liquidityDelta - The liquidity delta (BN)
 * @param tokenBAmount - Pool's token B reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @param rounding - The rounding (Rounding)
 * @returns The token B amount (BN)
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
 * Computes the initial amount of token A needed given sqrt_price and liquidity.
 * liquidity.div_ceil(sqrt_price)
 * Returns a BN
 * @param sqrtPrice - The sqrt price as BN
 * @param liquidity - The liquidity as BN
 * @returns amount as BN
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
 * Computes the initial amount of token B needed given sqrt_price and liquidity.
 * ceil_div(liquidity * sqrt_price, 1 << 128)
 * Returns a BN
 * @param sqrtPrice - The sqrt price as BN
 * @param liquidity - The liquidity as BN
 * @returns amount as BN
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
 * Calculates the liquidity delta from a given amount of token A.
 * liquidityDelta = floor(amountA * totalLiquidity / poolTokenAReserve)
 * @param amountA - User's token A amount (BN)
 * @param tokenAAmount - Pool's token A reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @returns The liquidity delta (BN)
 */
export function getLiquidityDeltaFromAmountAForCompoundingLiquidity(
  amountA: BN,
  tokenAAmount: BN,
  liquidity: BN,
): BN {
  return mulDiv(amountA, liquidity, tokenAAmount, Rounding.Down);
}

/**
 * Calculates the liquidity delta from a given amount of token B.
 * liquidityDelta = floor(amountB * totalLiquidity / poolTokenBReserve)
 * @param amountB - User's token B amount (BN)
 * @param tokenBAmount - Pool's token B reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @returns The liquidity delta (BN)
 */
export function getLiquidityDeltaFromAmountBForCompoundingLiquidity(
  amountB: BN,
  tokenBAmount: BN,
  liquidity: BN,
): BN {
  return mulDiv(amountB, liquidity, tokenBAmount, Rounding.Down);
}

/**
 * Computes the liquidity delta for pool creation from a given amount of token A.
 * @param amountA - User's token A amount (BN)
 * @param tokenAAmount - Pool's token A reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 */
export function getPoolCreationLiquidityDeltaFromAmountAForCompoundingLiquidity(
  amountA: BN,
  sqrtPrice: BN,
): BN {
  return amountA.mul(sqrtPrice);
}

/**
 * Computes the liquidity delta for pool creation from a given amount of token B.
 * @param amountB - User's token B amount (BN)
 * @param sqrtPrice - The sqrt price (BN)
 * @returns The liquidity delta (BN)
 */
export function getPoolCreationLiquidityDeltaFromAmountBForCompoundingLiquidity(
  amountB: BN,
  sqrtPrice: BN,
): BN {
  return amountB.ushln(128).div(sqrtPrice);
}
