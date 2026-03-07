import BN from "bn.js";
import { InitialPoolInformation, PoolState, Rounding } from "../../types";
import { SCALE_OFFSET } from "../../constants";
import { mulDiv } from "../utilsMath";

/**
 * Compute the initial pool information for a concentrated liquidity pool.
 * @param sqrtMinPrice The minimum sqrt price (BN)
 * @param sqrtMaxPrice The maximum sqrt price (BN)
 * @param sqrtPrice The current sqrt price (BN)
 * @param liquidity The initial liquidity (BN)
 * @returns InitialPoolInformation object
 */
export function getInitialConcentratedLiquidityPoolInformation(
  sqrtMinPrice: BN,
  sqrtMaxPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
): InitialPoolInformation {
  // BASE TOKEN: delta A between sqrt_price and sqrt_max_price
  const tokenAAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice,
    sqrtMaxPrice,
    liquidity,
    Rounding.Up,
  );

  // QUOTE TOKEN: delta B between sqrt_min_price and sqrt_price
  const tokenBAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtMinPrice,
    sqrtPrice,
    liquidity,
    Rounding.Up,
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
 * Get the amounts for modifying liquidity in a concentrated liquidity pool.
 * Equivalent to the Rust function `get_amounts_for_modify_liquidity`.
 * @param sqrtPrice - The current sqrt price (BN)
 * @param sqrtMinPrice - The minimum sqrt price (BN)
 * @param sqrtMaxPrice - The maximum sqrt price (BN)
 * @param liquidityDelta - The liquidity delta being added/removed (BN)
 * @param round - Rounding type (Rounding)
 * @returns [tokenAAmount, tokenBAmount] tuple as BNs
 */
export function getAmountsForModifyForConcentratedLiquidity(
  sqrtPrice: BN,
  sqrtMinPrice: BN,
  sqrtMaxPrice: BN,
  liquidityDelta: BN,
  round: Rounding,
): [BN, BN] {
  // tokenAAmount: ΔA between sqrtPrice and sqrtMaxPrice
  const tokenAAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice,
    sqrtMaxPrice,
    liquidityDelta,
    round,
  );

  // tokenBAmount: ΔB between sqrtMinPrice and sqrtPrice
  const tokenBAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtMinPrice,
    sqrtPrice,
    liquidityDelta,
    round,
  );

  return [tokenAAmount, tokenBAmount];
}

/**
 * Calculates the swap result from exact input
 * @param poolState - The pool state
 * @param amountIn - The amount in
 * @returns The swap result from exact input
 */
export function calculateAtoBFromAmountInForConcentratedLiquidity(
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountIn: BN,
): {
  outputAmount: BN;
  nextSqrtPrice: BN;
  amountLeft: BN;
} {
  // finding new target price
  const nextSqrtPrice = getNextSqrtPriceFromInput(
    sqrtPrice,
    liquidity,
    amountIn,
    true,
  );

  if (nextSqrtPrice.lt(sqrtMinPrice)) {
    throw new Error("Price range is violated");
  }

  // finding output amount
  const outputAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    nextSqrtPrice,
    sqrtPrice,
    liquidity,
    Rounding.Down,
  );

  return {
    outputAmount,
    nextSqrtPrice,
    amountLeft: new BN(0),
  };
}

/**
 * Calculates the swap result from exact input
 * @param poolState - The pool state
 * @param amountIn - The amount in
 * @returns The swap result from exact input
 */
export function calculateBtoAFromAmountInForConcentratedLiquidity(
  sqrtMaxPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountIn: BN,
): {
  outputAmount: BN;
  nextSqrtPrice: BN;
  amountLeft: BN;
} {
  // finding new target price
  const nextSqrtPrice = getNextSqrtPriceFromInput(
    sqrtPrice,
    liquidity,
    amountIn,
    false,
  );

  if (nextSqrtPrice.gt(sqrtMaxPrice)) {
    throw new Error("Price range is violated");
  }

  // finding output amount
  const outputAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice,
    nextSqrtPrice,
    liquidity,
    Rounding.Down,
  );

  return {
    outputAmount,
    nextSqrtPrice,
    amountLeft: new BN(0),
  };
}

/**
 * Calculates the swap result from partial input
 * @param poolState - The pool state
 * @param amountIn - The amount in
 * @returns The swap result from partial input
 */
