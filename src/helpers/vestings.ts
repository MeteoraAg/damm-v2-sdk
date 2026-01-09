import { BN } from "@coral-xyz/anchor";
import { PositionState, VestingState } from "../types";
import { min } from "bn.js";

/**
 * Checks if a vesting schedule is ready for full release
 * @param vestingData The vesting account data
 * @param currentPoint Current timestamp or slot
 * @returns True if the vesting is complete and all liquidity can be released
 */
export function isVestingComplete(
  vestingData: VestingState,
  currentPoint: BN,
): boolean {
  const cliffPoint = vestingData.cliffPoint;
  const periodFrequency = vestingData.periodFrequency;
  const numberOfPeriods = vestingData.numberOfPeriod;

  const endPoint = cliffPoint.add(periodFrequency.muln(numberOfPeriods));

  return currentPoint.gte(endPoint);
}

/**
 * Gets the total amount of liquidity in the vesting schedule
 * @param vestingData The vesting account data
 * @returns The total locked liquidity amount
 */
export function getTotalLockedLiquidity(vestingData: VestingState): BN {
  return vestingData.cliffUnlockLiquidity.add(
    vestingData.liquidityPerPeriod.mul(new BN(vestingData.numberOfPeriod)),
  );
}

/**
 * Calculates the available liquidity to withdraw based on vesting schedule
 * @param vestingData The vesting account data
 * @param positionData The position account data
 * @param currentPoint Current timestamp or slot
 * @returns The amount of liquidity available to withdraw
 */
export function getAvailableVestingLiquidity(
  vestingData: VestingState,
  currentPoint: BN,
): BN {
  const {
    cliffPoint,
    periodFrequency,
    cliffUnlockLiquidity,
    liquidityPerPeriod,
    numberOfPeriod,
    totalReleasedLiquidity,
  } = vestingData;

  if (currentPoint.lt(cliffPoint)) {
    return new BN(0);
  }

  if (periodFrequency.isZero()) {
    return cliffUnlockLiquidity;
  }

  let passedPeriod = new BN(currentPoint).sub(cliffPoint).div(periodFrequency);

  passedPeriod = min(passedPeriod, new BN(numberOfPeriod));

  // total unlocked liquidity: cliff + (periods * per_period)
  const unlockedLiquidity = cliffUnlockLiquidity.add(
    passedPeriod.mul(liquidityPerPeriod),
  );
  const availableReleasingLiquidity = unlockedLiquidity.sub(
    totalReleasedLiquidity,
  );

  return availableReleasingLiquidity;
}
