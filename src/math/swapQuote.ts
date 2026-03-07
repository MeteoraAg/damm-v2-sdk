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
import {
  getLiquidityHandler,
  getNextSqrtPriceForCompoundingLiquidity,
} from "./liquidity";

// ─── applySwapResult ──────────────────────────────────────────────────────────

/**
 * Computes the post-swap sqrt price.
 * For Compounding pools, reserves change after each swap (including compoundingFee
 * being reinvested), so the next sqrt price must be derived from the updated reserves.
 * For concentrated liquidity pools, nextSqrtPrice is already computed by the curve.
 */
export function applySwapResult(
  poolState: PoolState,
  result: SwapResult2,
  feeMode: FeeMode,
  tradeDirection: TradeDirection,
): BN {
  if ((poolState.collectFeeMode as CollectFeeMode) !== CollectFeeMode.Compounding) {
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
    newTokenAAmount = new BN(poolState.tokenAAmount.toString()).add(result.excludedFeeInputAmount);
    newTokenBAmount = new BN(poolState.tokenBAmount.toString()).sub(includedFeeOutputAmount);
  } else {
    newTokenBAmount = new BN(poolState.tokenBAmount.toString()).add(result.excludedFeeInputAmount);
    newTokenAAmount = new BN(poolState.tokenAAmount.toString()).sub(includedFeeOutputAmount);
  }

  // compoundingFee is reinvested back into tokenB reserves
  newTokenBAmount = newTokenBAmount.add(result.compoundingFee);

  return getNextSqrtPriceForCompoundingLiquidity(newTokenAAmount, newTokenBAmount);
}

// ─── Core swap result functions ───────────────────────────────────────────────

/**
 * Gets the swap result from exact input.
 */