export function calculateAtoBFromPartialAmountInForConcentratedLiquidity(
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountIn: BN,
): {
  outputAmount: BN;
  nextSqrtPrice: BN;
  amountLeft: BN;
} {
  const maxAmountIn = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtMinPrice,
    sqrtPrice,
    liquidity,
    Rounding.Up,
  );

  let consumedInAmount: BN;
  let nextSqrtPrice: BN;

  if (amountIn.gte(maxAmountIn)) {
    consumedInAmount = maxAmountIn;
    nextSqrtPrice = sqrtMinPrice;
  } else {
    nextSqrtPrice = getNextSqrtPriceFromInput(
      sqrtPrice,
      liquidity,
      amountIn,
      true,
    );
    consumedInAmount = amountIn;
  }

  const outputAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    nextSqrtPrice,
    sqrtPrice,
    liquidity,
    Rounding.Down,
  );

  const amountLeft = amountIn.sub(consumedInAmount);

  return {
    outputAmount,
    nextSqrtPrice,
    amountLeft,
  };
}

/**
 * Calculates the swap result from partial input
 * @param poolState - The pool state
 * @param amountIn - The amount in
 * @returns The swap result from partial input
 */
export function calculateBtoAFromPartialAmountInForConcentratedLiquidity(
  sqrtMaxPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountIn: BN,
): {
  outputAmount: BN;
  nextSqrtPrice: BN;
  amountLeft: BN;
} {
  const maxAmountIn = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice,
    sqrtMaxPrice,
    liquidity,
    Rounding.Up,
  );

  let consumedInAmount: BN;
  let nextSqrtPrice: BN;

  if (amountIn.gte(maxAmountIn)) {
    consumedInAmount = maxAmountIn;
    nextSqrtPrice = sqrtMaxPrice;
  } else {
    nextSqrtPrice = getNextSqrtPriceFromInput(
      sqrtPrice,
      liquidity,
      amountIn,
      false,
    );
    consumedInAmount = amountIn;
  }

  const outputAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice,
    nextSqrtPrice,
    liquidity,
    Rounding.Down,
  );

  const amountLeft = amountIn.sub(consumedInAmount);

  return {
    outputAmount,
    nextSqrtPrice,
    amountLeft,
  };
}

/**
 * Calculates the swap result from exact output
 * @param poolState - The pool state
 * @param amountOut - The amount out
 * @returns The swap result from exact output
 */
export function calculateAtoBFromAmountOutForConcentratedLiquidity(
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountOut: BN,
): { inputAmount: BN; nextSqrtPrice: BN } {
  const nextSqrtPrice = getNextSqrtPriceFromOutput(
    sqrtPrice,
    liquidity,
    amountOut,
    true,
  );

  if (nextSqrtPrice.lt(sqrtMinPrice)) {
    throw new Error("Price Range Violation");
  }

  const inputAmount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    nextSqrtPrice,
    sqrtPrice,
    liquidity,
    Rounding.Up,
  );

  return {
    inputAmount,
    nextSqrtPrice,
  };
}

/**
 * Calculates the swap result from exact output
 * @param poolState - The pool state
 * @param amountOut - The amount out
 * @returns The swap result from exact output
 */
export function calculateBtoAFromAmountOutForConcentratedLiquidity(
  sqrtMaxPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
  amountOut: BN,
): { inputAmount: BN; nextSqrtPrice: BN } {
  const nextSqrtPrice = getNextSqrtPriceFromOutput(
    sqrtPrice,
    liquidity,
    amountOut,
    false,
  );

  if (nextSqrtPrice.gt(sqrtMaxPrice)) {
    throw new Error("Price Range Violation");
  }

  const inputAmount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice,
    nextSqrtPrice,
    liquidity,
    Rounding.Up,
  );

  return {
    inputAmount,
    nextSqrtPrice,
  };
}

/**
 * Computes the reserves amount (tokenA, tokenB) for a concentrated liquidity position.
 * Equivalent to the Rust function `get_reserves_amount`.
 * @param sqrtPrice - The current sqrt price (BN)
 * @param sqrtMinPrice - The minimum sqrt price (BN)
 * @param sqrtMaxPrice - The maximum sqrt price (BN)
 * @param liquidity - The liquidity (BN)
 * @returns [reserveA: BN, reserveB: BN]
 */
