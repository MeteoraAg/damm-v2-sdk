import {
  calculateTransferFeeExcludedAmount,
  calculateTransferFeeIncludedAmount,
  getAmountWithSlippage,
  getPriceImpact,
  hasPartner,
  isSwapEnabled,
} from "../helpers";
import {
  FeeMode,
  PoolState,
  Quote2Result,
  Rounding,
  SwapMode,
  SwapResult2,
  TradeDirection,
} from "../types";
import BN from "bn.js";
import {
  getFeeMode,
  getFeeOnAmount,
  getIncludedFeeAmount,
  getMaxFeeNumerator,
  getTotalTradingFeeFromExcludedFeeAmount,
  getTotalTradingFeeFromIncludedFeeAmount,
  splitFees,
} from "./feeMath";
import {
  getAmountAFromLiquidityDelta,
  getAmountBFromLiquidityDelta,
  getNextSqrtPriceFromInput,
  getNextSqrtPriceFromOutput,
} from "./curve";
import { Mint } from "@solana/spl-token";

/**
 * Gets the swap result from exact input
 * @param poolState - The pool state
 * @param amountIn - The amount in
 * @param feeMode - The fee mode
 * @param tradeDirection - The trade direction
 * @param currentPoint - The current point
 * @returns The swap result from exact input
 */
export function getSwapResultFromExactInput(
  poolState: PoolState,
  amountIn: BN,
  feeMode: FeeMode,
  tradeDirection: TradeDirection,
  currentPoint: BN
): SwapResult2 {
  let actualProtocolFee = new BN(0);
  let actualTradingFee = new BN(0);
  let actualReferralFee = new BN(0);
  let actualPartnerFee = new BN(0);

  const maxFeeNumerator = getMaxFeeNumerator(poolState.version);

  // We can compute the trade_fee_numerator here. Instead of separately for amount_in, and amount_out.
  // This is because FeeRateLimiter (fee rate scale based on amount) only applied when fee_mode.fees_on_input
  // (a.k.a TradeDirection::QuoteToBase + CollectFeeMode::QuoteToken)
  // For the rest of the time, the fee rate is not dependent on amount.
  const tradeFeeNumerator = getTotalTradingFeeFromIncludedFeeAmount(
    poolState.poolFees,
    currentPoint,
    poolState.activationPoint,
    amountIn,
    tradeDirection,
    maxFeeNumerator,
    poolState.poolFees.initSqrtPrice,
    poolState.sqrtPrice
  );

  let actualAmountIn: BN;
  if (feeMode.feesOnInput) {
    const { amount, tradingFee, protocolFee, partnerFee, referralFee } =
      getFeeOnAmount(
        poolState.poolFees,
        amountIn,
        tradeFeeNumerator,
        feeMode.hasReferral,
        hasPartner(poolState)
      );

    actualProtocolFee = protocolFee;
    actualTradingFee = tradingFee;
    actualReferralFee = referralFee;
    actualPartnerFee = partnerFee;

    actualAmountIn = amount;
  } else {
    actualAmountIn = amountIn;
  }

  let swapAmountFromInput;
  if (tradeDirection === TradeDirection.AtoB) {
    swapAmountFromInput = calculateAtoBFromAmountIn(poolState, actualAmountIn);
  } else {
    swapAmountFromInput = calculateBtoAFromAmountIn(poolState, actualAmountIn);
  }
  const { outputAmount, nextSqrtPrice, amountLeft } = swapAmountFromInput;

  let actualAmountOut: BN;
  if (feeMode.feesOnInput) {
    actualAmountOut = outputAmount;
  } else {
    const { amount, tradingFee, protocolFee, partnerFee, referralFee } =
      getFeeOnAmount(
        poolState.poolFees,
        outputAmount,
        tradeFeeNumerator,
        feeMode.hasReferral,
        hasPartner(poolState)
      );

    actualProtocolFee = protocolFee;
    actualTradingFee = tradingFee;
    actualReferralFee = referralFee;
    actualPartnerFee = partnerFee;

    actualAmountOut = amount;
  }

  return {
    amountLeft,
    includedFeeInputAmount: amountIn,
    excludedFeeInputAmount: actualAmountIn,
    outputAmount: actualAmountOut,
    nextSqrtPrice: nextSqrtPrice,
    tradingFee: actualTradingFee,
    protocolFee: actualProtocolFee,
    partnerFee: actualPartnerFee,
    referralFee: actualReferralFee,
  };
}

