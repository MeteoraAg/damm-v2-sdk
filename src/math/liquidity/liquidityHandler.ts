import BN from "bn.js";
import {
  CollectFeeMode,
  InitialPoolInformation,
  LiquidityHandler,
  PoolState,
  Rounding,
  SwapAmountFromInput,
  SwapAmountFromOutput,
  TradeDirection,
} from "../../types";
import { U64_MAX } from "../../constants";

import {
  getInitialCompoundingPoolInformation,
  getAmountsForModifyForCompoundingLiquidity,
  calculateAtoBFromAmountInForCompoundingLiquidity,
  calculateBtoAFromAmountInForCompoundingLiquidity,
  calculateAtoBFromPartialAmountInForCompoundingLiquidity,
  calculateBtoAFromPartialAmountInForCompoundingLiquidity,
  calculateAtoBFromAmountOutForCompoundingLiquidity,
  calculateBtoAFromAmountOutForCompoundingLiquidity,
  getReservesAmountForCompoundingLiquidity,
  getNextSqrtPriceForCompoundingLiquidity,
  getLiquidityDeltaFromAmountAForCompoundingLiquidity,
  getLiquidityDeltaFromAmountBForCompoundingLiquidity,
  getAmountAFromLiquidityDeltaForCompoundingLiquidity,
  getAmountBFromLiquidityDeltaForCompoundingLiquidity,
  getPoolCreationLiquidityDeltaFromAmountBForCompoundingLiquidity,
  getPoolCreationLiquidityDeltaFromAmountAForCompoundingLiquidity,
  getPoolCreationAmountAFromLiquidityDeltaForCompoundingLiquidity,
  getPoolCreationAmountBFromLiquidityDeltaForCompoundingLiquidity,
} from "./compoundingLiquidity";

import {
  getInitialConcentratedLiquidityPoolInformation,
  getAmountsForModifyForConcentratedLiquidity,
  calculateAtoBFromAmountInForConcentratedLiquidity,
  calculateBtoAFromAmountInForConcentratedLiquidity,
  calculateAtoBFromPartialAmountInForConcentratedLiquidity,
  calculateBtoAFromPartialAmountInForConcentratedLiquidity,
  calculateAtoBFromAmountOutForConcentratedLiquidity,
  calculateBtoAFromAmountOutForConcentratedLiquidity,
  getReservesAmountForConcentratedLiquidity,
  getAmountAFromLiquidityDeltaForConcentratedLiquidity,
  getAmountBFromLiquidityDeltaForConcentratedLiquidity,
  getLiquidityDeltaFromAmountAForConcentratedLiquidity,
  getLiquidityDeltaFromAmountBForConcentratedLiquidity,
} from "./concentratedLiquidity";

export class CompoundingLiquidityHandler implements LiquidityHandler {
  constructor(
    public tokenAAmount: BN,
    public tokenBAmount: BN,
    public liquidity: BN,
  ) {}

  getAmountsForModifyLiquidity(liquidityDelta: BN, round: Rounding): [BN, BN] {
    return getAmountsForModifyForCompoundingLiquidity(
      this.tokenAAmount,
      this.tokenBAmount,
      this.liquidity,
      liquidityDelta,
      round,
    );
  }

  calculateAtoBFromAmountIn(amountIn: BN): SwapAmountFromInput {
    return calculateAtoBFromAmountInForCompoundingLiquidity(
      this.tokenAAmount,
      this.tokenBAmount,
      amountIn,
    );
  }

  calculateBtoAFromAmountIn(amountIn: BN): SwapAmountFromInput {
    return calculateBtoAFromAmountInForCompoundingLiquidity(
      this.tokenAAmount,
      this.tokenBAmount,
      amountIn,
    );
  }

  calculateAtoBFromPartialAmountIn(amountIn: BN): SwapAmountFromInput {
    return calculateAtoBFromPartialAmountInForCompoundingLiquidity(
      this.tokenAAmount,
      this.tokenBAmount,
      amountIn,
    );
  }

