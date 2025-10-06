import {
  BaseFee,
  CollectFeeMode,
  DynamicFee,
  FeeMode,
  BaseFeeMode,
  Rounding,
  PoolState,
  SwapResult,
  TradeDirection,
  SwapAmount,
  PoolVersion,
} from "../types";
import {
  BASIS_POINT_MAX,
  BIN_STEP_BPS_DEFAULT,
  BIN_STEP_BPS_U128_DEFAULT,
  DYNAMIC_FEE_DECAY_PERIOD_DEFAULT,
  DYNAMIC_FEE_FILTER_PERIOD_DEFAULT,
  DYNAMIC_FEE_REDUCTION_FACTOR_DEFAULT,
  FEE_DENOMINATOR,
  MAX_FEE_BPS_V0,
  MAX_FEE_BPS_V1,
  MAX_FEE_NUMERATOR_V0,
  MAX_FEE_NUMERATOR_V1,
  MAX_PRICE_CHANGE_BPS_DEFAULT,
  ONE_Q64,
  SCALE_OFFSET,
} from "../constants";
import {
  getAmountAFromLiquidityDelta,
  getAmountBFromLiquidityDelta,
  getNextSqrtPrice,
  getNextSqrtPriceFromOutput,
} from "./curve";
import Decimal from "decimal.js";
import BN from "bn.js";
import { getVariableFeeNumerator, pow } from "../math";

// Fee scheduler
// Linear: cliffFeeNumerator - period * reductionFactor
// Exponential: cliffFeeNumerator * (1 -reductionFactor/BASIS_POINT_MAX)^period
export function getBaseFeeNumerator(
  feeSchedulerMode: BaseFeeMode,
  cliffFeeNumerator: BN,
  period: BN,
  reductionFactor: BN
): BN {
  let feeNumerator: BN;
  if (feeSchedulerMode == BaseFeeMode.FeeSchedulerLinear) {
    feeNumerator = cliffFeeNumerator.sub(period.mul(reductionFactor));
  } else {
    const bps = reductionFactor.shln(SCALE_OFFSET).div(new BN(BASIS_POINT_MAX));
    const base = ONE_Q64.sub(bps);
    const result = pow(base, period);
    feeNumerator = cliffFeeNumerator.mul(result).shrn(SCALE_OFFSET);
  }

  return feeNumerator;
}

/**
 * Calculates the fee numerator based on current market conditions and fee schedule configuration
 *
 * @param currentPoint - The current price point in the liquidity curve
 * @param activationPoint - The price point at which the fee schedule is activated (BN)
 * @param numberOfPeriod - The total number of periods in the fee schedule
 * @param periodFrequency - The frequency at which periods change (BN)
 * @param feeSchedulerMode - The mode determining how fees are calculated (0 = constant, 1 = linear, etc.)
 * @param cliffFeeNumerator - The initial fee numerator at the cliff point (BN)
 * @param reductionFactor - The factor by which fees are reduced in each period (BN)
 * @param dynamicFeeParams - Optional parameters for dynamic fee calculation
 * @param dynamicFeeParams.volatilityAccumulator - Measure of accumulated market volatility (BN)
 * @param dynamicFeeParams.binStep - Size of price bins in the liquidity distribution (BN)
 * @param dynamicFeeParams.variableFeeControl - Parameter controlling the impact of volatility (BN)
 * @returns The calculated fee numerator (BN), capped at MAX_FEE_NUMERATOR
 */
export function getFeeNumerator(
  currentPoint: number,
  activationPoint: BN,
  numberOfPeriod: number,
  periodFrequency: BN,
  feeSchedulerMode: number,
  cliffFeeNumerator: BN,
  reductionFactor: BN,
  dynamicFeeParams?: {
    volatilityAccumulator: BN;
    binStep: number;
    variableFeeControl: number;
  }
): BN {
  let feeNumerator: BN;
  if (
    Number(periodFrequency) == 0 ||
    new BN(currentPoint).lt(activationPoint)
  ) {
    feeNumerator = cliffFeeNumerator;
  } else {
    const period = BN.min(
      new BN(numberOfPeriod),
      new BN(currentPoint).sub(activationPoint).div(periodFrequency)
    );

    feeNumerator = getBaseFeeNumerator(
      feeSchedulerMode,
      cliffFeeNumerator,
      period,
      reductionFactor
    );
  }

  if (dynamicFeeParams) {
    const { volatilityAccumulator, binStep, variableFeeControl } =
      dynamicFeeParams;
    const dynamicFeeNumberator = getVariableFeeNumerator(
      volatilityAccumulator,
      new BN(binStep),
      new BN(variableFeeControl)
    );
    feeNumerator = feeNumerator.add(dynamicFeeNumberator);
  }
  return feeNumerator.gt(getMaxFeeNumerator(poolVersion))
    ? new BN(MAX_FEE_NUMERATOR)
    : feeNumerator;
}