export function getReservesAmountForConcentratedLiquidity(
  sqrtPrice: BN,
  sqrtMinPrice: BN,
  sqrtMaxPrice: BN,
  liquidity: BN,
): [BN, BN] {
  const reserveA = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice,
    sqrtMaxPrice,
    liquidity,
    Rounding.Up,
  );

  const reserveB = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtMinPrice,
    sqrtPrice,
    liquidity,
    Rounding.Up,
  );

  return [reserveA, reserveB];
}

/**
 * Gets the delta amount of token_b for given liquidity and price range. (get_delta_amount_b_unsigned)
 * @param lowerSqrtPrice - lower sqrt price (BN)
 * @param upperSqrtPrice - upper sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param rounding - rounding (Rounding)
 * @returns delta amount of token_b (BN)
 */
export function getAmountBFromLiquidityDeltaForConcentratedLiquidity(
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  liquidity: BN,
  rounding: Rounding,
): BN {
  // delta_sqrt_price = upper_sqrt_price - lower_sqrt_price
  const deltaSqrtPrice = upperSqrtPrice.sub(lowerSqrtPrice);
  const prod = liquidity.mul(deltaSqrtPrice);

  const shift = SCALE_OFFSET * 2;

  if (rounding === Rounding.Up) {
    // denominator = 1 << (SCALE_OFFSET * 2)
    const denominator = new BN(1).ushln(shift);
    // result = ceil(prod / denominator)
    const result = prod.add(denominator.subn(1)).div(denominator);
    return result;
  } else {
    // result = prod >> (RESOLUTION * 2)
    const result = prod.ushrn(shift);
    return result;
  }
}

/**
 * Computes L * (√P_upper - √P_lower) / (√P_upper * √P_lower) (get_delta_amount_a_unsigned)
 * @param lowerSqrtPrice - lower sqrt price (BN)
 * @param upperSqrtPrice - upper sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param rounding - rounding (Rounding)
 * @returns delta amount of token_a (BN)
 */
export function getAmountAFromLiquidityDeltaForConcentratedLiquidity(
  lowerSqrtPrice: BN,
  upperSqrtPrice: BN,
  liquidity: BN,
  rounding: Rounding,
): BN {
  const numerator1 = liquidity;
  const numerator2 = upperSqrtPrice.sub(lowerSqrtPrice);

  const denominator = lowerSqrtPrice.mul(upperSqrtPrice);

  if (denominator.lte(new BN(0))) {
    throw new Error("Denominator must be greater than zero");
  }

  const result = mulDiv(numerator1, numerator2, denominator, rounding);
  return result;
}

