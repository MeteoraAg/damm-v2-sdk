import { BN } from "@coral-xyz/anchor";
import { BASIS_POINT_MAX, LIQUIDITY_SCALE } from "../constants";
import Decimal from "decimal.js";
import { PoolState, PositionState, RewardInfo, UserRewardInfo } from "../types";
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
 * @param nextSqrtPrice sqrt price after swap
 * @param currentSqrtPrice current pool sqrt price
 * @returns Price impact as a percentage (e.g., 1.5 means 1.5%)
 */
export const getPriceImpact = (
  nextSqrtPrice: BN,
  currentSqrtPrice: BN
): number => {
  // price = (sqrtPrice)^2 * 10 ** (base_decimal - quote_decimal) / 2^128
  // k = 10^(base_decimal - quote_decimal) / 2^128
  // priceA = (sqrtPriceA)^2 * k
  // priceB = (sqrtPriceB)^2 * k
  // => price_impact = k * abs ( (sqrtPriceA)^2 - (sqrtPriceB)^2  )  * 100 /  (sqrtPriceB)^2 * k
  // => price_impact = abs ( (sqrtPriceA)^2 - (sqrtPriceB)^2  )  * 100 / (sqrtPriceB)^2
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
): string => {
  const decimalSqrtPrice = new Decimal(sqrtPrice.toString());
  const price = decimalSqrtPrice
    .mul(decimalSqrtPrice)
    .mul(new Decimal(10 ** (tokenADecimal - tokenBDecimal)))
    .div(Decimal.pow(2, 128))
    .toString();

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
export const getUnClaimLpFee = (
  poolState: PoolState,
  positionState: PositionState
): {
  feeTokenA: BN;
  feeTokenB: BN;
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
  };
};

// update reward_per_token_store
// refer this implementation in program: https://github.com/MeteoraAg/damm-v2/blob/main/programs/cp-amm/src/state/pool.rs#L256-L281
function getRewardPerTokenStore(
  poolReward: RewardInfo,
  poolLiquidity: BN,
  currentTime: BN
): BN {
  if (poolLiquidity.eq(new BN(0))) {
    return new BN(0);
  }
  const lastTimeRewardApplicable = BN.min(
    currentTime,
    poolReward.rewardDurationEnd
  );

  const timePeriod = lastTimeRewardApplicable.sub(poolReward.lastUpdateTime);
  const currentTotalReward = timePeriod.mul(poolReward.rewardRate);
  const rewardPerTokenStore = currentTotalReward.shln(128).div(poolLiquidity);

  const totalRewardPerTokenStore = new BN(
    Buffer.from(poolReward.rewardPerTokenStored).reverse()
  ).add(rewardPerTokenStore);

  return totalRewardPerTokenStore;
}

function getRewardPerPeriod(
  poolReward: RewardInfo,
  currentTime: BN,
  periodTime: BN
): BN {
  const timeRewardAppicable = currentTime.add(periodTime);
  // cap max period in reward duration end
  const period =
    timeRewardAppicable <= poolReward.rewardDurationEnd
      ? periodTime
      : poolReward.rewardDurationEnd.sub(currentTime);
  // reward_rate = amount / periodTime
  const rewardPerPeriod = poolReward.rewardRate.mul(period);

  return rewardPerPeriod;
}

// get pool reward info
export function getRewardInfo(
  poolState: PoolState,
  rewardIndex: number,
  periodTime: BN,
  currentTime: BN
): {
  rewardPerPeriod: BN;
  rewardBalance: BN;
  totalRewardDistributed: BN;
} {
  const poolReward = poolState.rewardInfos[rewardIndex];

  const rewardPerTokenStore = getRewardPerTokenStore(
    poolReward,
    poolState.liquidity,
    currentTime
  );

  // calculate current reward distributed to user reward.
  const totalRewardDistributed = rewardPerTokenStore
    .mul(poolState.liquidity)
    .shrn(192);

  if (poolReward.rewardDurationEnd <= currentTime) {
    return {
      rewardPerPeriod: new BN(0),
      rewardBalance: new BN(0),
      totalRewardDistributed,
    };
  }

  const rewardPerPeriod = getRewardPerPeriod(
    poolReward,
    currentTime,
    periodTime
  );

  const remainTime = poolReward.rewardDurationEnd.sub(currentTime);
  const rewardBalance = poolReward.rewardRate.mul(remainTime).shrn(64);

  if (poolState.liquidity.eq(new BN(0))) {
    return {
      rewardPerPeriod,
      rewardBalance,
      totalRewardDistributed: new BN(0),
    };
  }

  return {
    rewardPerPeriod: rewardPerPeriod.shrn(64),
    rewardBalance,
    totalRewardDistributed,
  };
}

// get current pending user reward
// refer to this implementation: https://github.com/MeteoraAg/damm-v2/blob/main/programs/cp-amm/src/state/position.rs#L28-L44
export function getUserRewardPending(
  poolState: PoolState,
  positionState: PositionState,
  rewardIndex: number,
  currentTime: BN,
  periodTime: BN
): { userRewardPerPeriod: BN; userPendingReward: BN } {
  if (poolState.liquidity.eq(new BN(0))) {
    return {
      userRewardPerPeriod: new BN(0),
      userPendingReward: new BN(0),
    };
  }
  const poolReward = poolState.rewardInfos[rewardIndex];
  const userRewardInfo = positionState.rewardInfos[rewardIndex];

  const rewardPerTokenStore = getRewardPerTokenStore(
    poolReward,
    poolState.liquidity,
    currentTime
  );

  const totalPositionLiquidity = positionState.unlockedLiquidity
    .add(positionState.vestedLiquidity)
    .add(positionState.permanentLockedLiquidity);

  const userRewardPerTokenCheckPoint = new BN(
    Buffer.from(userRewardInfo.rewardPerTokenCheckpoint).reverse()
  );
  const newReward = totalPositionLiquidity
    .mul(rewardPerTokenStore.sub(userRewardPerTokenCheckPoint))
    .shrn(192);

  if (poolReward.rewardDurationEnd <= currentTime) {
    return {
      userPendingReward: userRewardInfo.rewardPendings.add(newReward),
      userRewardPerPeriod: new BN(0),
    };
  }

  const rewardPerPeriod = getRewardPerPeriod(
    poolReward,
    currentTime,
    periodTime
  );

  const rewardPerTokenStorePerPeriod = rewardPerPeriod
    .shln(128)
    .div(poolState.liquidity);
  const userRewardPerPeriod = totalPositionLiquidity
    .mul(rewardPerTokenStorePerPeriod)
    .shrn(192);

  return {
    userPendingReward: userRewardInfo.rewardPendings.add(newReward),
    userRewardPerPeriod: userRewardPerPeriod,
  };
}