/**
 * Determines the fee mode based on the swap direction and fee collection configuration
 *
 * @param collectFeeMode - The fee collection mode (e.g., OnlyB, BothToken)
 * @param btoA - Boolean indicating if the swap is from token B to token A
 * @returns { feeOnInput, feesOnTokenA }
 */
export function getFeeMode(
  collectFeeMode: CollectFeeMode,
  btoA: boolean
): FeeMode {
  const feeOnInput = btoA && collectFeeMode === CollectFeeMode.OnlyB;
  const feesOnTokenA = btoA && collectFeeMode === CollectFeeMode.BothToken;

  return {
    feeOnInput,
    feesOnTokenA,
  };
}

/**
 * Calculates the total fee amount based on the transaction amount and fee numerator
 *
 * @param amount - The transaction amount (BN)
 * @param tradeFeeNumerator - The fee numerator to apply (BN)
 * @returns The calculated fee amount (BN), rounded up
 */
function getTotalFeeOnAmount(amount: BN, tradeFeeNumerator: BN) {
  return mulDiv(
    amount,
    tradeFeeNumerator,
    new BN(FEE_DENOMINATOR),
    Rounding.Up
  );
}

/**
 *
 * Calculates the output amount and fees for a swap operation in a concentrated liquidity pool.
 *
 * @param inAmount - The input amount of tokens the user is swapping
 * @param sqrtPrice - The current square root price of the pool
 * @param liquidity - The current liquidity available in the pool
 * @param tradeFeeNumerator - The fee numerator used to calculate trading fees
 * @param aToB - Direction of the swap: true for token A to token B, false for token B to token A
 * @param collectFeeMode - Determines how fees are collected (0: both tokens, 1: only token B)
 * @returns Object containing the actual output amount after fees and the total fee amount
 */
export function getSwapAmount(
  inAmount: BN,
  sqrtPrice: BN,
  liquidity: BN,
  tradeFeeNumerator: BN,
  aToB: boolean,
  collectFeeMode: number
): { amountOut: BN; totalFee: BN; nextSqrtPrice: BN } {
  let feeMode = getFeeMode(collectFeeMode, !aToB);
  let actualInAmount = inAmount;
  let totalFee = new BN(0);

  if (feeMode.feeOnInput) {
    totalFee = getTotalFeeOnAmount(inAmount, tradeFeeNumerator);
    actualInAmount = inAmount.sub(totalFee);
  }

  const nextSqrtPrice = getNextSqrtPrice(
    actualInAmount,
    sqrtPrice,
    liquidity,
    aToB
  );
  // Calculate the output amount based on swap direction
  const outAmount = aToB
    ? getAmountBFromLiquidityDelta(
        liquidity,
        sqrtPrice,
        nextSqrtPrice,
        Rounding.Down
      )
    : getAmountAFromLiquidityDelta(
        liquidity,
        sqrtPrice,
        nextSqrtPrice,
        Rounding.Down
      );

  // Apply fees to output amount if fee is taken on output
  const amountOut = feeMode.feeOnInput
    ? outAmount
    : ((totalFee = getTotalFeeOnAmount(outAmount, tradeFeeNumerator)),
      outAmount.sub(totalFee));

  return { amountOut, totalFee, nextSqrtPrice };
}

/**
 * Converts basis points (bps) to a fee numerator
 * 1 bps = 0.01% = 0.0001 in decimal
 *
 * @param bps - The value in basis points [1-10_000]
 * @returns The equivalent fee numerator
 */
export function bpsToFeeNumerator(bps: number): BN {
  return new BN(bps * FEE_DENOMINATOR).divn(BASIS_POINT_MAX);
}

