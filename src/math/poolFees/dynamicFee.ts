import {
  DYNAMIC_FEE_ROUNDING_OFFSET,
  DYNAMIC_FEE_SCALING_FACTOR,
} from "../../constants";
import { DynamicFeeStruct } from "../../types";
import BN from "bn.js";

/**
 * Check if dynamic fee is enabled
 * @param dynamicFee Dynamic fee parameters
 * @returns True if dynamic fee is enabled
 */
export function isDynamicFeeEnabled(dynamicFee: DynamicFeeStruct): boolean {
  return dynamicFee.initialized !== 0;
}

/**
 * Calculates the dynamic fee numerator based on market volatility metrics
 *
 * @param volatilityAccumulator - A measure of accumulated market volatility (BN)
 * @param binStep - The size of price bins in the liquidity distribution (BN)
 * @param variableFeeControl - Parameter controlling the impact of volatility on fees (BN)
 * @returns The calculated dynamic fee numerator (BN)
 */
export function getVariableFeeNumerator(
  volatilityAccumulator: BN,
  binStep: BN,
  variableFeeControl: BN
): BN {
  if (variableFeeControl.isZero()) {
    return new BN(0);
  }
  const squareVfaBin = volatilityAccumulator
    .mul(new BN(binStep))
    .pow(new BN(2));
  const vFee = variableFeeControl.mul(squareVfaBin);

  return vFee
    .add(new BN(DYNAMIC_FEE_ROUNDING_OFFSET))
    .div(new BN(DYNAMIC_FEE_SCALING_FACTOR));
}
