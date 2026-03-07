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

// ─── Compounding ──────────────────────────────────────────────────────────────

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

// ─── Concentrated ─────────────────────────────────────────────────────────────

export class ConcentratedLiquidityHandler implements LiquidityHandler {
  constructor(
    private sqrtMaxPrice: BN,
    private sqrtMinPrice: BN,
    private sqrtPrice: BN,
    private liquidity: BN,
  ) {}

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

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Factory: returns the appropriate LiquidityHandler based on pool's collectFeeMode.
 */
export function getLiquidityHandler(poolState: PoolState): LiquidityHandler {
  if (
    (poolState.collectFeeMode as CollectFeeMode) === CollectFeeMode.Compounding
  ) {
    return new CompoundingLiquidityHandler(
      new BN(poolState.tokenAAmount.toString()),
      new BN(poolState.tokenBAmount.toString()),
      new BN(poolState.liquidity.toString()),
    );
  }
  return new ConcentratedLiquidityHandler(
    poolState.sqrtMaxPrice,
    poolState.sqrtMinPrice,
    poolState.sqrtPrice,
    poolState.liquidity,
  );
}

/**
 * Gets initial pool information dispatched by collectFeeMode.
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
  }
  return getInitialConcentratedLiquidityPoolInformation(
    sqrtMinPrice,
    sqrtMaxPrice,
    sqrtPrice,
    liquidity,
  );
}

/**
 * Liquidity delta from amount A — dispatched by collectFeeMode.
 */
export function getLiquidityDeltaFromAmountA(
  amountA: BN,
  sqrtPrice: BN,
  sqrtMaxPrice: BN,
  collectFeeMode: CollectFeeMode,
): BN {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    return getLiquidityDeltaFromAmountAForCompoundingLiquidity(
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
 * Liquidity delta from amount B — dispatched by collectFeeMode.
 */
export function getLiquidityDeltaFromAmountB(
  amountB: BN,
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  collectFeeMode: CollectFeeMode,
): BN {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    return getLiquidityDeltaFromAmountBForCompoundingLiquidity(
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
 * Amount A from liquidity delta — dispatched by collectFeeMode.
 */
export function getAmountAFromLiquidityDelta(
  sqrtPrice: BN,
  sqrtMaxPrice: BN,
  liquidityDelta: BN,
  rounding: Rounding,
  collectFeeMode: CollectFeeMode,
  tokenAAmount: BN,
  liquidity: BN,
): BN {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    return getAmountAFromLiquidityDeltaForCompoundingLiquidity(
      tokenAAmount,
      liquidity,
      liquidityDelta,
      rounding,
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
 * Amount B from liquidity delta — dispatched by collectFeeMode.
 */
export function getAmountBFromLiquidityDelta(
  sqrtMinPrice: BN,
  sqrtPrice: BN,
  liquidityDelta: BN,
  rounding: Rounding,
  collectFeeMode: CollectFeeMode,
  tokenBAmount: BN,
  liquidity: BN,
): BN {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    return getAmountBFromLiquidityDeltaForCompoundingLiquidity(
      tokenBAmount,
      liquidity,
      liquidityDelta,
      rounding,
    );
  }
  return getAmountBFromLiquidityDeltaForConcentratedLiquidity(
    sqrtMinPrice,
    sqrtPrice,
    liquidityDelta,
    rounding,
  );
}