/**
 * Converts a fee numerator back to basis points (bps)
 *
 * @param feeNumerator - The fee numerator to convert
 * @returns The equivalent value in basis points [1-10_000]
 */
export function feeNumeratorToBps(feeNumerator: BN): number {
  return feeNumerator
    .muln(BASIS_POINT_MAX)
    .div(new BN(FEE_DENOMINATOR))
    .toNumber();
}

/**
 * Calculates base fee parameters for a fee scheduler system.
 * @param {number} maxBaseFeeBps - Maximum fee in basis points
 * @param {number} minBaseFeeBps - Minimum fee in basis points
 * @param {FeeSchedulerMode} feeSchedulerMode - Mode for fee reduction (Linear or Exponential)
 * @param {number} numberOfPeriod - Number of periods over which to schedule fee reduction
 * @param {BN} periodFrequency - Time interval between fee reductions
 *
 * @returns {BaseFee}
 */
export function getBaseFeeParams(
  maxBaseFeeBps: number,
  minBaseFeeBps: number,
  feeSchedulerMode: FeeSchedulerMode,
  numberOfPeriod: number,
  totalDuration: number
): BaseFee {
  if (maxBaseFeeBps == minBaseFeeBps) {
    if (numberOfPeriod != 0 || totalDuration != 0) {
      throw new Error("numberOfPeriod and totalDuration must both be zero");
    }

    return {
      cliffFeeNumerator: bpsToFeeNumerator(maxBaseFeeBps),
      numberOfPeriod: 0,
      periodFrequency: new BN(0),
      reductionFactor: new BN(0),
      feeSchedulerMode: 0,
    };
  }

  if (numberOfPeriod <= 0) {
    throw new Error("Total periods must be greater than zero");
  }

  if (maxBaseFeeBps > feeNumeratorToBps(new BN(MAX_FEE_NUMERATOR))) {
    throw new Error(
      `maxBaseFeeBps (${maxBaseFeeBps} bps) exceeds maximum allowed value of ${feeNumeratorToBps(
        new BN(MAX_FEE_NUMERATOR)
      )} bps`
    );
  }

  if (minBaseFeeBps > maxBaseFeeBps) {
    throw new Error(
      "minBaseFee bps must be less than or equal to maxBaseFee bps"
    );
  }

  if (numberOfPeriod == 0 || totalDuration == 0) {
    throw new Error(
      "numberOfPeriod and totalDuration must both greater than zero"
    );
  }

  const maxBaseFeeNumerator = bpsToFeeNumerator(maxBaseFeeBps);

  const minBaseFeeNumerator = bpsToFeeNumerator(minBaseFeeBps);

  const periodFrequency = new BN(totalDuration / numberOfPeriod);

  let reductionFactor: BN;
  if (feeSchedulerMode == FeeSchedulerMode.Linear) {
    const totalReduction = maxBaseFeeNumerator.sub(minBaseFeeNumerator);
    reductionFactor = totalReduction.divn(numberOfPeriod);
  } else {
    const ratio =
      minBaseFeeNumerator.toNumber() / maxBaseFeeNumerator.toNumber();
    const decayBase = Math.pow(ratio, 1 / numberOfPeriod);
    reductionFactor = new BN(BASIS_POINT_MAX * (1 - decayBase));
  }

  return {
    cliffFeeNumerator: maxBaseFeeNumerator,
    numberOfPeriod,
    periodFrequency,
    reductionFactor,
    feeSchedulerMode,
  };
}

/**
 * Calculate dynamic fee parameters
 * @param {number} baseFeeBps - Base fee in basis points
 * @param {number} [maxPriceChangeBps=1500] - Maximum price change to consider for fee calculation (in basis points)
 *
 * @returns {DynamicFee}
 */
