import { BN } from "@coral-xyz/anchor";
import { BASIS_POINT_MAX, SCALE_OFFSET } from "../constants";
import Decimal from "decimal.js";
import { PositionState } from "../types";
import { PublicKey } from "@solana/web3.js";
/**
 * It takes an amount and a slippage rate, and returns the maximum amount that can be received with
 * that slippage rate
 * @param {BN} amount - The amount of tokens you want to buy.
 * @param {number} slippageRate - The maximum percentage of slippage you're willing to accept. (Max to 2 decimal place)
 * @returns The maximum amount of tokens that can be bought with the given amount of ETH, given the
 * slippage rate.
 */
export const getMaxAmountWithSlippage = (amount: BN, slippageRate: number) => {
  const slippage = ((100 + slippageRate) / 100) * BASIS_POINT_MAX;
  return amount.mul(new BN(slippage)).div(new BN(BASIS_POINT_MAX));
};

/**
 * It takes an amount and a slippage rate, and returns the minimum amount that will be received after
 * slippage
 * @param {BN} amount - The amount of tokens you want to sell.
 * @param {number} slippageRate - The percentage of slippage you're willing to accept. (Max to 2 decimal place)
 * @returns The minimum amount that can be received after slippage is applied.
 */
export const getMinAmountWithSlippage = (amount: BN, slippageRate: number) => {
  const slippage = ((100 - slippageRate) / 100) * BASIS_POINT_MAX;
  return amount.mul(new BN(slippage)).div(new BN(BASIS_POINT_MAX));
};

export const getPriceImpact = (
  amount: BN,
  amountWithoutSlippage: BN
): number => {
  const diff = amountWithoutSlippage.sub(amount);
  return new Decimal(diff.toString())
    .div(new Decimal(amountWithoutSlippage.toString()))
    .mul(100)
    .toNumber();
};

// (sqrtPrice >> 64) ** 2 * 10 ** (base_decimal - quote_decimal)
export const getCurrentPrice = (
  sqrtPrice: BN,
  tokenADecimal: number,
  tokenBDecimal: number
): BN => {
  const rawSqrtPrice = sqrtPrice.shrn(SCALE_OFFSET);
  const price = rawSqrtPrice.mul(rawSqrtPrice);
  const expo = 10 ** (tokenADecimal - tokenBDecimal);
  return price.muln(expo);
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