  calculateBtoAFromPartialAmountIn(amountIn: BN): SwapAmountFromInput {
    return calculateBtoAFromPartialAmountInForCompoundingLiquidity(
      this.tokenAAmount,
      this.tokenBAmount,
      amountIn,
    );
  }

  calculateAtoBFromAmountOut(amountOut: BN): SwapAmountFromOutput {
    return calculateAtoBFromAmountOutForCompoundingLiquidity(
      this.tokenAAmount,
      this.tokenBAmount,
      amountOut,
    );
  }

  calculateBtoAFromAmountOut(amountOut: BN): SwapAmountFromOutput {
    return calculateBtoAFromAmountOutForCompoundingLiquidity(
      this.tokenAAmount,
      this.tokenBAmount,
      amountOut,
    );
  }

  getReservesAmount(): [BN, BN] {
    return getReservesAmountForCompoundingLiquidity(
      this.tokenAAmount,
      this.tokenBAmount,
    );
  }

  getNextSqrtPrice(_nextSqrtPrice: BN): BN {
    return getNextSqrtPriceForCompoundingLiquidity(
      this.tokenAAmount,
      this.tokenBAmount,
    );
  }

  getMaxAmountIn(_tradeDirection: TradeDirection): BN {
    return U64_MAX;
  }
}

export class ConcentratedLiquidityHandler implements LiquidityHandler {
  private sqrtMaxPrice: BN;
  private sqrtMinPrice: BN;
  private sqrtPrice: BN;
  private liquidity: BN;

  constructor(
    sqrtMaxPrice: BN,
    sqrtMinPrice: BN,
    sqrtPrice: BN,
    liquidity: BN,
  ) {
    this.sqrtMaxPrice = sqrtMaxPrice;
    this.sqrtMinPrice = sqrtMinPrice;
    this.sqrtPrice = sqrtPrice;
    this.liquidity = liquidity;
  }

  getAmountsForModifyLiquidity(liquidityDelta: BN, round: Rounding): [BN, BN] {
    return getAmountsForModifyForConcentratedLiquidity(
      this.sqrtPrice,
      this.sqrtMinPrice,
      this.sqrtMaxPrice,
      liquidityDelta,
      round,
    );
  }

  calculateAtoBFromAmountIn(amountIn: BN): SwapAmountFromInput {
    return calculateAtoBFromAmountInForConcentratedLiquidity(
      this.sqrtMinPrice,
      this.sqrtPrice,
      this.liquidity,
      amountIn,
    );
  }

  calculateBtoAFromAmountIn(amountIn: BN): SwapAmountFromInput {
    return calculateBtoAFromAmountInForConcentratedLiquidity(
      this.sqrtMaxPrice,
      this.sqrtPrice,
      this.liquidity,
      amountIn,
    );
  }

  calculateAtoBFromPartialAmountIn(amountIn: BN): SwapAmountFromInput {
    return calculateAtoBFromPartialAmountInForConcentratedLiquidity(
      this.sqrtMinPrice,
      this.sqrtPrice,
      this.liquidity,
      amountIn,
    );
  }

  calculateBtoAFromPartialAmountIn(amountIn: BN): SwapAmountFromInput {
    return calculateBtoAFromPartialAmountInForConcentratedLiquidity(
      this.sqrtMaxPrice,
      this.sqrtPrice,
      this.liquidity,
      amountIn,
    );
  }

  calculateAtoBFromAmountOut(amountOut: BN): SwapAmountFromOutput {
    return calculateAtoBFromAmountOutForConcentratedLiquidity(
      this.sqrtMinPrice,
      this.sqrtPrice,
      this.liquidity,
      amountOut,
    );
  }

  calculateBtoAFromAmountOut(amountOut: BN): SwapAmountFromOutput {
    return calculateBtoAFromAmountOutForConcentratedLiquidity(
      this.sqrtMaxPrice,
      this.sqrtPrice,
      this.liquidity,
      amountOut,
    );
  }

