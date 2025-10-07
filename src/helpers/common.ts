import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  ActivationType,
  BaseFee,
  BaseFeeMode,
  DynamicFee,
  PoolStatus,
  PoolVersion,
} from "../types";
import {
  BASIS_POINT_MAX,
  BIN_STEP_BPS_DEFAULT,
  BIN_STEP_BPS_U128_DEFAULT,
  CURRENT_POOL_VERSION,
  DYNAMIC_FEE_DECAY_PERIOD_DEFAULT,
  DYNAMIC_FEE_FILTER_PERIOD_DEFAULT,
  DYNAMIC_FEE_REDUCTION_FACTOR_DEFAULT,
  FEE_DENOMINATOR,
  MAX_PRICE_CHANGE_BPS_DEFAULT,
  MAX_RATE_LIMITER_DURATION_IN_SECONDS,
  MAX_RATE_LIMITER_DURATION_IN_SLOTS,
  MIN_FEE_NUMERATOR,
  ONE_Q64,
} from "../constants";
import { getMaxFeeBps, getMaxFeeNumerator } from "../math";
import Decimal from "decimal.js";

/**
 * Checks if the partner is valid
 * @param partner - The partner address
 * @returns True if the partner is valid, false otherwise
 */
export function hasPartner(partner: PublicKey): boolean {
  return !partner.equals(PublicKey.default);
}

/**
 * Gets the current point
 * @param connection - The connection to the Solana cluster
 * @param activationType - The activation type
 * @returns The current point
 */
export async function getCurrentPoint(
  connection: Connection,
  activationType: ActivationType
): Promise<BN> {
  const currentSlot = await connection.getSlot();

  if (activationType === ActivationType.Slot) {
    return new BN(currentSlot);
  } else {
    const currentTime = await connection.getBlockTime(currentSlot);
    return new BN(currentTime);
  }
}

/**
 * Checks if the swap is enabled
 * @param pool - The pool
 * @param currentPoint - The current point
 * @returns True if the swap is enabled, false otherwise
 */
export function isSwapEnabled(
  pool: { poolStatus: PoolStatus; activationPoint: BN },
  currentPoint: BN
): boolean {
  if (typeof pool.poolStatus !== "number") {
    throw new Error("invalid pool status");
  }

  return (
    pool.poolStatus === PoolStatus.Enable &&
    currentPoint.gte(pool.activationPoint)
  );
}

/**
 * Converts the value to a fee scheduler second factor
 * @param value - The value to convert
 * @returns The fee scheduler second factor
 */
export function convertToFeeSchedulerSecondFactor(value: BN): number[] {
  return Array.from(value.toArrayLike(Buffer, "le", 8));
}

/**
 * Parses the fee scheduler second factor
 * @param secondFactor - The fee scheduler second factor
 * @returns The fee scheduler second factor
 */
export function parseFeeSchedulerSecondFactor(secondFactor: number[]): BN {
  return new BN(Buffer.from(secondFactor), "le");
}

/**
 * Converts the value to a rate limiter second factor
 * @param maxLimiterDuration - The max limiter duration
 * @param maxFeeBps - The max fee in basis points
 * @returns The rate limiter second factor
 */
export function convertToRateLimiterSecondFactor(
  maxLimiterDuration: BN,
  maxFeeBps: BN
): number[] {
  const buffer1 = maxLimiterDuration.toArrayLike(Buffer, "le", 4); // maxLimiterDuration
  const buffer2 = maxFeeBps.toArrayLike(Buffer, "le", 4); // maxFeeBps
  const buffer = Buffer.concat([buffer1, buffer2]);
  return Array.from(buffer);
}

/**
 * Parses the rate limiter second factor
 * @param secondFactor - The rate limiter second factor
 * @returns The rate limiter second factor
 */
export function parseRateLimiterSecondFactor(secondFactor: number[]): {
  maxLimiterDuration: number;
  maxFeeBps: number;
} {
  const buffer = Buffer.from(secondFactor);
  return {
    maxLimiterDuration: buffer.readUInt32LE(0),
    maxFeeBps: buffer.readUInt32LE(4),
  };
}