export function getDynamicFeeParams(
  baseFeeBps: number,
  maxPriceChangeBps: number = MAX_PRICE_CHANGE_BPS_DEFAULT // default 15%
): DynamicFee {
  if (maxPriceChangeBps > MAX_PRICE_CHANGE_BPS_DEFAULT) {
    throw new Error(
      `maxPriceChangeBps (${maxPriceChangeBps} bps) must be less than or equal to ${MAX_PRICE_CHANGE_BPS_DEFAULT}`
    );
  }

  const priceRatio = maxPriceChangeBps / BASIS_POINT_MAX + 1;
  // Q64
  const sqrtPriceRatioQ64 = new BN(
    Decimal.sqrt(priceRatio.toString())
      .mul(Decimal.pow(2, 64))
      .floor()
      .toFixed()
  );
  const deltaBinId = sqrtPriceRatioQ64
    .sub(ONE)
    .div(BIN_STEP_BPS_U128_DEFAULT)
    .muln(2);

  const maxVolatilityAccumulator = new BN(deltaBinId.muln(BASIS_POINT_MAX));

  const squareVfaBin = maxVolatilityAccumulator
    .mul(new BN(BIN_STEP_BPS_DEFAULT))
    .pow(new BN(2));

  const baseFeeNumerator = new BN(bpsToFeeNumerator(baseFeeBps));
  const maxDynamicFeeNumerator = baseFeeNumerator.muln(20).divn(100); // default max dynamic fee = 20% of base fee.
  const vFee = maxDynamicFeeNumerator
    .mul(new BN(100_000_000_000))
    .sub(new BN(99_999_999_999));

  const variableFeeControl = vFee.div(squareVfaBin);

  return {
    binStep: BIN_STEP_BPS_DEFAULT,
    binStepU128: BIN_STEP_BPS_U128_DEFAULT,
    filterPeriod: DYNAMIC_FEE_FILTER_PERIOD_DEFAULT,
    decayPeriod: DYNAMIC_FEE_DECAY_PERIOD_DEFAULT,
    reductionFactor: DYNAMIC_FEE_REDUCTION_FACTOR_DEFAULT,
    maxVolatilityAccumulator: maxVolatilityAccumulator.toNumber(),
    variableFeeControl: variableFeeControl.toNumber(),
  };
}

/**
 * Calculates the input amount required from A to B for a given output amount
 * @param pool - The pool state
 * @param outAmount - The desired output amount (quote amount)
 * @returns The swap amount details
 */
function getInAmountFromAToB(pool: PoolState, outAmount: BN): SwapAmount {
  const nextSqrtPrice = getNextSqrtPriceFromOutput(
    pool.sqrtPrice,
    pool.liquidity,
    outAmount,
    true
  );

  if (nextSqrtPrice.lt(pool.sqrtMinPrice)) {
    throw new Error("Price range is violated");
  }

  const outputAmount = getAmountAFromLiquidityDelta(
    pool.liquidity,
    nextSqrtPrice,
    pool.sqrtPrice,
    Rounding.Up
  );

  return {
    outputAmount,
    nextSqrtPrice,
  };
}

/**
 * Calculates the input amount required from B to A for a given output amount
 * @param pool - The pool state
 * @param outAmount - The desired output amount (base amount)
 * @returns The swap amount details
 */
function getInAmountFromBToA(pool: PoolState, outAmount: BN): SwapAmount {
  // Finding new target price
  const nextSqrtPrice = getNextSqrtPriceFromOutput(
    pool.sqrtPrice,
    pool.liquidity,
    outAmount,
    false
  );

  if (nextSqrtPrice.gt(pool.sqrtMaxPrice)) {
    throw new Error("Price range is violated");
  }

  // Finding output amount
  const outputAmount = getAmountBFromLiquidityDelta(
    pool.liquidity,
    pool.sqrtPrice,
    nextSqrtPrice,
    Rounding.Up
  );

  return {
    outputAmount,
    nextSqrtPrice,
  };
}

/**
 * Calculates the swap result from a given output amount
 * @param pool - The pool state
 * @param outAmount - The desired output amount
 * @param feeMode - The fee mode configuration
 * @param tradeDirection - The direction of the trade
 * @param currentPoint - The current time/slot point
 * @returns Tuple of [SwapResult, input_amount]
 */