  getReservesAmount(): [BN, BN] {
    return getReservesAmountForConcentratedLiquidity(
      this.sqrtPrice,
      this.sqrtMinPrice,
      this.sqrtMaxPrice,
      this.liquidity,
    );
  }

  // it does nothing because next_sqrt_price is computed by swap-path + rounding direction.
  getNextSqrtPrice(nextSqrtPrice: BN): BN {
    return nextSqrtPrice;
  }

  getMaxAmountIn(tradeDirection: TradeDirection): BN {
    let amount: BN;
    if (tradeDirection === TradeDirection.AtoB) {
      amount = getAmountAFromLiquidityDeltaForConcentratedLiquidity(
        this.sqrtMinPrice,
        this.sqrtPrice,
        this.liquidity,
        Rounding.Up,
      );
    } else {
      amount = getAmountBFromLiquidityDeltaForConcentratedLiquidity(
        this.sqrtPrice,
        this.sqrtMaxPrice,
        this.liquidity,
        Rounding.Up,
      );
    }
    return amount.gt(U64_MAX) ? U64_MAX : amount;
  }
}

/**
 * Factory function to get the appropriate liquidity handler based on pool state.
 * @param poolState - The pool state
 * @returns A LiquidityHandler instance
 */
export function getLiquidityHandler(poolState: PoolState): LiquidityHandler {
  const collectFeeMode = poolState.collectFeeMode as CollectFeeMode;

  if (collectFeeMode === CollectFeeMode.Compounding) {
    return new CompoundingLiquidityHandler(
      poolState.tokenAAmount,
      poolState.tokenBAmount,
      poolState.liquidity,
    );
  } else {
    return new ConcentratedLiquidityHandler(
      poolState.sqrtMaxPrice,
      poolState.sqrtMinPrice,
      poolState.sqrtPrice,
      poolState.liquidity,
    );
  }
}

/**
 * Gets the initial pool information based on collect fee mode.
 * Dispatches to compounding or concentrated liquidity based on the mode.
 * @param collectFeeMode - The collect fee mode
 * @param sqrtMinPrice - The minimum sqrt price
 * @param sqrtMaxPrice - The maximum sqrt price
 * @param sqrtPrice - The current sqrt price
 * @param liquidity - The initial liquidity
 * @returns InitialPoolInformation
 */
export function getInitialPoolInformation(
  collectFeeMode: CollectFeeMode,
  sqrtMinPrice: BN,
  sqrtMaxPrice: BN,
  sqrtPrice: BN,
  liquidity: BN,
): InitialPoolInformation {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    return getInitialCompoundingPoolInformation(sqrtPrice, liquidity);
  } else {
    return getInitialConcentratedLiquidityPoolInformation(
      sqrtMinPrice,
      sqrtMaxPrice,
      sqrtPrice,
      liquidity,
    );
  }
}

/**
 * Computes liquidityDelta from a user's token A amount.
 * - Compounding (existing pool): proportional formula using pool reserves
 * - Compounding (pool creation): sqrtPrice-based formula when tokenAAmount is not provided
 * - Concentrated: sqrtPrice-based formula
 * @param amountA - User's token A amount (BN)
 * @param sqrtPrice - The current sqrt price (BN)
 * @param sqrtMaxPrice - The maximum sqrt price (BN)
 * @param collectFeeMode - The collect fee mode
 * @param tokenAAmount - Pool's token A reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @returns The liquidity delta (BN)
 */
export function getLiquidityDeltaFromAmountA(
  amountA: BN,
  sqrtPrice: BN,
  sqrtMaxPrice: BN,
  collectFeeMode: CollectFeeMode,
  tokenAAmount?: BN,
  liquidity?: BN,
): BN {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    if (tokenAAmount && liquidity) {
      return getLiquidityDeltaFromAmountAForCompoundingLiquidity(
        amountA,
        tokenAAmount,
        liquidity,
      );
    }
    return getPoolCreationLiquidityDeltaFromAmountAForCompoundingLiquidity(
      amountA,
      sqrtPrice,
    );
  }
  return getLiquidityDeltaFromAmountAForConcentratedLiquidity(
    amountA,
    sqrtPrice,
    sqrtMaxPrice,
  );
}