/**
 * Converts basis points (bps) to a fee numerator
 * 1 bps = 0.01% = 0.0001 in decimal
 *
 * @param bps - The value in basis points [1-10_000]
 * @returns The equivalent fee numerator
 */
export function bpsToFeeNumerator(bps: number): BN {
  return new BN(bps * FEE_DENOMINATOR).divn(BASIS_POINT_MAX);
}

/**
 * Converts a fee numerator back to basis points (bps)
 *
 * @param feeNumerator - The fee numerator to convert
 * @returns The equivalent value in basis points [1-10_000]
 */
export function feeNumeratorToBps(feeNumerator: BN): number {
  return feeNumerator
    .muln(BASIS_POINT_MAX)
    .div(new BN(FEE_DENOMINATOR))
    .toNumber();
}

/**
 * Converts the amount to lamports
 * @param amount - The amount to convert
 * @param tokenDecimal - The token decimal
 * @returns The amount in lamports
 */
export function convertToLamports(
  amount: number | string,
  tokenDecimal: number
): BN {
  const valueInLamports = new Decimal(amount).mul(
    Decimal.pow(10, tokenDecimal)
  );
  return fromDecimalToBN(valueInLamports);
}

/**
 * Converts the value to a BN
 * @param value - The value to convert
 * @returns The value in BN
 */
export function fromDecimalToBN(value: Decimal): BN {
  return new BN(value.floor().toFixed());
}

/**
 * Gets the fee scheduler parameters
 * @param startingBaseFeeBps - The starting base fee in basis points
 * @param endingBaseFeeBps - The ending base fee in basis points
 * @param baseFeeMode - The base fee mode
 * @param numberOfPeriod - The number of periods
 * @param totalDuration - The total duration
 * @param poolVersion - The pool version
 * @returns The fee scheduler parameters
 */
export function getFeeSchedulerParams(
  startingBaseFeeBps: number,
  endingBaseFeeBps: number,
  baseFeeMode: BaseFeeMode,
  numberOfPeriod: number,
  totalDuration: number
): BaseFee {
  if (startingBaseFeeBps == endingBaseFeeBps) {
    if (numberOfPeriod != 0 || totalDuration != 0) {
      throw new Error("numberOfPeriod and totalDuration must both be zero");
    }

    return {
      cliffFeeNumerator: bpsToFeeNumerator(startingBaseFeeBps),
      firstFactor: 0,
      secondFactor: Array.from(new BN(0).toArrayLike(Buffer, "le", 8)),
      thirdFactor: new BN(0),
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
    };
  }

  if (numberOfPeriod <= 0) {
    throw new Error("Total periods must be greater than zero");
  }

  const poolMaxFeeBps = getMaxFeeBps(CURRENT_POOL_VERSION);

  if (startingBaseFeeBps > poolMaxFeeBps) {
    throw new Error(
      `startingBaseFeeBps (${startingBaseFeeBps} bps) exceeds maximum allowed value of ${poolMaxFeeBps} bps`
    );
  }

  if (endingBaseFeeBps > startingBaseFeeBps) {
    throw new Error(
      "endingBaseFeeBps bps must be less than or equal to startingBaseFeeBps bps"
    );
  }

  if (numberOfPeriod == 0 || totalDuration == 0) {
    throw new Error(
      "numberOfPeriod and totalDuration must both greater than zero"
    );
  }

  const maxBaseFeeNumerator = bpsToFeeNumerator(startingBaseFeeBps);

  const minBaseFeeNumerator = bpsToFeeNumerator(endingBaseFeeBps);

  const periodFrequency = new BN(totalDuration / numberOfPeriod);

  const secondFactor = convertToFeeSchedulerSecondFactor(periodFrequency);

  let reductionFactor: BN;
  if (baseFeeMode == BaseFeeMode.FeeSchedulerLinear) {
    const totalReduction = maxBaseFeeNumerator.sub(minBaseFeeNumerator);
    reductionFactor = totalReduction.divn(numberOfPeriod);
  } else {
    const ratio =
      minBaseFeeNumerator.toNumber() / maxBaseFeeNumerator.toNumber();
    const decayBase = Math.pow(ratio, 1 / numberOfPeriod);
    reductionFactor = new BN(BASIS_POINT_MAX * (1 - decayBase));
  }

  return {
    cliffFeeNumerator: maxBaseFeeNumerator,
    firstFactor: numberOfPeriod,
    secondFactor,
    thirdFactor: reductionFactor,
    baseFeeMode,
  };
}

