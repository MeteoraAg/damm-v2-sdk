import { BN } from "@coral-xyz/anchor";
import { BASIS_POINT_MAX, PRECISION, SCALE_OFFSET } from "../constants";
import Decimal from "decimal.js";
import { PositionState } from "../types";
import { PublicKey } from "@solana/web3.js";
/**
 * It takes an amount and a slippage rate, and returns the maximum amount that can be received with
 * that slippage rate
 * @param {BN} amount - The amount of tokens you want to buy.
 * @param {number} rate - The maximum percentage of slippage you're willing to accept. (Max to 2 decimal place)
 * @returns The maximum amount of tokens that can be bought with the given amount of ETH, given the
 * slippage rate.
 */
export const getMaxAmountWithSlippage = (amount: BN, rate: number) => {
  const slippage = ((100 + rate) / 100) * BASIS_POINT_MAX;
  return amount.mul(new BN(slippage)).div(new BN(BASIS_POINT_MAX));
};

/**
 * It takes an amount and a slippage rate, and returns the minimum amount that will be received after
 * slippage
 * @param {BN} amount - The amount of tokens you want to sell.
 * @param {number} rate - The percentage of slippage you're willing to accept. (Max to 2 decimal place)
 * @returns The minimum amount that can be received after slippage is applied.
 */
export const getMinAmountWithSlippage = (amount: BN, rate: number) => {
  const slippage = ((100 - rate) / 100) * BASIS_POINT_MAX;
  return amount.mul(new BN(slippage)).div(new BN(BASIS_POINT_MAX));
};

/**
 * Calculate price impact as a percentage
 * @param actualAmount Amount after slippage in token units
 * @param idealAmount Theoretical amount without slippage in token units
 * @returns Price impact as a percentage (e.g., 1.5 means 1.5%)
 */
export const getPriceImpact = (actualAmount: BN, idealAmount: BN): number => {
  const diff = idealAmount.sub(actualAmount);
  return new Decimal(diff.toString())
    .div(new Decimal(idealAmount.toString()))
    .mul(100)
    .toNumber();
};

// (sqrtPrice >> 64) ** 2 * 10 ** (base_decimal - quote_decimal)
// precision: (sqrtPrice^2 * 10 ** (base_decimal - quote_decimal)).shr(128)
export const getCurrentPrice = (
  sqrtPrice: BN,
  tokenADecimal: number,
  tokenBDecimal: number
): string => {
  const decimalSqrtPrice = new Decimal(sqrtPrice.toString());
  const price = decimalSqrtPrice
    .mul(decimalSqrtPrice)
    .mul(new Decimal(10 ** (tokenADecimal - tokenBDecimal)))
    .div(Decimal.pow(2, 128))
    .toString();

  return price;
};

export const getUnClaimReward = (
  positionState: PositionState
): {
  feeTokenA: BN;
  feeTokenB: BN;
  rewards: BN[];
} => {
  return {
    feeTokenA: positionState.feeAPending,
    feeTokenB: positionState.feeBPending,
    rewards:
      positionState.rewardInfos.length > 0
        ? positionState.rewardInfos.map((item) => item.rewardPendings)
        : [],
  };
};