/**
 * Computes liquidityDelta from a user's token B amount.
 * - Compounding (existing pool): proportional formula using pool reserves
 * - Compounding (pool creation): sqrtPrice-based formula when tokenBAmount is not provided
 * - Concentrated: sqrtPrice-based formula
 * @param amountB - User's token B amount (BN)
 * @param sqrtMinPrice - The minimum sqrt price (BN)
 * @param sqrtPrice - The current sqrt price (BN)
 * @param collectFeeMode - The collect fee mode
 * @param tokenBAmount - Pool's token B reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @returns The liquidity delta (BN)
 */
export function getLiquidityDeltaFromAmountB(
  amountB: BN,
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  collectFeeMode: CollectFeeMode,
  tokenBAmount?: BN,
  liquidity?: BN,
): BN {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    if (tokenBAmount && liquidity) {
      return getLiquidityDeltaFromAmountBForCompoundingLiquidity(
        amountB,
        tokenBAmount,
        liquidity,
      );
    }
    return getPoolCreationLiquidityDeltaFromAmountBForCompoundingLiquidity(
      amountB,
      sqrtPrice,
    );
  }
  return getLiquidityDeltaFromAmountBForConcentratedLiquidity(
    amountB,
    sqrtMinPrice,
    sqrtPrice,
  );
}

/**
 * Computes token A amount from a liquidityDelta.
 * - Compounding (existing pool): proportional formula using pool reserves
 * - Compounding (pool creation): sqrtPrice-based formula when tokenAAmount is not provided
 * - Concentrated: sqrtPrice-based formula
 */
export function getAmountAFromLiquidityDelta(
  sqrtPrice: BN,
  sqrtMaxPrice: BN,
  liquidityDelta: BN,
  rounding: Rounding,
  collectFeeMode: CollectFeeMode,
  tokenAAmount?: BN,
  liquidity?: BN,
): BN {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    if (tokenAAmount && liquidity) {
      return getAmountAFromLiquidityDeltaForCompoundingLiquidity(
        liquidityDelta,
        tokenAAmount,
        liquidity,
        rounding,
      );
    }
    return getPoolCreationAmountAFromLiquidityDeltaForCompoundingLiquidity(
      sqrtPrice,
      liquidityDelta,
    );
  }
  return getAmountAFromLiquidityDeltaForConcentratedLiquidity(
    sqrtPrice,
    sqrtMaxPrice,
    liquidityDelta,
    rounding,
  );
}

/**
 * Computes token B amount from a liquidityDelta.
 * - Compounding (existing pool): proportional formula using pool reserves
 * - Compounding (pool creation): sqrtPrice-based formula when tokenBAmount is not provided
 * - Concentrated: sqrtPrice-based formula
 * @param sqrtMinPrice - The minimum sqrt price (BN)
 * @param sqrtPrice - The current sqrt price (BN)
 * @param liquidityDelta - The liquidity delta (BN)
 * @param rounding - The rounding (Rounding)
 * @param collectFeeMode - The collect fee mode
 * @param tokenBAmount - Pool's token B reserve (BN)
 * @param liquidity - Pool's total liquidity (BN)
 * @returns The token B amount (BN)
 */
export function getAmountBFromLiquidityDelta(
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  liquidityDelta: BN,
  rounding: Rounding,
  collectFeeMode: CollectFeeMode,
  tokenBAmount?: BN,
  liquidity?: BN,
): BN {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    if (tokenBAmount && liquidity) {
      return getAmountBFromLiquidityDeltaForCompoundingLiquidity(
        liquidityDelta,
        tokenBAmount,
        liquidity,
        rounding,
      );
    }
    return getPoolCreationAmountBFromLiquidityDeltaForCompoundingLiquidity(
      sqrtPrice,
      liquidityDelta,
    );
  }
  return getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtMinPrice,
    sqrtPrice,
    liquidityDelta,
    rounding,
  );
}
