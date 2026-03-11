import {
  calculateTransferFeeExcludedAmount,
  calculateTransferFeeIncludedAmount,
  getAmountWithSlippage,
  getPriceImpact,
  isSwapEnabled,
} from "../helpers";
import {
  CollectFeeMode,
  FeeMode,
  PoolState,
  Quote2Result,
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
import { Mint } from "@solana/spl-token";
import { AmountIsZeroError, SwapDisabledError } from "../errors";
import {
  getLiquidityHandler,
  getNextSqrtPriceForCompoundingLiquidity,
} from "./liquidity";

/**
 * Applies the swap result to the pool state
 * @param poolState - The pool state
 * @param result - The swap result
 * @param feeMode - The fee mode
 * @param tradeDirection - The trade direction
 * @returns The post-swap sqrt price
 */
export function applySwapResult(
  poolState: PoolState,
  result: SwapResult2,
  feeMode: FeeMode,
  tradeDirection: TradeDirection,
): BN {
  if (poolState.collectFeeMode !== CollectFeeMode.Compounding) {
    return result.nextSqrtPrice;
  }

  const tradingFee = result.claimingFee.add(result.compoundingFee);

  const includedFeeOutputAmount = feeMode.feesOnInput
    ? result.outputAmount
    : result.outputAmount
        .add(tradingFee)
        .add(result.protocolFee)
        .add(result.referralFee);

  let newTokenAAmount: BN;
  let newTokenBAmount: BN;

  if (tradeDirection === TradeDirection.AtoB) {
    newTokenAAmount = poolState.tokenAAmount.add(result.excludedFeeInputAmount);
    newTokenBAmount = poolState.tokenBAmount.sub(includedFeeOutputAmount);
  } else {
    newTokenBAmount = poolState.tokenBAmount.add(result.excludedFeeInputAmount);
    newTokenAAmount = poolState.tokenAAmount.sub(includedFeeOutputAmount);
  }

  newTokenBAmount = newTokenBAmount.add(result.compoundingFee);

  return getNextSqrtPriceForCompoundingLiquidity(
    newTokenAAmount,
    newTokenBAmount,
  );
}

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
  currentPoint: BN,
): SwapResult2 {
  let actualProtocolFee = new BN(0);
  let actualClaimingFee = new BN(0);
  let actualCompoundingFee = new BN(0);
  let actualReferralFee = new BN(0);

  const liquidityHandler = getLiquidityHandler(poolState);
  const maxFeeNumerator = getMaxFeeNumerator(poolState.feeVersion);

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
    poolState.sqrtPrice,
  );

  let actualAmountIn: BN;
  if (feeMode.feesOnInput) {
    const { amount, claimingFee, compoundingFee, protocolFee, referralFee } =
      getFeeOnAmount(
        poolState.poolFees,
        amountIn,
        tradeFeeNumerator,
        feeMode.hasReferral,
      );

    actualClaimingFee = claimingFee;
    actualCompoundingFee = compoundingFee;
    actualProtocolFee = protocolFee;
    actualReferralFee = referralFee;

    actualAmountIn = amount;
  } else {
    actualAmountIn = amountIn;
  }

  let swapAmountFromInput;
  if (tradeDirection === TradeDirection.AtoB) {
    swapAmountFromInput =
      liquidityHandler.calculateAtoBFromAmountIn(actualAmountIn);
  } else {
    swapAmountFromInput =
      liquidityHandler.calculateBtoAFromAmountIn(actualAmountIn);
  }
  const { outputAmount, nextSqrtPrice, amountLeft } = swapAmountFromInput;

  let actualAmountOut: BN;
  if (feeMode.feesOnInput) {
    actualAmountOut = outputAmount;
  } else {
    const { amount, claimingFee, compoundingFee, protocolFee, referralFee } =
      getFeeOnAmount(
        poolState.poolFees,
        outputAmount,
        tradeFeeNumerator,
        feeMode.hasReferral,
      );

    actualClaimingFee = claimingFee;
    actualCompoundingFee = compoundingFee;
    actualProtocolFee = protocolFee;
    actualReferralFee = referralFee;

    actualAmountOut = amount;
  }

  const result: SwapResult2 = {
    amountLeft,
    includedFeeInputAmount: amountIn,
    excludedFeeInputAmount: actualAmountIn,
    outputAmount: actualAmountOut,
    nextSqrtPrice,
    claimingFee: actualClaimingFee,
    compoundingFee: actualCompoundingFee,
    protocolFee: actualProtocolFee,
    referralFee: actualReferralFee,
  };

  result.nextSqrtPrice = applySwapResult(
    poolState,
    result,
    feeMode,
    tradeDirection,
  );

  return result;
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
  currentPoint: BN,
): SwapResult2 {
  let actualProtocolFee = new BN(0);
  let actualClaimingFee = new BN(0);
  let actualCompoundingFee = new BN(0);
  let actualReferralFee = new BN(0);

  const liquidityHandler = getLiquidityHandler(poolState);

  const maxFeeNumerator = getMaxFeeNumerator(poolState.feeVersion);

  const tradeFeeNumerator = getTotalTradingFeeFromIncludedFeeAmount(
    poolState.poolFees,
    currentPoint,
    poolState.activationPoint,
    amountIn,
    tradeDirection,
    maxFeeNumerator,
    poolState.poolFees.initSqrtPrice,
    poolState.sqrtPrice,
  );

  let actualAmountIn: BN;
  if (feeMode.feesOnInput) {
    const { amount, claimingFee, compoundingFee, protocolFee, referralFee } =
      getFeeOnAmount(
        poolState.poolFees,
        amountIn,
        tradeFeeNumerator,
        feeMode.hasReferral,
      );

    actualProtocolFee = protocolFee;
    actualClaimingFee = claimingFee;
    actualCompoundingFee = compoundingFee;
    actualReferralFee = referralFee;
    actualAmountIn = amount;
  } else {
    actualAmountIn = amountIn;
  }

  let swapAmountFromInput;
  if (tradeDirection === TradeDirection.AtoB) {
    swapAmountFromInput =
      liquidityHandler.calculateAtoBFromPartialAmountIn(actualAmountIn);
  } else {
    swapAmountFromInput =
      liquidityHandler.calculateBtoAFromPartialAmountIn(actualAmountIn);
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
        poolState.sqrtPrice,
      );

      const { includedFeeAmount, feeAmount } = getIncludedFeeAmount(
        tradeFeeNumerator,
        actualAmountIn,
      );

      const { claimingFee, compoundingFee, protocolFee, referralFee } =
        splitFees(poolState.poolFees, feeAmount, feeMode.hasReferral);

      actualProtocolFee = protocolFee;
      actualClaimingFee = claimingFee;
      actualCompoundingFee = compoundingFee;
      actualReferralFee = referralFee;

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
    const { amount, claimingFee, compoundingFee, protocolFee, referralFee } =
      getFeeOnAmount(
        poolState.poolFees,
        outputAmount,
        tradeFeeNumerator,
        feeMode.hasReferral,
      );
    actualProtocolFee = protocolFee;
    actualClaimingFee = claimingFee;
    actualCompoundingFee = compoundingFee;
    actualReferralFee = referralFee;

    actualAmountOut = amount;
  }

  const result: SwapResult2 = {
    includedFeeInputAmount,
    excludedFeeInputAmount: actualAmountIn,
    amountLeft,
    outputAmount: actualAmountOut,
    nextSqrtPrice,
    claimingFee: actualClaimingFee,
    compoundingFee: actualCompoundingFee,
    protocolFee: actualProtocolFee,
    referralFee: actualReferralFee,
  };

  result.nextSqrtPrice = applySwapResult(
    poolState,
    result,
    feeMode,
    tradeDirection,
  );

  return result;
}