export function getSwapResultFromExactInput(
  poolState: PoolState,
  amountIn: BN,
  feeMode: FeeMode,
  tradeDirection: TradeDirection,
  currentPoint: BN,
): SwapResult2 {
  const collectFeeMode = poolState.collectFeeMode as CollectFeeMode;
  const maxFeeNumerator = getMaxFeeNumerator(poolState.feeVersion);
  const liquidityHandler = getLiquidityHandler(poolState);

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
  let actualProtocolFee = new BN(0);
  let actualClaimingFee = new BN(0);
  let actualCompoundingFee = new BN(0);
  let actualReferralFee = new BN(0);

  if (feeMode.feesOnInput) {
    const { amount, claimingFee, compoundingFee, protocolFee, referralFee } = getFeeOnAmount(
      poolState.poolFees,
      amountIn,
      tradeFeeNumerator,
      feeMode.hasReferral,
      collectFeeMode,
    );
    actualClaimingFee = claimingFee;
    actualCompoundingFee = compoundingFee;
    actualProtocolFee = protocolFee;
    actualReferralFee = referralFee;
    actualAmountIn = amount;
  } else {
    actualAmountIn = amountIn;
  }

  const swapAmountFromInput = tradeDirection === TradeDirection.AtoB
    ? liquidityHandler.calculateAtoBFromAmountIn(actualAmountIn)
    : liquidityHandler.calculateBtoAFromAmountIn(actualAmountIn);

  const { outputAmount, nextSqrtPrice, amountLeft } = swapAmountFromInput;

  let actualAmountOut: BN;
  if (feeMode.feesOnInput) {
    actualAmountOut = outputAmount;
  } else {
    const { amount, claimingFee, compoundingFee, protocolFee, referralFee } = getFeeOnAmount(
      poolState.poolFees,
      outputAmount,
      tradeFeeNumerator,
      feeMode.hasReferral,
      collectFeeMode,
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

  result.nextSqrtPrice = applySwapResult(poolState, result, feeMode, tradeDirection);
  return result;
}

/**
 * Gets the swap result from partial input (may not consume full amountIn if price range is hit).
 */
export function getSwapResultFromPartialInput(
  poolState: PoolState,
  amountIn: BN,
  feeMode: FeeMode,
  tradeDirection: TradeDirection,
  currentPoint: BN,
): SwapResult2 {
  const collectFeeMode = poolState.collectFeeMode as CollectFeeMode;
  const maxFeeNumerator = getMaxFeeNumerator(poolState.feeVersion);
  const liquidityHandler = getLiquidityHandler(poolState);

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
  let actualProtocolFee = new BN(0);
  let actualClaimingFee = new BN(0);
  let actualCompoundingFee = new BN(0);
  let actualReferralFee = new BN(0);

  if (feeMode.feesOnInput) {
    const { amount, claimingFee, compoundingFee, protocolFee, referralFee } = getFeeOnAmount(
      poolState.poolFees,
      amountIn,
      tradeFeeNumerator,
      feeMode.hasReferral,
      collectFeeMode,
    );
    actualClaimingFee = claimingFee;
    actualCompoundingFee = compoundingFee;
    actualProtocolFee = protocolFee;
    actualReferralFee = referralFee;
    actualAmountIn = amount;
  } else {
    actualAmountIn = amountIn;
  }

  const swapAmountFromInput = tradeDirection === TradeDirection.AtoB
    ? liquidityHandler.calculateAtoBFromPartialAmountIn(actualAmountIn)
    : liquidityHandler.calculateBtoAFromPartialAmountIn(actualAmountIn);

  let { amountLeft, outputAmount, nextSqrtPrice } = swapAmountFromInput;

  let includedFeeInputAmount: BN;
  if (amountLeft.gt(new BN(0))) {
    actualAmountIn = actualAmountIn.sub(amountLeft);

    if (feeMode.feesOnInput) {
      // recalculate fees on reduced amount
      const { amount, claimingFee, compoundingFee, protocolFee, referralFee } = getFeeOnAmount(
        poolState.poolFees,
        actualAmountIn,
        tradeFeeNumerator,
        feeMode.hasReferral,
        collectFeeMode,
      );
      actualClaimingFee = claimingFee;
      actualCompoundingFee = compoundingFee;
      actualProtocolFee = protocolFee;
      actualReferralFee = referralFee;
      includedFeeInputAmount = amount.add(amountLeft);
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
    const { amount, claimingFee, compoundingFee, protocolFee, referralFee } = getFeeOnAmount(
      poolState.poolFees,
      outputAmount,
      tradeFeeNumerator,
      feeMode.hasReferral,
      collectFeeMode,
    );
    actualClaimingFee = claimingFee;
    actualCompoundingFee = compoundingFee;
    actualProtocolFee = protocolFee;
    actualReferralFee = referralFee;
    actualAmountOut = amount;
  }

  const result: SwapResult2 = {
    amountLeft,
    includedFeeInputAmount,
    excludedFeeInputAmount: actualAmountIn,
    outputAmount: actualAmountOut,
    nextSqrtPrice,
    claimingFee: actualClaimingFee,
    compoundingFee: actualCompoundingFee,
    protocolFee: actualProtocolFee,
    referralFee: actualReferralFee,
  };

  result.nextSqrtPrice = applySwapResult(poolState, result, feeMode, tradeDirection);
  return result;
}

/**
 * Gets the swap result from exact output.
 */
export function getSwapResultFromExactOutput(
  poolState: PoolState,
  amountOut: BN,
  feeMode: FeeMode,
  tradeDirection: TradeDirection,
  currentPoint: BN,
): SwapResult2 {
  const collectFeeMode = poolState.collectFeeMode as CollectFeeMode;
  const maxFeeNumerator = getMaxFeeNumerator(poolState.feeVersion);
  const liquidityHandler = getLiquidityHandler(poolState);

  let actualProtocolFee = new BN(0);
  let actualClaimingFee = new BN(0);
  let actualCompoundingFee = new BN(0);
  let actualReferralFee = new BN(0);

  let actualAmountOut: BN;
  if (feeMode.feesOnInput) {
    actualAmountOut = amountOut;
  } else {
    // fees on output: gross up amountOut to find pre-fee amount
    const { amount } = getFeeOnAmount(
      poolState.poolFees,
      amountOut,
      new BN(0), // placeholder — recalculated below
      feeMode.hasReferral,
      collectFeeMode,
    );
    actualAmountOut = amountOut;
  }

  const swapAmountFromOutput = tradeDirection === TradeDirection.AtoB
    ? liquidityHandler.calculateAtoBFromAmountOut(amountOut)
    : liquidityHandler.calculateBtoAFromAmountOut(amountOut);

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

    const { includedFeeAmount, feeAmount } = getIncludedFeeAmount(tradeFeeNumerator, inputAmount);

    const split = splitFees(poolState.poolFees, feeAmount, feeMode.hasReferral, collectFeeMode);
    actualClaimingFee = split.claimingFee;
    actualCompoundingFee = split.compoundingFee;
    actualProtocolFee = split.protocolFee;
    actualReferralFee = split.referralFee;

    includedFeeInputAmount = includedFeeAmount;
  } else {
    const tradeFeeNumerator = getTotalTradingFeeFromIncludedFeeAmount(
      poolState.poolFees,
      currentPoint,
      poolState.activationPoint,
      amountOut,
      tradeDirection,
      maxFeeNumerator,
      poolState.poolFees.initSqrtPrice,
      poolState.sqrtPrice,
    );

    const { amount, claimingFee, compoundingFee, protocolFee, referralFee } = getFeeOnAmount(
      poolState.poolFees,
      amountOut,
      tradeFeeNumerator,
      feeMode.hasReferral,
      collectFeeMode,
    );
    actualClaimingFee = claimingFee;
    actualCompoundingFee = compoundingFee;
    actualProtocolFee = protocolFee;
    actualReferralFee = referralFee;
    actualAmountOut = amount;

    includedFeeInputAmount = inputAmount;
  }

  const result: SwapResult2 = {
    amountLeft: new BN(0),
    includedFeeInputAmount,
    excludedFeeInputAmount: inputAmount,
    outputAmount: actualAmountOut,
    nextSqrtPrice,
    claimingFee: actualClaimingFee,
    compoundingFee: actualCompoundingFee,
    protocolFee: actualProtocolFee,
    referralFee: actualReferralFee,
  };

  result.nextSqrtPrice = applySwapResult(poolState, result, feeMode, tradeDirection);
  return result;
}

// ─── Public quote API ─────────────────────────────────────────────────────────

export function swapQuoteExactInput(
  pool: PoolState,
  currentPoint: BN,
  amountIn: BN,
  slippage: number,
  aToB: boolean,
  hasReferral: boolean,
  tokenADecimal: number,
  tokenBDecimal: number,
  inputTokenInfo?: { mint: Mint; currentEpoch: number },
  outputTokenInfo?: { mint: Mint; currentEpoch: number },
): Quote2Result {
  if (amountIn.lte(new BN(0))) throw new Error("Amount in must be greater than 0");
  if (!isSwapEnabled(pool, currentPoint)) throw new Error("Swap is disabled");

  const tradeDirection = aToB ? TradeDirection.AtoB : TradeDirection.BtoA;
  const feeMode = getFeeMode(pool.collectFeeMode, tradeDirection, hasReferral);

  let actualAmountIn = amountIn;
  if (inputTokenInfo) {
    actualAmountIn = calculateTransferFeeExcludedAmount(amountIn, inputTokenInfo.mint, inputTokenInfo.currentEpoch).amount;
  }

  const swapResult = getSwapResultFromExactInput(pool, actualAmountIn, feeMode, tradeDirection, currentPoint);

  let actualAmountOut = swapResult.outputAmount;
  if (outputTokenInfo) {
    actualAmountOut = calculateTransferFeeExcludedAmount(swapResult.outputAmount, outputTokenInfo.mint, outputTokenInfo.currentEpoch).amount;
  }

  const minimumAmountOut = getAmountWithSlippage(actualAmountOut, slippage, SwapMode.ExactIn);
  const priceImpact = getPriceImpact(actualAmountIn, actualAmountOut, pool.sqrtPrice, aToB, tokenADecimal, tokenBDecimal);

  return { ...swapResult, minimumAmountOut, priceImpact };
}

export function swapQuoteExactOutput(
  pool: PoolState,
  currentPoint: BN,
  amountOut: BN,
  slippage: number,
  aToB: boolean,
  hasReferral: boolean,
  tokenADecimal: number,
  tokenBDecimal: number,
  inputTokenInfo?: { mint: Mint; currentEpoch: number },
  outputTokenInfo?: { mint: Mint; currentEpoch: number },
): Quote2Result {
  if (amountOut.lte(new BN(0))) throw new Error("Amount out must be greater than 0");
  if (!isSwapEnabled(pool, currentPoint)) throw new Error("Swap is disabled");

  const tradeDirection = aToB ? TradeDirection.AtoB : TradeDirection.BtoA;
  const feeMode = getFeeMode(pool.collectFeeMode, tradeDirection, hasReferral);

  let actualAmountOut = amountOut;
  if (outputTokenInfo) {
    actualAmountOut = calculateTransferFeeIncludedAmount(amountOut, outputTokenInfo.mint, outputTokenInfo.currentEpoch).amount;
  }

  const swapResult = getSwapResultFromExactOutput(pool, actualAmountOut, feeMode, tradeDirection, currentPoint);

  let actualAmountIn = swapResult.includedFeeInputAmount;
  if (inputTokenInfo) {
    actualAmountIn = calculateTransferFeeIncludedAmount(swapResult.includedFeeInputAmount, inputTokenInfo.mint, inputTokenInfo.currentEpoch).amount;
  }

  const maximumAmountIn = getAmountWithSlippage(actualAmountIn, slippage, SwapMode.ExactOut);
  const priceImpact = getPriceImpact(actualAmountIn, actualAmountOut, pool.sqrtPrice, aToB, tokenADecimal, tokenBDecimal);

  return { ...swapResult, maximumAmountIn, priceImpact };
}

export function swapQuotePartialInput(
  pool: PoolState,
  currentPoint: BN,
  amountIn: BN,
  slippage: number,
  aToB: boolean,
  hasReferral: boolean,
  tokenADecimal: number,
  tokenBDecimal: number,
  inputTokenInfo?: { mint: Mint; currentEpoch: number },
  outputTokenInfo?: { mint: Mint; currentEpoch: number },
): Quote2Result {
  if (amountIn.lte(new BN(0))) throw new Error("Amount in must be greater than 0");
  if (!isSwapEnabled(pool, currentPoint)) throw new Error("Swap is disabled");

  const tradeDirection = aToB ? TradeDirection.AtoB : TradeDirection.BtoA;
  const feeMode = getFeeMode(pool.collectFeeMode, tradeDirection, hasReferral);

  let actualAmountIn = amountIn;
  if (inputTokenInfo) {
    actualAmountIn = calculateTransferFeeExcludedAmount(amountIn, inputTokenInfo.mint, inputTokenInfo.currentEpoch).amount;
  }

  const swapResult = getSwapResultFromPartialInput(pool, actualAmountIn, feeMode, tradeDirection, currentPoint);

  let actualAmountOut = swapResult.outputAmount;
  if (outputTokenInfo) {
    actualAmountOut = calculateTransferFeeExcludedAmount(swapResult.outputAmount, outputTokenInfo.mint, outputTokenInfo.currentEpoch).amount;
  }

  const minimumAmountOut = getAmountWithSlippage(actualAmountOut, slippage, SwapMode.PartialFill);
  const priceImpact = getPriceImpact(actualAmountIn, actualAmountOut, pool.sqrtPrice, aToB, tokenADecimal, tokenBDecimal);

  return { ...swapResult, minimumAmountOut, priceImpact };
}