/**
 * Calculates the swap result from exact input
 * @param poolState - The pool state
 * @param amountIn - The amount in
 * @returns The swap result from exact input
 */
export function calculateAtoBFromAmountIn(
  poolState: PoolState,
  amountIn: BN
): {
  outputAmount: BN;
  nextSqrtPrice: BN;
  amountLeft: BN;
} {
  // finding new target price
  const nextSqrtPrice = getNextSqrtPriceFromInput(
    poolState.sqrtPrice,
    poolState.liquidity,
    amountIn,
    true
  );

  if (nextSqrtPrice.lt(poolState.sqrtMinPrice)) {
    throw new Error("Price range is violated");
  }

  // finding output amount
  const outputAmount = getAmountBFromLiquidityDelta(
    nextSqrtPrice,
    poolState.sqrtPrice,
    poolState.liquidity,
    Rounding.Down
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
export function calculateBtoAFromAmountIn(
  poolState: PoolState,
  amountIn: BN
): {
  outputAmount: BN;
  nextSqrtPrice: BN;
  amountLeft: BN;
} {
  // finding new target price
  const nextSqrtPrice = getNextSqrtPriceFromInput(
    poolState.sqrtPrice,
    poolState.liquidity,
    amountIn,
    false
  );

  if (nextSqrtPrice.gt(poolState.sqrtMaxPrice)) {
    throw new Error("Price range is violated");
  }

  // finding output amount
  const outputAmount = getAmountAFromLiquidityDelta(
    poolState.sqrtPrice,
    nextSqrtPrice,
    poolState.liquidity,
    Rounding.Down
  );

  return {
    outputAmount,
    nextSqrtPrice,
    amountLeft: new BN(0),
  };
}

/**
 * Gets the swap result from partial input
 * @param poolState - The pool state
 * @param amountIn - The amount in
 * @param feeMode - The fee mode
 * @param tradeDirection - The trade direction
 * @param currentPoint - The current point
 * @returns The swap result from partial input
 */
export function getSwapResultFromPartialInput(
  poolState: PoolState,
  amountIn: BN,
  feeMode: FeeMode,
  tradeDirection: TradeDirection,
  currentPoint: BN
): SwapResult2 {
  let actualProtocolFee = new BN(0);
  let actualTradingFee = new BN(0);
  let actualReferralFee = new BN(0);
  let actualPartnerFee = new BN(0);

  const maxFeeNumerator = getMaxFeeNumerator(poolState.version);

  const tradeFeeNumerator = getTotalTradingFeeFromIncludedFeeAmount(
    poolState.poolFees,
    currentPoint,
    poolState.activationPoint,
    amountIn,
    tradeDirection,
    maxFeeNumerator,
    poolState.poolFees.initSqrtPrice,
    poolState.sqrtPrice
  );

  let actualAmountIn: BN;
  if (feeMode.feesOnInput) {
    const { amount, tradingFee, protocolFee, partnerFee, referralFee } =
      getFeeOnAmount(
        poolState.poolFees,
        amountIn,
        tradeFeeNumerator,
        feeMode.hasReferral,
        hasPartner(poolState)
      );
    actualProtocolFee = protocolFee;
    actualTradingFee = tradingFee;
    actualReferralFee = referralFee;
    actualPartnerFee = partnerFee;

    actualAmountIn = amount;
  } else {
    actualAmountIn = amountIn;
  }

  let swapAmountFromInput;
  if (tradeDirection === TradeDirection.AtoB) {
    swapAmountFromInput = calculateAtoBFromPartialAmountIn(
      poolState,
      actualAmountIn
    );
  } else {
    swapAmountFromInput = calculateBtoAFromPartialAmountIn(
      poolState,
      actualAmountIn
    );
  }

  let { amountLeft, outputAmount, nextSqrtPrice } = swapAmountFromInput;

  let includedFeeInputAmount: BN;
  if (amountLeft.gt(new BN(0))) {
    actualAmountIn = actualAmountIn.sub(amountLeft);

    if (feeMode.feesOnInput) {
      const tradeFeeNumerator = getTotalTradingFeeFromExcludedFeeAmount(
        poolState.poolFees,
        currentPoint,
        poolState.activationPoint,
        actualAmountIn,
        tradeDirection,
        maxFeeNumerator,
        poolState.poolFees.initSqrtPrice,
        poolState.sqrtPrice
      );

      const { includedFeeAmount, feeAmount } = getIncludedFeeAmount(
        tradeFeeNumerator,
        actualAmountIn
      );

      const { tradingFee, protocolFee, referralFee, partnerFee } = splitFees(
        poolState.poolFees,
        feeAmount,
        feeMode.hasReferral,
        hasPartner(poolState)
      );

      actualProtocolFee = protocolFee;
      actualTradingFee = tradingFee;
      actualReferralFee = referralFee;
      actualPartnerFee = partnerFee;

      includedFeeInputAmount = includedFeeAmount;
    } else {
      includedFeeInputAmount = actualAmountIn;
    }
  } else {
    includedFeeInputAmount = amountIn;
  }

  let actualAmountOut: BN;
  if (feeMode.feesOnInput) {
    actualAmountOut = outputAmount;
  } else {
    const { amount, tradingFee, protocolFee, partnerFee, referralFee } =
      getFeeOnAmount(
        poolState.poolFees,
        outputAmount,
        tradeFeeNumerator,
        feeMode.hasReferral,
        hasPartner(poolState)
      );
    actualProtocolFee = protocolFee;
    actualTradingFee = tradingFee;
    actualReferralFee = referralFee;
    actualPartnerFee = partnerFee;

    actualAmountOut = amount;
  }

  return {
    includedFeeInputAmount,
    excludedFeeInputAmount: actualAmountIn,
    amountLeft,
    outputAmount: actualAmountOut,
    nextSqrtPrice,
    tradingFee: actualTradingFee,
    protocolFee: actualProtocolFee,
    partnerFee: actualPartnerFee,
    referralFee: actualReferralFee,
  };
}

/**
 * Calculates the swap result from partial input
 * @param poolState - The pool state
 * @param amountIn - The amount in
 * @returns The swap result from partial input
 */
export function calculateAtoBFromPartialAmountIn(
  poolState: PoolState,
  amountIn: BN
): {
  outputAmount: BN;
  nextSqrtPrice: BN;
  amountLeft: BN;
} {
  const maxAmountIn = getAmountAFromLiquidityDelta(
    poolState.sqrtMinPrice,
    poolState.sqrtPrice,
    poolState.liquidity,
    Rounding.Up
  );

  let consumedInAmount: BN;
  let nextSqrtPrice: BN;

  if (amountIn.gte(maxAmountIn)) {
    consumedInAmount = maxAmountIn;
    nextSqrtPrice = poolState.sqrtMinPrice;
  } else {
    nextSqrtPrice = getNextSqrtPriceFromInput(
      poolState.sqrtPrice,
      poolState.liquidity,
      amountIn,
      true
    );
    consumedInAmount = amountIn;
  }

  const outputAmount = getAmountBFromLiquidityDelta(
    nextSqrtPrice,
    poolState.sqrtPrice,
    poolState.liquidity,
    Rounding.Down
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
export function calculateBtoAFromPartialAmountIn(
  poolState: PoolState,
  amountIn: BN
): {
  outputAmount: BN;
  nextSqrtPrice: BN;
  amountLeft: BN;
} {
  const maxAmountIn = getAmountBFromLiquidityDelta(
    poolState.sqrtPrice,
    poolState.sqrtMaxPrice,
    poolState.liquidity,
    Rounding.Up
  );

  let consumedInAmount: BN;
  let nextSqrtPrice: BN;

  if (amountIn.gte(maxAmountIn)) {
    consumedInAmount = maxAmountIn;
    nextSqrtPrice = poolState.sqrtMaxPrice;
  } else {
    nextSqrtPrice = getNextSqrtPriceFromInput(
      poolState.sqrtPrice,
      poolState.liquidity,
      amountIn,
      false
    );
    consumedInAmount = amountIn;
  }

  const outputAmount = getAmountAFromLiquidityDelta(
    poolState.sqrtPrice,
    nextSqrtPrice,
    poolState.liquidity,
    Rounding.Down
  );

  const amountLeft = amountIn.sub(consumedInAmount);

  return {
    outputAmount,
    nextSqrtPrice,
    amountLeft,
  };
}

/**
 * Gets the swap result from exact output
 * @param poolState - The pool state
 * @param amountOut - The amount out
 * @param feeMode - The fee mode
 * @param tradeDirection - The trade direction
 * @param currentPoint - The current point
 * @returns The swap result from exact output
 */
export function getSwapResultFromExactOutput(
  poolState: PoolState,
  amountOut: BN,
  feeMode: FeeMode,
  tradeDirection: TradeDirection,
  currentPoint: BN
): SwapResult2 {
  let actualProtocolFee = new BN(0);
  let actualTradingFee = new BN(0);
  let actualReferralFee = new BN(0);
  let actualPartnerFee = new BN(0);

  const maxFeeNumerator = getMaxFeeNumerator(poolState.version);

  let includedFeeAmountOut: BN;
  if (feeMode.feesOnInput) {
    includedFeeAmountOut = amountOut;
  } else {
    const tradeFeeNumerator = getTotalTradingFeeFromExcludedFeeAmount(
      poolState.poolFees,
      currentPoint,
      poolState.activationPoint,
      amountOut,
      tradeDirection,
      maxFeeNumerator,
      poolState.poolFees.initSqrtPrice,
      poolState.sqrtPrice
    );

    const { includedFeeAmount, feeAmount } = getIncludedFeeAmount(
      tradeFeeNumerator,
      amountOut
    );

    const split = splitFees(
      poolState.poolFees,
      feeAmount,
      feeMode.hasReferral,
      hasPartner(poolState)
    );

    actualTradingFee = split.tradingFee;
    actualProtocolFee = split.protocolFee;
    actualReferralFee = split.referralFee;
    actualPartnerFee = split.partnerFee;

    includedFeeAmountOut = includedFeeAmount;
  }

  let swapAmountFromOutput;
  if (tradeDirection === TradeDirection.AtoB) {
    swapAmountFromOutput = calculateAtoBFromAmountOut(
      poolState,
      includedFeeAmountOut
    );
  } else {
    swapAmountFromOutput = calculateBtoAFromAmountOut(
      poolState,
      includedFeeAmountOut
    );
  }
  const { inputAmount, nextSqrtPrice } = swapAmountFromOutput;

  let includedFeeInputAmount: BN;
  if (feeMode.feesOnInput) {
    const tradeFeeNumerator = getTotalTradingFeeFromExcludedFeeAmount(
      poolState.poolFees,
      currentPoint,
      poolState.activationPoint,
      inputAmount,
      tradeDirection,
      maxFeeNumerator,
      poolState.poolFees.initSqrtPrice,
      poolState.sqrtPrice
    );

    const { includedFeeAmount, feeAmount } = getIncludedFeeAmount(
      tradeFeeNumerator,
      inputAmount
    );

    const split = splitFees(
      poolState.poolFees,
      feeAmount,
      feeMode.hasReferral,
      hasPartner(poolState)
    );

    actualTradingFee = split.tradingFee;
    actualProtocolFee = split.protocolFee;
    actualReferralFee = split.referralFee;
    actualPartnerFee = split.partnerFee;

    includedFeeInputAmount = includedFeeAmount;
  } else {
    includedFeeInputAmount = inputAmount;
  }

  return {
    amountLeft: new BN(0),
    includedFeeInputAmount: includedFeeInputAmount,
    excludedFeeInputAmount: inputAmount,
    outputAmount: amountOut,
    nextSqrtPrice: nextSqrtPrice,
    tradingFee: actualTradingFee,
    protocolFee: actualProtocolFee,
    partnerFee: actualPartnerFee,
    referralFee: actualReferralFee,
  };
}

/**
 * Calculates the swap result from exact output
 * @param poolState - The pool state
 * @param amountOut - The amount out
 * @returns The swap result from exact output
 */
export function calculateAtoBFromAmountOut(
  poolState: PoolState,
  amountOut: BN
): { inputAmount: BN; nextSqrtPrice: BN } {
  const nextSqrtPrice = getNextSqrtPriceFromOutput(
    poolState.sqrtPrice,
    poolState.liquidity,
    amountOut,
    true
  );

  if (nextSqrtPrice.lt(poolState.sqrtMinPrice)) {
    throw new Error("Price Range Violation");
  }

  const inputAmount = getAmountAFromLiquidityDelta(
    nextSqrtPrice,
    poolState.sqrtPrice,
    poolState.liquidity,
    Rounding.Up
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
export function calculateBtoAFromAmountOut(
  poolState: PoolState,
  amountOut: BN
): { inputAmount: BN; nextSqrtPrice: BN } {
  const nextSqrtPrice = getNextSqrtPriceFromOutput(
    poolState.sqrtPrice,
    poolState.liquidity,
    amountOut,
    false
  );

  if (nextSqrtPrice.gt(poolState.sqrtMaxPrice)) {
    throw new Error("Price Range Violation");
  }

  const inputAmount = getAmountBFromLiquidityDelta(
    poolState.sqrtPrice,
    nextSqrtPrice,
    poolState.liquidity,
    Rounding.Up
  );

  return {
    inputAmount,
    nextSqrtPrice,
  };
}

/**
 * Swaps quote exact input
 * @param pool - The pool
 * @param currentPoint - The current point
 * @param amountIn - The amount in
 * @param slippage - The slippage
 * @param aToB - The trade direction
 * @param hasReferral - The has referral
 * @param tokenADecimal - The token A decimal
 * @param tokenBDecimal - The token B decimal
 * @param inputTokenInfo - The input token info
 * @param outputTokenInfo - The output token info
 * @returns The swap quote exact input
 */
export function swapQuoteExactInput(
  pool: PoolState,
  currentPoint: BN,
  amountIn: BN,
  slippage: number,
  aToB: boolean,
  hasReferral: boolean,
  tokenADecimal: number,
  tokenBDecimal: number,
  inputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  },
  outputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  }
): Quote2Result {
  if (amountIn.lte(new BN(0))) {
    throw new Error("Amount in must be greater than 0");
  }

  if (!isSwapEnabled(pool, currentPoint)) {
    throw new Error("Swap is disabled");
  }

  const tradeDirection = aToB ? TradeDirection.AtoB : TradeDirection.BtoA;

  const feeMode = getFeeMode(pool.collectFeeMode, tradeDirection, hasReferral);

  let actualAmountIn = amountIn;
  if (inputTokenInfo) {
    actualAmountIn = calculateTransferFeeExcludedAmount(
      amountIn,
      inputTokenInfo.mint,
      inputTokenInfo.currentEpoch
    ).amount;
  }

  const swapResult = getSwapResultFromExactInput(
    pool,
    actualAmountIn,
    feeMode,
    tradeDirection,
    currentPoint
  );

  let actualAmountOut = swapResult.outputAmount;
  if (outputTokenInfo) {
    actualAmountOut = calculateTransferFeeExcludedAmount(
      swapResult.outputAmount,
      outputTokenInfo.mint,
      outputTokenInfo.currentEpoch
    ).amount;
  }

  const minimumAmountOut = getAmountWithSlippage(
    actualAmountOut,
    slippage,
    SwapMode.ExactIn
  );

  const priceImpact = getPriceImpact(
    actualAmountIn,
    actualAmountOut,
    pool.sqrtPrice,
    aToB,
    tokenADecimal,
    tokenBDecimal
  );

  return {
    ...swapResult,
    minimumAmountOut,
    priceImpact,
  };
}

/**
 * Swaps quote exact output
 * @param pool - The pool
 * @param currentPoint - The current point
 * @param amountOut - The amount out
 * @param slippage - The slippage
 * @param aToB - The trade direction
 * @param hasReferral - The has referral
 * @param tokenADecimal - The token A decimal
 * @param tokenBDecimal - The token B decimal
 * @param inputTokenInfo - The input token info
 * @param outputTokenInfo - The output token info
 * @returns The swap quote exact output
 */
export function swapQuoteExactOutput(
  pool: PoolState,
  currentPoint: BN,
  amountOut: BN,
  slippage: number,
  aToB: boolean,
  hasReferral: boolean,
  tokenADecimal: number,
  tokenBDecimal: number,
  inputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  },
  outputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  }
): Quote2Result {
  if (amountOut.lte(new BN(0))) {
    throw new Error("Amount out must be greater than 0");
  }

  if (!isSwapEnabled(pool, currentPoint)) {
    throw new Error("Swap is disabled");
  }

  const tradeDirection = aToB ? TradeDirection.AtoB : TradeDirection.BtoA;

  const feeMode = getFeeMode(pool.collectFeeMode, tradeDirection, hasReferral);

  let actualAmountOut = amountOut;
  if (outputTokenInfo) {
    actualAmountOut = calculateTransferFeeIncludedAmount(
      amountOut,
      outputTokenInfo.mint,
      outputTokenInfo.currentEpoch
    ).amount;
  }

  const swapResult = getSwapResultFromExactOutput(
    pool,
    actualAmountOut,
    feeMode,
    tradeDirection,
    currentPoint
  );

  let actualAmountIn = swapResult.includedFeeInputAmount;
  if (inputTokenInfo) {
    actualAmountIn = calculateTransferFeeIncludedAmount(
      swapResult.includedFeeInputAmount,
      inputTokenInfo.mint,
      inputTokenInfo.currentEpoch
    ).amount;
  }

  const maximumAmountIn = getAmountWithSlippage(
    actualAmountIn,
    slippage,
    SwapMode.ExactOut
  );

  const priceImpact = getPriceImpact(
    actualAmountIn,
    actualAmountOut,
    pool.sqrtPrice,
    aToB,
    tokenADecimal,
    tokenBDecimal
  );

  return {
    ...swapResult,
    maximumAmountIn,
    priceImpact,
  };
}

/**
 * Swaps quote partial input
 * @param pool - The pool
 * @param currentPoint - The current point
 * @param amountIn - The amount in
 * @param slippage - The slippage
 * @param aToB - The trade direction
 * @param hasReferral - The has referral
 * @param tokenADecimal - The token A decimal
 * @param tokenBDecimal - The token B decimal
 * @param inputTokenInfo - The input token info
 * @param outputTokenInfo - The output token info
 * @returns The swap quote partial input
 */
export function swapQuotePartialInput(
  pool: PoolState,
  currentPoint: BN,
  amountIn: BN,
  slippage: number,
  aToB: boolean,
  hasReferral: boolean,
  tokenADecimal: number,
  tokenBDecimal: number,
  inputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  },
  outputTokenInfo?: {
    mint: Mint;
    currentEpoch: number;
  }
): Quote2Result {
  if (amountIn.lte(new BN(0))) {
    throw new Error("Amount in must be greater than 0");
  }

  if (!isSwapEnabled(pool, currentPoint)) {
    throw new Error("Swap is disabled");
  }

  const tradeDirection = aToB ? TradeDirection.AtoB : TradeDirection.BtoA;

  const feeMode = getFeeMode(pool.collectFeeMode, tradeDirection, hasReferral);

  let actualAmountIn = amountIn;
  if (inputTokenInfo) {
    actualAmountIn = calculateTransferFeeExcludedAmount(
      amountIn,
      inputTokenInfo.mint,
      inputTokenInfo.currentEpoch
    ).amount;
  }

  const swapResult = getSwapResultFromPartialInput(
    pool,
    actualAmountIn,
    feeMode,
    tradeDirection,
    currentPoint
  );

  let actualAmountOut = swapResult.outputAmount;
  if (outputTokenInfo) {
    actualAmountOut = calculateTransferFeeExcludedAmount(
      swapResult.outputAmount,
      outputTokenInfo.mint,
      outputTokenInfo.currentEpoch
    ).amount;
  }

  const minimumAmountOut = getAmountWithSlippage(
    actualAmountOut,
    slippage,
    SwapMode.PartialFill
  );

  const priceImpact = getPriceImpact(
    actualAmountIn,
    actualAmountOut,
    pool.sqrtPrice,
    aToB,
    tokenADecimal,
    tokenBDecimal
  );

  return {
    ...swapResult,
    minimumAmountOut,
    priceImpact,
  };
}
