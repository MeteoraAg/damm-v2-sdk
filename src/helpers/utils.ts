import { BN } from "@coral-xyz/anchor";
import {
  BASIS_POINT_MAX,
  DEAD_LIQUIDITY,
  LIQUIDITY_SCALE,
  TOTAL_REWARD_SCALE,
  U128_MAX,
  U64_MAX,
} from "../constants";
import { MathOverflowError } from "../errors";
import { validateRewardIndex } from "./validation";
import Decimal from "decimal.js";
import {
  CollectFeeMode,
  PoolState,
  PositionState,
  RewardInfo,
  SwapMode,
} from "../types";

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
 * Calculates minimum amount out or maximum amount in based on slippage and swap mode.
 * For ExactIn/PartialFill: returns minimum amount out.
 * For ExactOut: returns maximum amount in.
 *
 * @param {BN} amount - The base amount (outputAmount for ExactIn/PartialFill, includedFeeInputAmount for ExactOut)
 * @param {number} slippageBps - Slippage in basis points (1% = 100)
 * @param {SwapMode} swapMode - Swap mode (ExactIn, PartialFill, ExactOut)
 * @returns {BN} - Minimum amount out (for ExactIn/PartialFill) or maximum amount in (for ExactOut)
 */
export const getAmountWithSlippage = (
  amount: BN,
  slippageBps: number,
  swapMode: SwapMode,
): BN => {
  let result: BN;

  if (slippageBps > 0) {
    if (swapMode === SwapMode.ExactOut) {
      // maximum amount in: amount * (10000 + slippageBps) / 10000
      const slippageFactor = new BN(BASIS_POINT_MAX + slippageBps);
      result = amount.mul(slippageFactor).div(new BN(BASIS_POINT_MAX));
    } else {
      // minimum amount out: amount * (10000 - slippageBps) / 10000
      const slippageFactor = new BN(BASIS_POINT_MAX - slippageBps);
      result = amount.mul(slippageFactor).div(new BN(BASIS_POINT_MAX));
    }
  } else {
    result = amount;
  }

  return result;
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
  tokenBDecimal: number,
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
    tokenBDecimal,
  );

  // execution price: amountIn / amountOut
  const executionPrice = new Decimal(amountIn.toString())
    .div(new Decimal(amountOut.toString()))
    .mul(
      Decimal.pow(
        10,
        aToB ? tokenBDecimal - tokenADecimal : tokenADecimal - tokenBDecimal,
      ),
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
  currentSqrtPrice: BN,
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

/**
 * Converts a sqrt price to a price
 * (sqrtPrice)^2 * 10 ** (base_decimal - quote_decimal) / 2^128
 *
 * The result is quote-natural per base-natural (unscaled). Convert with
 * {@link TokenScale.scalePrice} only when displaying a wallet-visible price.
 *
 * @param sqrtPrice - The sqrt price
 * @param tokenADecimal - The token A decimal
 * @param tokenBDecimal - The token B decimal
 * @returns The price
 */
export const getPriceFromSqrtPrice = (
  sqrtPrice: BN,
  tokenADecimal: number,
  tokenBDecimal: number,
): Decimal => {
  const decimalSqrtPrice = new Decimal(sqrtPrice.toString());
  const price = decimalSqrtPrice
    .mul(decimalSqrtPrice)
    .mul(new Decimal(10 ** (tokenADecimal - tokenBDecimal)))
    .div(Decimal.pow(2, 128));

  return price;
};

/**
 * Converts a price to a sqrt price
 * sqrt(price / 10^(tokenADecimal - tokenBDecimal)) * 2^64
 *
 * `price` must be quote-natural per base-natural. If the caller has a
 * wallet-visible ScaledUiAmount price, convert it with
 * {@link TokenScale.unscalePrice} first. Do not scale inside this helper.
 *
 * @param price - The price
 * @param tokenADecimal - The token A decimal
 * @param tokenBDecimal - The token B decimal
 * @returns The sqrt price
 */
export const getSqrtPriceFromPrice = (
  price: string,
  tokenADecimal: number,
  tokenBDecimal: number,
): BN => {
  const decimalPrice = new Decimal(price);

  const adjustedByDecimals = decimalPrice.div(
    new Decimal(10 ** (tokenADecimal - tokenBDecimal)),
  );

  const sqrtValue = Decimal.sqrt(adjustedByDecimals);

  const sqrtValueQ64 = sqrtValue.mul(Decimal.pow(2, 64));

  return new BN(sqrtValueQ64.floor().toFixed());
};

export const U256_MODULUS = new BN(1).shln(256);
export const U64_MODULUS = new BN(1).shln(64);

export function readU256Le(bytes: ArrayLike<number>): BN {
  return new BN(Buffer.from(bytes).reverse());
}

export function wrappingAddU256(value: BN, delta: BN): BN {
  return value.add(delta).umod(U256_MODULUS);
}

export function wrappingSubU256(value: BN, checkpoint: BN): BN {
  return value.sub(checkpoint).umod(U256_MODULUS);
}

export function calculatePositionFeeOrReward(
  positionLiquidity: BN,
  tokenPerLiquidityDelta: BN,
  offset: number,
): BN {
  const shifted = positionLiquidity.mul(tokenPerLiquidityDelta).shrn(offset);
  return shifted.gt(U64_MAX) ? U64_MAX : shifted;
}

export function saturatingAddU64(pending: BN, amount: BN): BN {
  const sum = pending.add(amount);
  return sum.gt(U64_MAX) ? U64_MAX : sum;
}

export function wrappingSubU64(value: BN, checkpoint: BN): BN {
  return value.sub(checkpoint).umod(U64_MODULUS);
}

export function mulShr256WrappingU64(x: BN, y: BN, offset: number): BN {
  return x.mul(y).shrn(offset).umod(U64_MODULUS);
}

export function positionLiquidity(positionState: PositionState): BN {
  return positionState.unlockedLiquidity
    .add(positionState.vestedLiquidity)
    .add(positionState.permanentLockedLiquidity);
}

export function pendingPositionReward(
  positionState: PositionState,
  rewardIndex: number,
  rewardPerTokenStored: BN,
): BN {
  const userRewardInfo = positionState.rewardInfos[rewardIndex];
  const accrued = calculatePositionFeeOrReward(
    positionLiquidity(positionState),
    wrappingSubU256(
      rewardPerTokenStored,
      readU256Le(userRewardInfo.rewardPerTokenCheckpoint),
    ),
    TOTAL_REWARD_SCALE,
  );
  return saturatingAddU64(userRewardInfo.rewardPendings, accrued);
}

// fee = totalLiquidity * feePerTokenStore
// precision: (totalLiquidity * feePerTokenStore) >> 128
/**
 * Gets the unclaimed reward
 * fee = totalLiquidity * feePerTokenStore
 * precision: (totalLiquidity * feePerTokenStore) >> 128
 * @param poolState - The pool state
 * @param positionState - The position state
 * @param currentTime - Slot or timestamp used to project reward accrual. Omit it to use the stored accumulator.
 * @returns The unclaimed reward
 */
export const getUnClaimLpFee = (
  poolState: PoolState,
  positionState: PositionState,
  currentTime?: BN,
): {
  feeTokenA: BN;
  feeTokenB: BN;
  rewards: BN[];
} => {
  const totalPositionLiquidity = positionState.unlockedLiquidity
    .add(positionState.vestedLiquidity)
    .add(positionState.permanentLockedLiquidity);

  const feeAPerTokenStored = wrappingSubU256(
    readU256Le(poolState.feeAPerLiquidity),
    readU256Le(positionState.feeAPerTokenCheckpoint),
  );

  const feeBPerTokenStored = wrappingSubU256(
    readU256Le(poolState.feeBPerLiquidity),
    readU256Le(positionState.feeBPerTokenCheckpoint),
  );

  const feeA = calculatePositionFeeOrReward(
    totalPositionLiquidity,
    feeAPerTokenStored,
    LIQUIDITY_SCALE,
  );
  const feeB = calculatePositionFeeOrReward(
    totalPositionLiquidity,
    feeBPerTokenStored,
    LIQUIDITY_SCALE,
  );

  return {
    feeTokenA: saturatingAddU64(positionState.feeAPending, feeA),
    feeTokenB: saturatingAddU64(positionState.feeBPending, feeB),
    rewards: positionState.rewardInfos.map((_, rewardIndex) =>
      quotePositionReward(poolState, positionState, rewardIndex, currentTime),
    ),
  };
};

function quotePositionReward(
  poolState: PoolState,
  positionState: PositionState,
  rewardIndex: number,
  currentTime?: BN,
): BN {
  const userRewardInfo = positionState.rewardInfos[rewardIndex];
  const poolReward = poolState.rewardInfos[rewardIndex];
  if (!poolReward?.initialized) {
    return userRewardInfo.rewardPendings;
  }

  const rewardPerTokenStored = currentTime
    ? getRewardPerTokenStore(poolReward, poolState.liquidity, currentTime)
    : readU256Le(poolReward.rewardPerTokenStored);

  return pendingPositionReward(
    positionState,
    rewardIndex,
    rewardPerTokenStored,
  );
}

// update reward_per_token_store
// refer this implementation in program: https://github.com/MeteoraAg/damm-v2/blob/689a3264484799d833c505523f4ff4e4990690aa/programs/cp-amm/src/state/pool.rs#L315
function elapsedRewardSeconds(poolReward: RewardInfo, currentTime: BN): BN {
  const lastTimeRewardApplicable = BN.min(
    currentTime,
    poolReward.rewardDurationEnd,
  );
  const timePeriod = lastTimeRewardApplicable.sub(poolReward.lastUpdateTime);
  if (timePeriod.isNeg()) {
    throw new MathOverflowError();
  }
  return timePeriod;
}

function rewardPerTokenDelta(
  poolReward: RewardInfo,
  poolLiquidity: BN,
  currentTime: BN,
): BN {
  const timePeriod = elapsedRewardSeconds(poolReward, currentTime);
  if (poolLiquidity.isZero()) {
    const emptySeconds =
      poolReward.cumulativeSecondsWithEmptyLiquidityReward.add(timePeriod);
    if (emptySeconds.gt(U64_MAX)) {
      throw new MathOverflowError();
    }
    return new BN(0);
  }

  const currentTotalReward = timePeriod.mul(poolReward.rewardRate);
  if (currentTotalReward.gt(U128_MAX)) {
    throw new MathOverflowError();
  }

  return currentTotalReward.shln(LIQUIDITY_SCALE).div(poolLiquidity);
}

function getRewardPerTokenStore(
  poolReward: RewardInfo,
  poolLiquidity: BN,
  currentTime: BN,
): BN {
  const stored = readU256Le(poolReward.rewardPerTokenStored);
  if (!poolReward.initialized) {
    return stored;
  }

  return wrappingAddU256(
    stored,
    rewardPerTokenDelta(poolReward, poolLiquidity, currentTime),
  );
}

function getRewardPerPeriod(
  poolReward: RewardInfo,
  currentTime: BN,
  periodTime: BN,
): BN {
  const timeRewardApplicable = currentTime.add(periodTime);
  const period = timeRewardApplicable.lte(poolReward.rewardDurationEnd)
    ? periodTime
    : poolReward.rewardDurationEnd.sub(currentTime);
  const rewardPerPeriod = poolReward.rewardRate.mul(period);
  if (rewardPerPeriod.gt(U128_MAX)) {
    throw new MathOverflowError();
  }

  return rewardPerPeriod;
}

// get pool reward info
export function getRewardInfo(
  poolState: PoolState,
  rewardIndex: number,
  periodTime: BN,
  currentTime: BN,
): {
  rewardPerPeriod: BN;
  rewardBalance: BN;
  totalRewardDistributed: BN;
} {
  const poolReward = poolState.rewardInfos[rewardIndex];

  const rewardPerTokenStore = getRewardPerTokenStore(
    poolReward,
    poolState.liquidity,
    currentTime,
  );

  // calculate current reward distributed to user reward.
  const totalRewardDistributed = rewardPerTokenStore
    .mul(poolState.liquidity)
    .shrn(TOTAL_REWARD_SCALE);

  if (poolReward.rewardDurationEnd.lte(currentTime)) {
    return {
      rewardPerPeriod: new BN(0),
      rewardBalance: new BN(0),
      totalRewardDistributed,
    };
  }

  const rewardPerPeriod = getRewardPerPeriod(
    poolReward,
    currentTime,
    periodTime,
  );

  const remainTime = poolReward.rewardDurationEnd.sub(currentTime);
  const rewardBalance = poolReward.rewardRate.mul(remainTime);
  if (rewardBalance.gt(U128_MAX)) {
    throw new MathOverflowError();
  }

  return {
    rewardPerPeriod: rewardPerPeriod.shrn(64),
    rewardBalance: rewardBalance.shrn(64),
    totalRewardDistributed,
  };
}

// get current pending user reward
// refer to this implementation: https://github.com/MeteoraAg/damm-v2/blob/689a3264484799d833c505523f4ff4e4990690aa/programs/cp-amm/src/state/position.rs#L29
export function getUserRewardPending(
  poolState: PoolState,
  positionState: PositionState,
  rewardIndex: number,
  currentTime: BN,
  periodTime: BN,
): { userRewardPerPeriod: BN; userPendingReward: BN } {
  const poolReward = poolState.rewardInfos[rewardIndex];
  const userRewardInfo = positionState.rewardInfos[rewardIndex];
  if (!poolReward?.initialized) {
    return {
      userPendingReward: userRewardInfo.rewardPendings,
      userRewardPerPeriod: new BN(0),
    };
  }

  const rewardPerTokenStore = getRewardPerTokenStore(
    poolReward,
    poolState.liquidity,
    currentTime,
  );
  const userPendingReward = pendingPositionReward(
    positionState,
    rewardIndex,
    rewardPerTokenStore,
  );

  if (
    poolState.liquidity.isZero() ||
    poolReward.rewardDurationEnd.lte(currentTime)
  ) {
    return {
      userPendingReward,
      userRewardPerPeriod: new BN(0),
    };
  }

  const rewardPerPeriod = getRewardPerPeriod(
    poolReward,
    currentTime,
    periodTime,
  );
  const rewardPerTokenStorePerPeriod = rewardPerPeriod
    .shln(LIQUIDITY_SCALE)
    .div(poolState.liquidity);

  return {
    userPendingReward,
    userRewardPerPeriod: calculatePositionFeeOrReward(
      positionLiquidity(positionState),
      rewardPerTokenStorePerPeriod,
      TOTAL_REWARD_SCALE,
    ),
  };
}

/**
 * Reward owed to a compounding pool's permanent dead liquidity.
 * Projects the reward accumulator to `currentTime` before reading the checkpoint.
 * @param poolState - The pool state
 * @param rewardIndex - The reward slot
 * @param currentTime - Slot or timestamp
 * @returns The withdrawable dead-liquidity reward
 */
export function getDeadLiquidityReward(
  poolState: PoolState,
  rewardIndex: number,
  currentTime: BN,
): BN {
  validateRewardIndex(rewardIndex);

  if (poolState.collectFeeMode !== CollectFeeMode.Compounding) {
    return new BN(0);
  }

  const poolReward = poolState.rewardInfos[rewardIndex];
  if (!poolReward?.initialized) {
    return new BN(0);
  }

  const rewardPerTokenStored = getRewardPerTokenStore(
    poolReward,
    poolState.liquidity,
    currentTime,
  );
  const checkpoint = mulShr256WrappingU64(
    DEAD_LIQUIDITY,
    rewardPerTokenStored,
    TOTAL_REWARD_SCALE,
  );

  return wrappingSubU64(checkpoint, poolReward.deadLiquidityRewardCheckpoint);
}