/**
 * Gets the swap result from exact output
 * @param poolState - The pool state
 * @param amountOut - The desired output amount
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
  currentPoint: BN,
): SwapResult2 {
  let actualProtocolFee = new BN(0);
  let actualCompoundingFee = new BN(0);
  let actualClaimingFee = new BN(0);
  let actualReferralFee = new BN(0);

  const liquidityHandler = getLiquidityHandler(poolState);

  const maxFeeNumerator = getMaxFeeNumerator(poolState.feeVersion);

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

      poolState.sqrtPrice,
    );

    const { includedFeeAmount, feeAmount } = getIncludedFeeAmount(
      tradeFeeNumerator,
      amountOut,
    );

    const { compoundingFee, claimingFee, protocolFee, referralFee } = splitFees(
      poolState.poolFees,
      feeAmount,
      feeMode.hasReferral,
    );

    actualProtocolFee = protocolFee;
    actualClaimingFee = claimingFee;
    actualCompoundingFee = compoundingFee;
    actualReferralFee = referralFee;

    includedFeeAmountOut = includedFeeAmount;
  }

  let swapAmountFromOutput;
  if (tradeDirection === TradeDirection.AtoB) {
    swapAmountFromOutput =
      liquidityHandler.calculateAtoBFromAmountOut(includedFeeAmountOut);
  } else {
    swapAmountFromOutput =
      liquidityHandler.calculateBtoAFromAmountOut(includedFeeAmountOut);
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
      poolState.sqrtPrice,
    );

    const { includedFeeAmount, feeAmount } = getIncludedFeeAmount(
      tradeFeeNumerator,
      inputAmount,
    );

    const { compoundingFee, claimingFee, protocolFee, referralFee } = splitFees(
      poolState.poolFees,
      feeAmount,
      feeMode.hasReferral,
    );

    actualProtocolFee = protocolFee;
    actualClaimingFee = claimingFee;
    actualCompoundingFee = compoundingFee;
    actualReferralFee = referralFee;

    includedFeeInputAmount = includedFeeAmount;
  } else {
    includedFeeInputAmount = inputAmount;
  }

  const result: SwapResult2 = {
    amountLeft: new BN(0),
    includedFeeInputAmount: includedFeeInputAmount,
    excludedFeeInputAmount: inputAmount,
    outputAmount: amountOut,
    nextSqrtPrice: nextSqrtPrice,
    claimingFee: actualClaimingFee,
    compoundingFee: actualCompoundingFee,
    protocolFee: actualProtocolFee,
    referralFee: actualReferralFee,
  };

  result.nextSqrtPrice = applySwapResult(
    poolState,
    result,
    feeMode,
    tradeDirection,
  );

  return result;
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
  },
): Quote2Result {
  if (amountIn.lte(new BN(0))) {
    throw new AmountIsZeroError("Amount in must be greater than 0");
  }

  if (!isSwapEnabled(pool, currentPoint)) {
    throw new SwapDisabledError();
  }

  const tradeDirection = aToB ? TradeDirection.AtoB : TradeDirection.BtoA;

  const feeMode = getFeeMode(pool.collectFeeMode, tradeDirection, hasReferral);

  let actualAmountIn = amountIn;
  if (inputTokenInfo) {
    actualAmountIn = calculateTransferFeeExcludedAmount(
      amountIn,
      inputTokenInfo.mint,
      inputTokenInfo.currentEpoch,
    ).amount;
  }

  const swapResult = getSwapResultFromExactInput(
    pool,
    actualAmountIn,
    feeMode,
    tradeDirection,
    currentPoint,
  );

  let actualAmountOut = swapResult.outputAmount;
  if (outputTokenInfo) {
    actualAmountOut = calculateTransferFeeExcludedAmount(
      swapResult.outputAmount,
      outputTokenInfo.mint,
      outputTokenInfo.currentEpoch,
    ).amount;
  }

  const minimumAmountOut = getAmountWithSlippage(
    actualAmountOut,
    slippage,
    SwapMode.ExactIn,
  );

  const priceImpact = getPriceImpact(
    actualAmountIn,
    actualAmountOut,
    pool.sqrtPrice,
    aToB,
    tokenADecimal,
    tokenBDecimal,
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
  },
): Quote2Result {
  if (amountOut.lte(new BN(0))) {
    throw new AmountIsZeroError("Amount out must be greater than 0");
  }

  if (!isSwapEnabled(pool, currentPoint)) {
    throw new SwapDisabledError();
  }

  const tradeDirection = aToB ? TradeDirection.AtoB : TradeDirection.BtoA;

  const feeMode = getFeeMode(pool.collectFeeMode, tradeDirection, hasReferral);

  let actualAmountOut = amountOut;
  if (outputTokenInfo) {
    actualAmountOut = calculateTransferFeeIncludedAmount(
      amountOut,
      outputTokenInfo.mint,
      outputTokenInfo.currentEpoch,
    ).amount;
  }

  const swapResult = getSwapResultFromExactOutput(
    pool,
    actualAmountOut,
    feeMode,
    tradeDirection,
    currentPoint,
  );

  let actualAmountIn = swapResult.includedFeeInputAmount;
  if (inputTokenInfo) {
    actualAmountIn = calculateTransferFeeIncludedAmount(
      swapResult.includedFeeInputAmount,
      inputTokenInfo.mint,
      inputTokenInfo.currentEpoch,
    ).amount;
  }

  const maximumAmountIn = getAmountWithSlippage(
    actualAmountIn,
    slippage,
    SwapMode.ExactOut,
  );

  const priceImpact = getPriceImpact(
    actualAmountIn,
    actualAmountOut,
    pool.sqrtPrice,
    aToB,
    tokenADecimal,
    tokenBDecimal,
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
  },
): Quote2Result {
  if (amountIn.lte(new BN(0))) {
    throw new AmountIsZeroError("Amount in must be greater than 0");
  }

  if (!isSwapEnabled(pool, currentPoint)) {
    throw new SwapDisabledError();
  }

  const tradeDirection = aToB ? TradeDirection.AtoB : TradeDirection.BtoA;

  const feeMode = getFeeMode(pool.collectFeeMode, tradeDirection, hasReferral);

  let actualAmountIn = amountIn;
  if (inputTokenInfo) {
    actualAmountIn = calculateTransferFeeExcludedAmount(
      amountIn,
      inputTokenInfo.mint,
      inputTokenInfo.currentEpoch,
    ).amount;
  }

  const swapResult = getSwapResultFromPartialInput(
    pool,
    actualAmountIn,
    feeMode,
    tradeDirection,
    currentPoint,
  );

  let actualAmountOut = swapResult.outputAmount;
  if (outputTokenInfo) {
    actualAmountOut = calculateTransferFeeExcludedAmount(
      swapResult.outputAmount,
      outputTokenInfo.mint,
      outputTokenInfo.currentEpoch,
    ).amount;
  }

  const minimumAmountOut = getAmountWithSlippage(
    actualAmountOut,
    slippage,
    SwapMode.PartialFill,
  );

  const priceImpact = getPriceImpact(
    swapResult.includedFeeInputAmount,
    actualAmountOut,
    pool.sqrtPrice,
    aToB,
    tokenADecimal,
    tokenBDecimal,
  );

  return {
    ...swapResult,
    minimumAmountOut,
    priceImpact,
  };
}