/**
 * Gets the rate limiter parameters
 * @param baseFeeBps - The base fee in basis points
 * @param feeIncrementBps - The fee increment in basis points
 * @param referenceAmount - The reference amount
 * @param maxLimiterDuration - The max limiter duration
 * @param maxFeeBps - The max fee in basis points
 * @param tokenBDecimal - The token B decimal
 * @param activationType - The activation type
 * @param poolVersion - The pool version
 * @returns The rate limiter parameters
 */
export function getRateLimiterParams(
  baseFeeBps: number,
  feeIncrementBps: number,
  referenceAmount: number,
  maxLimiterDuration: number,
  maxFeeBps: number,
  tokenBDecimal: number,
  activationType: ActivationType
): BaseFee {
  const cliffFeeNumerator = bpsToFeeNumerator(baseFeeBps);
  const feeIncrementNumerator = bpsToFeeNumerator(feeIncrementBps);

  if (
    baseFeeBps <= 0 ||
    feeIncrementBps <= 0 ||
    referenceAmount <= 0 ||
    maxLimiterDuration <= 0
  ) {
    throw new Error("All rate limiter parameters must be greater than zero");
  }

  const poolMaxFeeBps = getMaxFeeBps(CURRENT_POOL_VERSION);
  const poolMaxFeeNumerator = getMaxFeeNumerator(CURRENT_POOL_VERSION);

  if (baseFeeBps > poolMaxFeeBps) {
    throw new Error(
      `Base fee (${baseFeeBps} bps) exceeds maximum allowed value of ${poolMaxFeeBps} bps`
    );
  }

  if (feeIncrementBps > poolMaxFeeBps) {
    throw new Error(
      `Fee increment (${feeIncrementBps} bps) exceeds maximum allowed value of ${poolMaxFeeBps} bps`
    );
  }

  if (feeIncrementNumerator.gte(new BN(FEE_DENOMINATOR))) {
    throw new Error(
      "Fee increment numerator must be less than FEE_DENOMINATOR"
    );
  }

  if (maxFeeBps > poolMaxFeeBps) {
    throw new Error(
      `Max fee (${maxFeeBps} bps) exceeds maximum allowed value of ${poolMaxFeeBps} bps for PoolVersion V${CURRENT_POOL_VERSION}`
    );
  }

  const deltaNumerator = new BN(poolMaxFeeNumerator).sub(cliffFeeNumerator);
  const maxIndex = deltaNumerator.div(feeIncrementNumerator);
  if (maxIndex.lt(new BN(1))) {
    throw new Error("Fee increment is too large for the given base fee");
  }

  if (
    cliffFeeNumerator.lt(new BN(MIN_FEE_NUMERATOR)) ||
    cliffFeeNumerator.gt(new BN(poolMaxFeeNumerator))
  ) {
    throw new Error("Base fee must be between 0.01% and 99%");
  }

  const maxDuration =
    activationType === ActivationType.Slot
      ? MAX_RATE_LIMITER_DURATION_IN_SLOTS
      : MAX_RATE_LIMITER_DURATION_IN_SECONDS;

  if (maxLimiterDuration > maxDuration) {
    throw new Error(
      `Max duration exceeds maximum allowed value of ${maxDuration}`
    );
  }

  const referenceAmountInLamports = convertToLamports(
    referenceAmount,
    tokenBDecimal
  );

  const secondFactor = convertToRateLimiterSecondFactor(
    new BN(maxLimiterDuration),
    new BN(maxFeeBps)
  );

  return {
    cliffFeeNumerator,
    firstFactor: feeIncrementBps,
    secondFactor,
    thirdFactor: new BN(referenceAmountInLamports),
    baseFeeMode: BaseFeeMode.RateLimiter,
  };
}

/**
 * Gets the base fee parameters
 * @param baseFeeParams - The base fee parameters
 * @param tokenBDecimal - The token B decimal
 * @param activationType - The activation type
 * @param poolVersion - The pool version
 * @returns The base fee parameters
 */
