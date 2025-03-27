import { BN } from "@coral-xyz/anchor";
import { CollectFeeMode, FeeSchedulerMode, Rounding } from "../types";
import {
  BASIS_POINT_MAX,
  FEE_DENOMINATOR,
  MAX_FEE_NUMERATOR,
  SCALE_OFFSET,
} from "../constants";
import { ONE, pow } from "../math/feeMath";
import { mulDiv } from "../math";

// Fee scheduler
// Linear: cliffFeeNumerator - period * reductionFactor
// Exponential: cliffFeeNumerator * (1 -reductionFactor/BASIS_POINT_MAX)^period
export function getBaseFeeNumerator(
  feeSchedulerMode: FeeSchedulerMode,
  cliffFeeNumerator: BN,
  period: BN,
  reductionFactor: BN
): BN {
  console.log({
    feeSchedulerMode: feeSchedulerMode.toString(),
    cliffFeeNumerator: cliffFeeNumerator.toString(),
    period: period.toString(),
    reductionFactor: reductionFactor.toString(),
  });
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
