import { BN } from "@coral-xyz/anchor";
import { FeeSchedulerMode, Rounding } from "../types";
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
  let feeNumerator: BN;
  if (feeSchedulerMode == FeeSchedulerMode.Linear) {
    feeNumerator = cliffFeeNumerator.sub(period.mul(reductionFactor));
  } else {
    const bps = reductionFactor.shln(SCALE_OFFSET).div(BASIS_POINT_MAX);
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
  const squareVfaBin = volatilityAccumulator.mul(binStep).pow(2);
  const vFee = squareVfaBin.mul(variableFeeControl);
  return vFee.add(99_999_999_999).div(100_000_000_000);
}

export function calculateFee(amount: BN, tradeFeeNumerator: BN) {
  const lpFee = mulDiv(
    amount,
    tradeFeeNumerator,
    FEE_DENOMINATOR,
    Rounding.Down
  );

  return {
    actualAmount: amount.sub(lpFee),
    lpFee,
  };
}