export function getSwapResultFromOutAmount(
  pool: PoolState,
  outAmount: BN,
  feeMode: FeeMode & { hasReferral?: boolean },
  tradeDirection: TradeDirection,
  currentPoint: number
): { swapResult: SwapResult; inputAmount: BN } {
  let actualProtocolFee = new BN(0);
  let actualLpFee = new BN(0);
  let actualPartnerFee = new BN(0);
  let actualReferralFee = new BN(0);

  const tradeFeeNumerator = getFeeNumerator(
    currentPoint,
    pool.activationPoint,
    pool.poolFees.baseFee.numberOfPeriod,
    pool.poolFees.baseFee.periodFrequency,
    pool.poolFees.baseFee.feeSchedulerMode,
    pool.poolFees.baseFee.cliffFeeNumerator,
    pool.poolFees.baseFee.reductionFactor,
    pool.poolFees.dynamicFee.initialized === 1
      ? {
          volatilityAccumulator: pool.poolFees.dynamicFee.volatilityAccumulator,
          binStep: pool.poolFees.dynamicFee.binStep,
          variableFeeControl: pool.poolFees.dynamicFee.variableFeeControl,
        }
      : undefined
  );

  let includedFeeOutAmount: BN;
  if (feeMode.feeOnInput) {
    includedFeeOutAmount = outAmount;
  } else {
    includedFeeOutAmount = getIncludedFeeAmount(tradeFeeNumerator, outAmount);
    const totalFee = getTotalFeeOnAmount(outAmount, tradeFeeNumerator);

    actualProtocolFee = mulDiv(
      totalFee,
      new BN(pool.poolFees.protocolFeePercent),
      new BN(100),
      Rounding.Down
    );

    if (feeMode.hasReferral) {
      actualReferralFee = mulDiv(
        actualProtocolFee,
        new BN(pool.poolFees.referralFeePercent),
        new BN(100),
        Rounding.Down
      );
    }

    const protocolFeeAfterReferral = actualProtocolFee.sub(actualReferralFee);
    actualPartnerFee = mulDiv(
      protocolFeeAfterReferral,
      new BN(pool.poolFees.partnerFeePercent),
      new BN(100),
      Rounding.Down
    );

    actualLpFee = totalFee.sub(actualProtocolFee).sub(actualPartnerFee);
  }

  const { outputAmount: excludedFeeInAmount, nextSqrtPrice } =
    tradeDirection === TradeDirection.AtoB
      ? getInAmountFromAToB(pool, includedFeeOutAmount)
      : getInAmountFromBToA(pool, includedFeeOutAmount);

  let includedFeeInAmount: BN;
  if (feeMode.feeOnInput) {
    includedFeeInAmount = getIncludedFeeAmount(
      tradeFeeNumerator,
      excludedFeeInAmount
    );
    const totalFee = getTotalFeeOnAmount(
      includedFeeInAmount,
      tradeFeeNumerator
    );

    actualProtocolFee = mulDiv(
      totalFee,
      new BN(pool.poolFees.protocolFeePercent),
      new BN(100),
      Rounding.Down
    );

    if (feeMode.hasReferral) {
      actualReferralFee = mulDiv(
        actualProtocolFee,
        new BN(pool.poolFees.referralFeePercent),
        new BN(100),
        Rounding.Down
      );
    }

    const protocolFeeAfterReferral = actualProtocolFee.sub(actualReferralFee);
    actualPartnerFee = mulDiv(
      protocolFeeAfterReferral,
      new BN(pool.poolFees.partnerFeePercent),
      new BN(100),
      Rounding.Down
    );

    actualLpFee = totalFee.sub(actualProtocolFee).sub(actualPartnerFee);
  } else {
    includedFeeInAmount = excludedFeeInAmount;
  }

  return {
    swapResult: {
      outputAmount: outAmount,
      nextSqrtPrice,
      lpFee: actualLpFee,
      protocolFee: actualProtocolFee,
      referralFee: actualReferralFee,
      partnerFee: actualPartnerFee,
    },
    inputAmount: includedFeeInAmount,
  };
}

export function getMaxFeeNumerator(poolVersion: PoolVersion): BN {
  switch (poolVersion) {
    case PoolVersion.V0:
      return new BN(MAX_FEE_NUMERATOR_V0);
    case PoolVersion.V1:
      return new BN(MAX_FEE_NUMERATOR_V1);
    default:
      throw new Error("Invalid pool version");
  }
}

export function getMaxFeeBps(poolVersion: PoolVersion): number {
  switch (poolVersion) {
    case PoolVersion.V0:
      return MAX_FEE_BPS_V0;
    case PoolVersion.V1:
      return MAX_FEE_BPS_V1;
    default:
      throw new Error("Invalid pool version");
  }
}