/**
 * Gets the next sqrt price given an input amount of token_a or token_b
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amountIn - input amount (BN)
 * @param aForB - true if swapping A for B, false if B for A
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromInput(
  sqrtPrice: BN,
  liquidity: BN,
  amountIn: BN,
  aForB: boolean,
): BN {
  if (sqrtPrice.lte(new BN(0))) {
    throw new Error("sqrtPrice must be greater than 0");
  }
  if (liquidity.lte(new BN(0))) {
    throw new Error("liquidity must be greater than 0");
  }

  if (aForB) {
    // Rounding up for A to B
    return getNextSqrtPriceFromAmountInARoundingUp(
      sqrtPrice,
      liquidity,
      amountIn,
    );
  } else {
    // Rounding down for B to A
    return getNextSqrtPriceFromAmountInBRoundingDown(
      sqrtPrice,
      liquidity,
      amountIn,
    );
  }
}

/**
 * Gets the next sqrt price given an output amount of token_a or token_b.
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amountOut - output amount (BN)
 * @param aForB - true if swapping A for B, false if B for A
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromOutput(
  sqrtPrice: BN,
  liquidity: BN,
  amountOut: BN,
  aForB: boolean,
): BN {
  if (sqrtPrice.lte(new BN(0))) {
    throw new Error("sqrtPrice must be greater than 0");
  }
  if (liquidity.lte(new BN(0))) {
    throw new Error("liquidity must be greater than 0");
  }

  if (aForB) {
    return getNextSqrtPriceFromAmountOutBRoundingDown(
      sqrtPrice,
      liquidity,
      amountOut,
    );
  } else {
    return getNextSqrtPriceFromAmountOutARoundingUp(
      sqrtPrice,
      liquidity,
      amountOut,
    );
  }
}

/**
 * Gets the next sqrt price √P' given a delta of token_a, rounding up.
 * √P' = √P * L / (L + Δa * √P)
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amount - delta of token_a (BN)
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromAmountInARoundingUp(
  sqrtPrice: BN,
  liquidity: BN,
  amount: BN,
): BN {
  if (amount.isZero()) {
    return sqrtPrice;
  }

  // product = amountIn * sqrtPrice
  const product = amount.mul(sqrtPrice);

  // denominator = liquidity + product
  const denominator = liquidity.add(product);

  // result = mulDiv(liquidity, sqrtPrice, denominator, Rounding.Up)
  const result = mulDiv(liquidity, sqrtPrice, denominator, Rounding.Up);

  return result;
}

/**
 * Gets the next sqrt price √P' given a delta of token_a (output), rounding up.
 * √P' = √P * L / (L - Δa * √P)
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amount - delta of token_a (BN)
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromAmountOutARoundingUp(
  sqrtPrice: BN,
  liquidity: BN,
  amount: BN,
): BN {
  if (amount.isZero()) {
    return sqrtPrice;
  }

  // product = amount * sqrtPrice
  const product = amount.mul(sqrtPrice);

  const denominator = liquidity.sub(product);
  if (denominator.lte(new BN(0))) {
    throw new Error("MathOverflow: denominator is zero or negative");
  }

  // result = mulDiv(liquidity, sqrtPrice, denominator, Rounding.Up)
  return mulDiv(liquidity, sqrtPrice, denominator, Rounding.Up);
}

/**
 * Gets the next sqrt price given a delta of token_b (input), rounding down.
 * √P' = √P + Δb / L
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amount - delta of token_b (BN)
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromAmountInBRoundingDown(
  sqrtPrice: BN,
  liquidity: BN,
  amount: BN,
): BN {
  // quotient = (amount << (SCALE_OFFSET * 2)) / liquidity
  const quotient = amount.shln(SCALE_OFFSET * 2).div(liquidity);

  // result = sqrtPrice + quotient
  const result = sqrtPrice.add(quotient);

  return result;
}

/**
 * Gets the next sqrt price given a delta of token_b (output), rounding down.
 * √P' = √P - Δb / L
 * @param sqrtPrice - current sqrt price (BN)
 * @param liquidity - current liquidity (BN)
 * @param amount - delta of token_b (BN)
 * @returns next sqrt price (BN)
 */
export function getNextSqrtPriceFromAmountOutBRoundingDown(
  sqrtPrice: BN,
  liquidity: BN,
  amount: BN,
): BN {
  // quotient = ceil((amount << (SCALE_OFFSET * 2)) / liquidity)
  const numerator = amount.shln(SCALE_OFFSET * 2);
  const quotient = numerator.add(liquidity).subn(1).div(liquidity);

  // result = sqrtPrice - quotient
  const result = sqrtPrice.sub(quotient);

  if (result.isNeg()) {
    throw new Error("sqrt price cannot be negative");
  }

  return result;
}

/**
 * Gets the liquidity delta from amount A
 * Δa = L * (1 / √P_lower - 1 / √P_upper)
 * Δa = L * (√P_upper - √P_lower) / (√P_upper * √P_lower)
 * L = Δa * √P_upper * √P_lower / (√P_upper - √P_lower)
 * @param amountA - The amount of token A
 * @param lowerSqrtPrice - The lower sqrt price
 * @param upperSqrtPrice - The upper sqrt price
 * @returns The liquidity delta from amount A
 */
export function getLiquidityDeltaFromAmountAForConcentratedLiquidity(
  amountA: BN,
  lowerSqrtPrice: BN, // current sqrt price
  upperSqrtPrice: BN, // max sqrt price
): BN {
  const product = amountA.mul(lowerSqrtPrice).mul(upperSqrtPrice); // Q128.128
  const denominator = upperSqrtPrice.sub(lowerSqrtPrice); // Q64.64

  return product.div(denominator);
}

/**
 * Gets the liquidity delta from amount B
 * Δb = L (√P_upper - √P_lower)
 * L = Δb / (√P_upper - √P_lower)
 * @param amountB - The amount of token B
 * @param lowerSqrtPrice - The lower sqrt price
 * @param upperSqrtPrice - The upper sqrt price
 * @returns The liquidity delta from amount B
 */
export function getLiquidityDeltaFromAmountBForConcentratedLiquidity(
  amountB: BN,
  lowerSqrtPrice: BN, // min sqrt price
  upperSqrtPrice: BN, // current sqrt price,
): BN {
  const denominator = upperSqrtPrice.sub(lowerSqrtPrice);
  const product = amountB.shln(128);
  return product.div(denominator);
}