export function getBaseFeeParams(
  baseFeeParams: {
    baseFeeMode: BaseFeeMode;
    rateLimiterParam?: {
      baseFeeBps: number;
      feeIncrementBps: number;
      referenceAmount: number;
      maxLimiterDuration: number;
      maxFeeBps: number;
    };
    feeSchedulerParam?: {
      startingFeeBps: number;
      endingFeeBps: number;
      numberOfPeriod: number;
      totalDuration: number;
    };
  },
  tokenBDecimal: number,
  activationType: ActivationType
): BaseFee {
  if (baseFeeParams.baseFeeMode === BaseFeeMode.RateLimiter) {
    if (!baseFeeParams.rateLimiterParam) {
      throw new Error(
        "Rate limiter parameters are required for RateLimiter mode"
      );
    }
    const {
      baseFeeBps,
      feeIncrementBps,
      referenceAmount,
      maxLimiterDuration,
      maxFeeBps,
    } = baseFeeParams.rateLimiterParam;

    return getRateLimiterParams(
      baseFeeBps,
      feeIncrementBps,
      referenceAmount,
      maxLimiterDuration,
      maxFeeBps,
      tokenBDecimal,
      activationType
    );
  } else {
    if (!baseFeeParams.feeSchedulerParam) {
      throw new Error(
        "Fee scheduler parameters are required for FeeScheduler mode"
      );
    }
    const { startingFeeBps, endingFeeBps, numberOfPeriod, totalDuration } =
      baseFeeParams.feeSchedulerParam;

    return getFeeSchedulerParams(
      startingFeeBps,
      endingFeeBps,
      baseFeeParams.baseFeeMode,
      numberOfPeriod,
      totalDuration
    );
  }
}

/**
 * Gets the dynamic fee parameters
 * @param baseFeeBps - The base fee in basis points
 * @param maxPriceChangeBps - The max price change in basis points
 * @returns The dynamic fee parameters
 */
export function getDynamicFeeParams(
  baseFeeBps: number,
  maxPriceChangeBps: number = MAX_PRICE_CHANGE_BPS_DEFAULT // default 15%
): DynamicFee {
  if (maxPriceChangeBps > MAX_PRICE_CHANGE_BPS_DEFAULT) {
    throw new Error(
      `maxPriceChangeBps (${maxPriceChangeBps} bps) must be less than or equal to ${MAX_PRICE_CHANGE_BPS_DEFAULT}`
    );
  }

  const priceRatio = maxPriceChangeBps / BASIS_POINT_MAX + 1;
  // Q64
  const sqrtPriceRatioQ64 = new BN(
    Decimal.sqrt(priceRatio.toString())
      .mul(Decimal.pow(2, 64))
      .floor()
      .toFixed()
  );
  const deltaBinId = sqrtPriceRatioQ64
    .sub(ONE_Q64)
    .div(BIN_STEP_BPS_U128_DEFAULT)
    .muln(2);

  const maxVolatilityAccumulator = new BN(deltaBinId.muln(BASIS_POINT_MAX));

  const squareVfaBin = maxVolatilityAccumulator
    .mul(new BN(BIN_STEP_BPS_DEFAULT))
    .pow(new BN(2));

  const baseFeeNumerator = new BN(bpsToFeeNumerator(baseFeeBps));
  const maxDynamicFeeNumerator = baseFeeNumerator.muln(20).divn(100); // default max dynamic fee = 20% of base fee.
  const vFee = maxDynamicFeeNumerator
    .mul(new BN(100_000_000_000))
    .sub(new BN(99_999_999_999));

  const variableFeeControl = vFee.div(squareVfaBin);

  return {
    binStep: BIN_STEP_BPS_DEFAULT,
    binStepU128: BIN_STEP_BPS_U128_DEFAULT,
    filterPeriod: DYNAMIC_FEE_FILTER_PERIOD_DEFAULT,
    decayPeriod: DYNAMIC_FEE_DECAY_PERIOD_DEFAULT,
    reductionFactor: DYNAMIC_FEE_REDUCTION_FACTOR_DEFAULT,
    maxVolatilityAccumulator: maxVolatilityAccumulator.toNumber(),
    variableFeeControl: variableFeeControl.toNumber(),
  };
}
