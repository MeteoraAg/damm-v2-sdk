import { BN } from "@coral-xyz/anchor";
import {
  CollectFeeMode,
  FeeMode,
  FeeSchedulerMode,
  Rounding,
  TradeDirection,
} from "../types";
import {
  BASIS_POINT_MAX,
  FEE_DENOMINATOR,
  MAX_FEE_NUMERATOR,
  SCALE_OFFSET,
} from "../constants";
import { ONE, pow } from "../math/feeMath";
import { mulDiv } from "../math";
import { getDeltaAmountA, getDeltaAmountB, getNextSqrtPrice } from "./curve";

// Fee scheduler
// Linear: cliffFeeNumerator - period * reductionFactor
// Exponential: cliffFeeNumerator * (1 -reductionFactor/BASIS_POINT_MAX)^period
export function getBaseFeeNumerator(
  feeSchedulerMode: FeeSchedulerMode,
  cliffFeeNumerator: BN,
  period: BN,
  reductionFactor: BN
): BN {
  let feeNumerator: BN;
  if (feeSchedulerMode == FeeSchedulerMode.Linear) {
    feeNumerator = cliffFeeNumerator.sub(period.mul(reductionFactor));
  } else {
    const bps = reductionFactor.shln(SCALE_OFFSET).div(new BN(BASIS_POINT_MAX));
    const base = ONE.sub(bps);
    const result = pow(base, period);
    feeNumerator = cliffFeeNumerator.mul(result).shrn(SCALE_OFFSET);
  }

  return feeNumerator;
}

export function getDynamicFeeNumerator(
  volatilityAccumulator: BN,
  binStep: BN,
  variableFeeControl: BN
): BN {
  const squareVfaBin = volatilityAccumulator.mul(binStep).pow(new BN(2));
  const vFee = squareVfaBin.mul(variableFeeControl);
  return vFee.addn(99_999_999_999).divn(100_000_000_000);
}

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
    binStep: BN;
    variableFeeControl: BN;
  }
): BN {
  if (Number(periodFrequency) == 0) {
    return cliffFeeNumerator;
  }
  const period = new BN(currentPoint).lt(activationPoint)
    ? new BN(numberOfPeriod)
    : BN.min(
        new BN(numberOfPeriod),
        new BN(currentPoint).sub(activationPoint).div(periodFrequency)
      );

  let feeNumerator = getBaseFeeNumerator(
    feeSchedulerMode,
    cliffFeeNumerator,
    period,
    reductionFactor
  );

  if (dynamicFeeParams) {
    const { volatilityAccumulator, binStep, variableFeeControl } =
      dynamicFeeParams;
    const dynamicFeeNumberator = getDynamicFeeNumerator(
      volatilityAccumulator,
      binStep,
      variableFeeControl
    );
    feeNumerator.add(dynamicFeeNumberator);
  }
  return feeNumerator.gt(new BN(MAX_FEE_NUMERATOR))
    ? new BN(MAX_FEE_NUMERATOR)
    : feeNumerator;
}

function getFeeMode(collectFeeMode: CollectFeeMode, btoA: boolean): FeeMode {
  const feeOnInput = btoA && collectFeeMode === CollectFeeMode.OnlyB;
  const feesOnTokenA = btoA && collectFeeMode === CollectFeeMode.BothToken;

  return {
    feeOnInput,
    feesOnTokenA,
  };
}

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
): { actualOutAmount: BN; totalFee: BN } {
  let feeMode = getFeeMode(collectFeeMode, !aToB);
  let actualInAmount = inAmount;
  let totalFee = new BN(0);

  if (feeMode.feeOnInput) {
    totalFee = getTotalFeeOnAmount(inAmount, tradeFeeNumerator);
    actualInAmount = inAmount.sub(totalFee);
  }

  // Calculate the output amount based on swap direction
  const outAmount = aToB
    ? getDeltaAmountB(
        getNextSqrtPrice(actualInAmount, sqrtPrice, liquidity, true),
        sqrtPrice,
        liquidity,
        Rounding.Down
      )
    : getDeltaAmountA(
        sqrtPrice,
        getNextSqrtPrice(actualInAmount, sqrtPrice, liquidity, false),
        liquidity,
        Rounding.Down
      );

  // Apply fees to output amount if fee is taken on output
  const actualOutAmount = feeMode.feeOnInput
    ? outAmount
    : ((totalFee = getTotalFeeOnAmount(outAmount, tradeFeeNumerator)),
      outAmount.sub(totalFee));

  return { actualOutAmount, totalFee };
}
