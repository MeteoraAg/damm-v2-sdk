import { BN } from "@coral-xyz/anchor";
import { BASIS_POINT_MAX, LIQUIDITY_SCALE } from "../constants";
import Decimal from "decimal.js";
import { PoolState, PositionState } from "../types";
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
 * Price impact measures how much worse the user's execution was compared to the current market price
 * @param amountIn - Input amount (in base units)
 * @param amountOut - Output amount (in base units)
 * @param currentSqrtPrice - Current pool sqrt price (spot price)
 * @param aToB - Direction of swap: true for token A to token B, false for token B to token A
 * @param tokenADecimal - Decimal places for token A
 * @param tokenBDecimal - Decimal places for token B
 * @returns Price impact as a percentage (e.g., 1.5 means 1.5% worse than spot price)
 */
export const getPriceImpact = (
  amountIn: BN,
  amountOut: BN,
  currentSqrtPrice: BN,
  aToB: boolean,
  tokenADecimal: number,
  tokenBDecimal: number
): Decimal => {
  if (amountIn.eq(new BN(0))) {
    return new Decimal(0);
  }
  if (amountOut.eq(new BN(0))) {
    throw new Error("Amount out must be greater than 0");
  }

  // spot price: (sqrtPrice)^2 * 10^(base_decimal - quote_decimal) / 2^128
  const spotPrice = getPriceFromSqrtPrice(
    currentSqrtPrice,
    tokenADecimal,
    tokenBDecimal
  );

  // execution price: amountIn / amountOut
  const executionPrice = new Decimal(amountIn.toString())
    .div(new Decimal(amountOut.toString()))
    .mul(
      Decimal.pow(
        10,
        aToB ? tokenBDecimal - tokenADecimal : tokenADecimal - tokenBDecimal
      )
    );

  let priceImpact: Decimal;
  let actualExecutionPrice: Decimal;
  if (aToB) {
    actualExecutionPrice = new Decimal(1).div(executionPrice);
  } else {
    actualExecutionPrice = executionPrice;
  }

  // price impact = abs(execution_price - spot_price) / spot_price * 100%
  priceImpact = actualExecutionPrice
    .sub(spotPrice)
    .abs()
    .div(spotPrice)
    .mul(100);

  return priceImpact;
};

/**
 * Calculate price change as a percentage (old implementation)
 * This measures the percentage change in pool price after a swap
 * @param nextSqrtPrice sqrt price after swap
 * @param currentSqrtPrice current pool sqrt price
 * @returns Price change as a percentage (e.g., 1.5 means 1.5% change)
 */
export const getPriceChange = (
  nextSqrtPrice: BN,
  currentSqrtPrice: BN
): number => {
  // price = (sqrtPrice)^2 * 10 ** (base_decimal - quote_decimal) / 2^128
  // k = 10^(base_decimal - quote_decimal) / 2^128
  // priceA = (sqrtPriceA)^2 * k
  // priceB = (sqrtPriceB)^2 * k
  // => price_change = k * abs ( (sqrtPriceA)^2 - (sqrtPriceB)^2  )  * 100 /  (sqrtPriceB)^2 * k
  // => price_change = abs ( (sqrtPriceA)^2 - (sqrtPriceB)^2  )  * 100 / (sqrtPriceB)^2
  const diff = nextSqrtPrice
    .pow(new BN(2))
    .sub(currentSqrtPrice.pow(new BN(2)))
    .abs();

  return new Decimal(diff.toString())
    .div(new Decimal(currentSqrtPrice.pow(new BN(2)).toString()))
    .mul(100)
    .toNumber();
};

// (sqrtPrice)^2 * 10 ** (base_decimal - quote_decimal) / 2^128
export const getPriceFromSqrtPrice = (
  sqrtPrice: BN,
  tokenADecimal: number,
  tokenBDecimal: number
): Decimal => {
  const decimalSqrtPrice = new Decimal(sqrtPrice.toString());
  const price = decimalSqrtPrice
    .mul(decimalSqrtPrice)
    .mul(new Decimal(10 ** (tokenADecimal - tokenBDecimal)))
    .div(Decimal.pow(2, 128));

  return price;
};

//  sqrt(price / 10^(tokenADecimal - tokenBDecimal)) * 2^64
export const getSqrtPriceFromPrice = (
  price: string,
  tokenADecimal: number,
  tokenBDecimal: number
): BN => {
  const decimalPrice = new Decimal(price);

  const adjustedByDecimals = decimalPrice.div(
    new Decimal(10 ** (tokenADecimal - tokenBDecimal))
  );

  const sqrtValue = Decimal.sqrt(adjustedByDecimals);

  const sqrtValueQ64 = sqrtValue.mul(Decimal.pow(2, 64));

  return new BN(sqrtValueQ64.floor().toFixed());
};

// fee = totalLiquidity * feePerTokenStore
// precision: (totalLiquidity * feePerTokenStore) >> 128
export const getUnClaimReward = (
  poolState: PoolState,
  positionState: PositionState
): {
  feeTokenA: BN;
  feeTokenB: BN;
  rewards: BN[];
} => {
  const totalPositionLiquidity = positionState.unlockedLiquidity
    .add(positionState.vestedLiquidity)
    .add(positionState.permanentLockedLiquidity);

  const feeAPerTokenStored = new BN(
    Buffer.from(poolState.feeAPerLiquidity).reverse()
  ).sub(new BN(Buffer.from(positionState.feeAPerTokenCheckpoint).reverse()));

  const feeBPerTokenStored = new BN(
    Buffer.from(poolState.feeBPerLiquidity).reverse()
  ).sub(new BN(Buffer.from(positionState.feeBPerTokenCheckpoint).reverse()));

  const feeA = totalPositionLiquidity
    .mul(feeAPerTokenStored)
    .shrn(LIQUIDITY_SCALE);
  const feeB = totalPositionLiquidity
    .mul(feeBPerTokenStored)
    .shrn(LIQUIDITY_SCALE);

  return {
    feeTokenA: positionState.feeAPending.add(feeA),
    feeTokenB: positionState.feeBPending.add(feeB),
    rewards:
      positionState.rewardInfos.length > 0
        ? positionState.rewardInfos.map((item) => item.rewardPendings)
        : [],
  };
};
