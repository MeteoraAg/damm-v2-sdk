import BN from "bn.js";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  DynamicFee,
  PoolFeesParams,
} from "../types";
import {
  getFeeNumeratorFromIncludedFeeAmount,
  getMaxBaseFeeNumerator,
  getFeeTimeMinBaseFeeNumerator,
  isNonZeroRateLimiter,
  isZeroRateLimiter,
  getFeeMarketCapMinBaseFeeNumerator,
  getBaseFeeHandlerFromBorshData,
} from "../math/poolFees";
import {
  BASIS_POINT_MAX,
  BIN_STEP_BPS_DEFAULT,
  BIN_STEP_BPS_U128_DEFAULT,
  DEAD_LIQUIDITY,
  CURRENT_POOL_VERSION,
  FEE_DENOMINATOR,
  MAX_RATE_LIMITER_DURATION_IN_SECONDS,
  MAX_RATE_LIMITER_DURATION_IN_SLOTS,
  MAX_REWARD_DURATION,
  MAX_SQRT_PRICE,
  MIN_FEE_NUMERATOR,
  MIN_REWARD_DURATION,
  MIN_SQRT_PRICE,
  NUM_REWARDS,
  SPLIT_POSITION_DENOMINATOR,
  U24_MAX,
  U64_MAX,
} from "../constants";
import { toNumerator } from "../math";
import { getMaxFeeBps, getMaxFeeNumerator } from "../math";
import {
  AmountIsZeroError,
  ExceedMaxFeeBpsError,
  InvalidActivationTypeError,
  InvalidCollectFeeModeError,
  InvalidCompoundingFeeBpsError,
  InvalidDynamicFeeParametersError,
  InvalidFeeError,
  InvalidFeeMarketCapSchedulerError,
  InvalidFeeRateLimiterError,
  InvalidFeeTimeSchedulerError,
  InvalidMinimumLiquidityError,
  InvalidParametersError,
  InvalidPriceRangeError,
  InvalidRewardDurationError,
  InvalidRewardIndexError,
  InvalidSplitPositionParametersError,
  InvalidVestingInfoError,
  SameTokenMintsError,
} from "../errors";
import { PublicKey } from "@solana/web3.js";

/**
 * Validate fee scheduler parameters
 * @param numberOfPeriod Number of periods
 * @param periodFrequency Period frequency
 * @param reductionFactor Reduction factor
 * @param cliffFeeNumerator Cliff fee numerator
 * @param baseFeeMode Base fee mode
 * @param poolVersion Pool version
 * @throws Error if the fee time scheduler is invalid.
 * @returns True if the fee time scheduler is valid, otherwise false.
 */
export function validateFeeTimeScheduler(
  numberOfPeriod: number,
  periodFrequency: BN,
  reductionFactor: BN,
  cliffFeeNumerator: BN,
  baseFeeMode: BaseFeeMode,
  feeVersion: number,
): boolean {
  if (
    !periodFrequency.eq(new BN(0)) ||
    numberOfPeriod !== 0 ||
    !reductionFactor.eq(new BN(0))
  ) {
    if (
      numberOfPeriod === 0 ||
      periodFrequency.eq(new BN(0)) ||
      reductionFactor.eq(new BN(0))
    ) {
      throw new InvalidFeeTimeSchedulerError();
    }
  }

  const minFeeNumerator = getFeeTimeMinBaseFeeNumerator(
    cliffFeeNumerator,
    numberOfPeriod,
    reductionFactor,
    baseFeeMode,
  );
  const maxFeeNumerator = getMaxBaseFeeNumerator(cliffFeeNumerator);
  validateFeeFraction(minFeeNumerator, new BN(FEE_DENOMINATOR));
  validateFeeFraction(maxFeeNumerator, new BN(FEE_DENOMINATOR));

  if (
    minFeeNumerator.lt(new BN(MIN_FEE_NUMERATOR)) ||
    maxFeeNumerator.gt(getMaxFeeNumerator(feeVersion))
  ) {
    throw new ExceedMaxFeeBpsError();
  }

  return true;
}

/**
 * Validates whether the base fee is static based on the scheduler's expiration.
 * @param currentPoint - The current point as BN.
 * @param activationPoint - The activation point as BN.
 * @param numberOfPeriod - The total number of periods as BN.
 * @param periodFrequency - The period frequency as BN.
 * @returns True if the base fee is static, otherwise false.
 */
export function validateFeeTimeSchedulerBaseFeeIsStatic(
  currentPoint: BN,
  activationPoint: BN,
  numberOfPeriod: BN,
  periodFrequency: BN,
): boolean {
  // schedulerExpirationPoint = activationPoint + (numberOfPeriod * periodFrequency)
  const schedulerExpirationPoint = activationPoint.add(
    numberOfPeriod.mul(periodFrequency),
  );

  return currentPoint.gt(schedulerExpirationPoint);
}

/**
 * Validates the Market Cap Fee Scheduler parameters.
 * This checks for non-zero scheduler fields and validates fee fractions and limits, following the Rust logic.
 * @param cliffFeeNumerator - The cliff fee numerator as BN.
 * @param numberOfPeriod - Number of periods (number).
 * @param sqrtPriceStepBps - The sqrt price step in basis points (BN).
 * @param reductionFactor - The reduction factor as BN.
 * @param schedulerExpirationDuration - The scheduler expiration duration as BN.
 * @param feeMarketCapSchedulerMode - The fee scheduler mode (BaseFeeMode).
 * @param poolVersion - The pool version.
 * @throws Error if validation fails.
 * @returns True if the fee market cap scheduler is valid, otherwise false.
 */
export function validateFeeMarketCapScheduler(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  sqrtPriceStepBps: BN,
  reductionFactor: BN,
  schedulerExpirationDuration: BN,
  feeMarketCapSchedulerMode: BaseFeeMode,
  feeVersion: number,
): boolean {
  // doesn't allow zero fee marketcap scheduler
  if (reductionFactor.lte(new BN(0))) {
    throw new InvalidFeeMarketCapSchedulerError();
  }

  if (sqrtPriceStepBps.lte(new BN(0))) {
    throw new InvalidFeeMarketCapSchedulerError();
  }

  if (schedulerExpirationDuration.lte(new BN(0))) {
    throw new InvalidFeeMarketCapSchedulerError();
  }

  if (numberOfPeriod <= 0) {
    throw new InvalidFeeMarketCapSchedulerError();
  }

  const minFeeNumerator = getFeeMarketCapMinBaseFeeNumerator(
    cliffFeeNumerator,
    numberOfPeriod,
    reductionFactor,
    feeMarketCapSchedulerMode,
  );
  const maxFeeNumerator = cliffFeeNumerator;

  validateFeeFraction(minFeeNumerator, new BN(FEE_DENOMINATOR));
  validateFeeFraction(maxFeeNumerator, new BN(FEE_DENOMINATOR));

  const maxAllowedFeeNumerator = getMaxFeeNumerator(feeVersion);

  if (
    minFeeNumerator.lt(new BN(MIN_FEE_NUMERATOR)) ||
    maxFeeNumerator.gt(maxAllowedFeeNumerator)
  ) {
    throw new ExceedMaxFeeBpsError();
  }

  return true;
}

/**
 * Validates whether the base fee is static for market cap fee scheduler, based on scheduler's expiration
 * @param currentPoint - The current point as BN.
 * @param activationPoint - The activation point as BN.
 * @param schedulerExpirationDuration - The scheduler expiration duration as BN.
 * @returns True if the base fee is static, otherwise false.
 */
export function validateFeeMarketCapBaseFeeIsStatic(
  currentPoint: BN,
  activationPoint: BN,
  schedulerExpirationDuration: BN,
): boolean {
  // schedulerExpirationPoint = activationPoint + schedulerExpirationDuration
  const schedulerExpirationPoint = activationPoint.add(
    schedulerExpirationDuration,
  );

  return currentPoint.gt(schedulerExpirationPoint);
}

/**
 * Validate rate limiter parameters
 * @param cliffFeeNumerator - Cliff fee numerator
 * @param feeIncrementBps - Fee increment bps
 * @param maxLimiterDuration - Max limiter duration
 * @param referenceAmount - Reference amount
 * @param collectFeeMode - Collect fee mode
 * @param activationType - Activation type (slot or timestamp)
 * @returns Validation result
 */
export function validateFeeRateLimiter(
  cliffFeeNumerator: BN,
  feeIncrementBps: number,
  maxFeeBps: number,
  maxLimiterDuration: number,
  referenceAmount: BN,
  collectFeeMode: CollectFeeMode,
  activationType: ActivationType,
  feeVersion: number,
): boolean {
  // can only be applied in OnlyB collect fee mode
  if (collectFeeMode !== CollectFeeMode.OnlyB) {
    throw new InvalidFeeRateLimiterError(
      "Rate limiter can only be applied in OnlyB collect fee mode",
    );
  }

  // max_fee_numerator_from_bps = to_numerator(maxFeeBps, FEE_DENOMINATOR)
  const maxFeeNumeratorFromBps = toNumerator(
    new BN(maxFeeBps),
    new BN(FEE_DENOMINATOR),
  );

  // cliff_fee_numerator >= MIN_FEE_NUMERATOR && cliff_fee_numerator <= max_fee_numerator_from_bps
  if (
    cliffFeeNumerator.lt(new BN(MIN_FEE_NUMERATOR)) ||
    cliffFeeNumerator.gt(maxFeeNumeratorFromBps)
  ) {
    throw new InvalidFeeRateLimiterError(
      "cliffFeeNumerator out of valid range",
    );
  }

  // is_zero_rate_limiter
  if (
    isZeroRateLimiter(
      referenceAmount,
      maxLimiterDuration,
      maxFeeBps,
      feeIncrementBps,
    )
  ) {
    return true;
  }

  if (
    !isNonZeroRateLimiter(
      referenceAmount,
      maxLimiterDuration,
      maxFeeBps,
      feeIncrementBps,
    )
  ) {
    throw new InvalidFeeRateLimiterError();
  }

  // max_limiter_duration = match activation_type
  const maxLimiterDurationLimit =
    activationType === ActivationType.Slot
      ? new BN(MAX_RATE_LIMITER_DURATION_IN_SLOTS)
      : new BN(MAX_RATE_LIMITER_DURATION_IN_SECONDS);

  if (new BN(maxLimiterDuration).gt(maxLimiterDurationLimit)) {
    throw new InvalidFeeRateLimiterError(
      "maxLimiterDuration exceeds limit for activation type",
    );
  }

  // fee_increment_numerator = to_numerator(feeIncrementBps, FEE_DENOMINATOR)
  const feeIncrementNumerator = toNumerator(
    new BN(feeIncrementBps),
    new BN(FEE_DENOMINATOR),
  );
  if (feeIncrementNumerator.gte(new BN(FEE_DENOMINATOR))) {
    throw new InvalidFeeRateLimiterError(
      "feeIncrementNumerator must be less than FEE_DENOMINATOR",
    );
  }

  if (maxFeeBps > getMaxFeeBps(feeVersion)) {
    throw new ExceedMaxFeeBpsError();
  }

  // validate max fee (more amount, then more fee)
  const minFeeNumerator = getFeeNumeratorFromIncludedFeeAmount(
    new BN(0),
    cliffFeeNumerator,
    referenceAmount,
    maxFeeBps,
    feeIncrementBps,
  );
  const maxFeeNumeratorFromAmount = getFeeNumeratorFromIncludedFeeAmount(
    U64_MAX,
    cliffFeeNumerator,
    referenceAmount,
    maxFeeBps,
    feeIncrementBps,
  );

  if (
    minFeeNumerator.lt(new BN(MIN_FEE_NUMERATOR)) ||
    maxFeeNumeratorFromAmount.gt(getMaxFeeNumerator(feeVersion))
  ) {
    throw new InvalidFeeRateLimiterError("Fee numerator out of valid range");
  }

  return true;
}

/**
 * Validates whether the rate limiter base fee is static based on the current and activation points, as well as the maxLimiterDuration and referenceAmount.
 * @param currentPoint - The current point as BN.
 * @param activationPoint - The activation point as BN.
 * @param maxLimiterDuration - The max limiter duration as number.
 * @param referenceAmount - The reference amount as BN.
 * @param maxFeeBps - The max fee in basis points as number.
 * @param feeIncrementBps - The fee increment in basis points as number.
 * @returns True if the base fee is static, otherwise false.
 */
export function validateFeeRateLimiterBaseFeeIsStatic(
  currentPoint: BN,
  activationPoint: BN,
  maxLimiterDuration: number,
  referenceAmount: BN,
  maxFeeBps: number,
  feeIncrementBps: number,
): boolean {
  // if the rate limiter is zero, return true
  if (
    isZeroRateLimiter(
      referenceAmount,
      maxLimiterDuration,
      maxFeeBps,
      feeIncrementBps,
    )
  ) {
    return true;
  }

  // last_effective_rate_limiter_point = activationPoint + maxLimiterDuration
  const lastEffectiveRateLimiterPoint = activationPoint.add(
    new BN(maxLimiterDuration),
  );

  return currentPoint.gt(lastEffectiveRateLimiterPoint);
}

/**
 * Validates that the fee fraction is valid (numerator < denominator, denominator != 0)
 * @param numerator - The numerator of the fee fraction
 * @param denominator - The denominator of the fee fraction
 * @throws Error if the fee fraction is invalid
 */
export function validateFeeFraction(numerator: BN, denominator: BN): void {
  if (denominator.isZero() || numerator.gte(denominator)) {
    throw new InvalidFeeError();
  }
}

/**
 * Validates that collectFeeMode is a valid enum value.
 * @param collectFeeMode - The collect fee mode value.
 * @throws Error if the collect fee mode is invalid.
 */
export function validateCollectFeeMode(collectFeeMode: number): void {
  const allowed = [
    CollectFeeMode.BothToken,
    CollectFeeMode.OnlyB,
    CollectFeeMode.Compounding,
  ];
  if (!allowed.includes(collectFeeMode)) {
    throw new InvalidCollectFeeModeError();
  }
}

/**
 * Validates that activationType is a valid enum value.
 * @param activationType - The activation type value.
 * @throws Error if the activation type is invalid.
 */
export function validateActivationType(activationType: number): void {
  const allowed = [ActivationType.Timestamp, ActivationType.Slot];
  if (!allowed.includes(activationType)) {
    throw new InvalidActivationTypeError();
  }
}

/**
 * Validates the price range for non-compounding pools.
 * Compounding pools skip this check (they use the full range).
 * @param collectFeeMode - The collect fee mode.
 * @param sqrtMinPrice - The minimum sqrt price.
 * @param sqrtMaxPrice - The maximum sqrt price.
 * @throws Error if the price range is invalid.
 */
export function validatePriceRange(
  collectFeeMode: CollectFeeMode,
  sqrtMinPrice: BN,
  sqrtMaxPrice: BN,
): void {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    return;
  }

  if (sqrtMinPrice.lt(MIN_SQRT_PRICE) || sqrtMaxPrice.gt(MAX_SQRT_PRICE)) {
    throw new InvalidPriceRangeError();
  }

  if (sqrtMinPrice.gte(sqrtMaxPrice)) {
    throw new InvalidPriceRangeError();
  }
}

/**
 * Validates the initial sqrt price based on collect fee mode.
 * - Compounding: initSqrtPrice must be within [MIN_SQRT_PRICE, MAX_SQRT_PRICE].
 * - Non-compounding: initSqrtPrice must be within [sqrtMinPrice, sqrtMaxPrice].
 * @param collectFeeMode - The collect fee mode.
 * @param initSqrtPrice - The initial sqrt price.
 * @param sqrtMinPrice - The minimum sqrt price.
 * @param sqrtMaxPrice - The maximum sqrt price.
 * @throws Error if the initial sqrt price is invalid.
 */
export function validateInitialSqrtPrice(
  collectFeeMode: CollectFeeMode,
  initSqrtPrice: BN,
  sqrtMinPrice: BN,
  sqrtMaxPrice: BN,
): void {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    if (initSqrtPrice.lt(MIN_SQRT_PRICE) || initSqrtPrice.gt(MAX_SQRT_PRICE)) {
      throw new InvalidPriceRangeError();
    }
  } else {
    if (initSqrtPrice.lt(sqrtMinPrice) || initSqrtPrice.gt(sqrtMaxPrice)) {
      throw new InvalidPriceRangeError();
    }
  }
}

/**
 * Validates the compounding fee BPS based on collect fee mode.
 * - Compounding pools must have compoundingFeeBps > 0 and <= BASIS_POINT_MAX.
 * - Non-compounding pools must have compoundingFeeBps == 0.
 * @param collectFeeMode - The collect fee mode.
 * @param compoundingFeeBps - The compounding fee in basis points.
 * @throws Error if the compounding fee is invalid.
 */
export function validateCompoundingFee(
  collectFeeMode: CollectFeeMode,
  compoundingFeeBps: number,
): void {
  if (collectFeeMode === CollectFeeMode.Compounding) {
    if (compoundingFeeBps <= 0 || compoundingFeeBps > BASIS_POINT_MAX) {
      throw new InvalidCompoundingFeeBpsError();
    }
  } else {
    if (compoundingFeeBps !== 0) {
      throw new InvalidCompoundingFeeBpsError();
    }
  }
}

/**
 * Validates dynamic fee parameters, mirroring the on-chain DynamicFeeParameters::validate().
 * @param dynamicFee - The dynamic fee parameters.
 * @throws Error if any dynamic fee parameter is invalid.
 */
export function validateDynamicFee(dynamicFee: DynamicFee): void {
  if (dynamicFee.binStep !== BIN_STEP_BPS_DEFAULT) {
    throw new InvalidDynamicFeeParametersError();
  }

  if (!dynamicFee.binStepU128.eq(BIN_STEP_BPS_U128_DEFAULT)) {
    throw new InvalidDynamicFeeParametersError();
  }

  if (dynamicFee.filterPeriod >= dynamicFee.decayPeriod) {
    throw new InvalidDynamicFeeParametersError();
  }

  if (dynamicFee.reductionFactor > BASIS_POINT_MAX) {
    throw new InvalidDynamicFeeParametersError();
  }

  if (dynamicFee.variableFeeControl > U24_MAX) {
    throw new InvalidDynamicFeeParametersError();
  }

  if (dynamicFee.maxVolatilityAccumulator > U24_MAX) {
    throw new InvalidDynamicFeeParametersError();
  }
}

/**
 * Validates all pool fee parameters (compounding fee, base fee, and dynamic fee).
 * Mirrors the on-chain PoolFeeParameters::validate().
 * @param poolFees - The pool fees parameters.
 * @param collectFeeMode - The collect fee mode.
 * @param activationType - The activation type.
 * @param feeVersion - The fee version (defaults to CURRENT_POOL_VERSION).
 * @throws Error if any pool fee parameter is invalid.
 */
export function validatePoolFees(
  poolFees: PoolFeesParams,
  collectFeeMode: CollectFeeMode,
  activationType: ActivationType,
  feeVersion: number = CURRENT_POOL_VERSION,
): void {
  validateCompoundingFee(collectFeeMode, poolFees.compoundingFeeBps);

  const baseFeeHandler = getBaseFeeHandlerFromBorshData(poolFees.baseFee.data);
  baseFeeHandler.validate(collectFeeMode, activationType, feeVersion);

  if (poolFees.dynamicFee) {
    validateDynamicFee(poolFees.dynamicFee);
  }
}

/**
 * Validates all parameters for customizable pool creation, mirroring
 * the on-chain InitializeCustomizablePoolParameters::validate().
 * Call this before sending pool creation transactions to surface invalid
 * configurations early with descriptive errors.
 * @throws Error if any parameter is invalid.
 */
export function validateCustomizablePoolParams(params: {
  collectFeeMode: number;
  activationType: number;
  sqrtMinPrice: BN;
  sqrtMaxPrice: BN;
  initSqrtPrice: BN;
  liquidityDelta: BN;
  tokenAAmount: BN;
  tokenBAmount: BN;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  poolFees: PoolFeesParams;
}): void {
  const {
    collectFeeMode,
    activationType,
    sqrtMinPrice,
    sqrtMaxPrice,
    initSqrtPrice,
    liquidityDelta,
    tokenAAmount,
    tokenBAmount,
    tokenAMint,
    tokenBMint,
    poolFees,
  } = params;

  validateTokenMints(tokenAMint, tokenBMint);
  validateActivationType(activationType);
  validateCollectFeeMode(collectFeeMode);

  const cfm = collectFeeMode as CollectFeeMode;
  const at = activationType as ActivationType;

  validatePriceRange(cfm, sqrtMinPrice, sqrtMaxPrice);
  validateInitialSqrtPrice(cfm, initSqrtPrice, sqrtMinPrice, sqrtMaxPrice);

  if (liquidityDelta.lte(new BN(0))) {
    throw new InvalidMinimumLiquidityError();
  }

  if (cfm === CollectFeeMode.Compounding) {
    if (liquidityDelta.lte(DEAD_LIQUIDITY)) {
      throw new InvalidMinimumLiquidityError(
        "Compounding pool liquidity must be greater than DEAD_LIQUIDITY",
      );
    }
  }

  if (tokenAAmount.lte(new BN(0)) && tokenBAmount.lte(new BN(0))) {
    throw new AmountIsZeroError();
  }

  validatePoolFees(poolFees, cfm, at);
}

/**
 * Validates that tokenAMint and tokenBMint are different.
 * @param tokenAMint - Token A mint address.
 * @param tokenBMint - Token B mint address.
 * @throws SameTokenMintsError if the mints are identical.
 */
export function validateTokenMints(
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
): void {
  if (tokenAMint.equals(tokenBMint)) {
    throw new SameTokenMintsError();
  }
}

/**
 * Validates basic pool creation parameters for static-config pools.
 * @throws Error if any parameter is invalid.
 */
export function validateCreatePoolParams(params: {
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  liquidityDelta: BN;
  tokenAAmount: BN;
  tokenBAmount: BN;
}): void {
  const { tokenAMint, tokenBMint, liquidityDelta, tokenAAmount, tokenBAmount } =
    params;

  validateTokenMints(tokenAMint, tokenBMint);

  if (liquidityDelta.lte(new BN(0))) {
    throw new InvalidMinimumLiquidityError();
  }

  if (tokenAAmount.lte(new BN(0)) && tokenBAmount.lte(new BN(0))) {
    throw new AmountIsZeroError();
  }
}

/**
 * Validates addLiquidity parameters.
 * @throws InvalidParametersError if liquidityDelta is not positive.
 */
export function validateAddLiquidityParams(liquidityDelta: BN): void {
  if (liquidityDelta.lte(new BN(0))) {
    throw new InvalidParametersError("liquidityDelta must be greater than 0");
  }
}

/**
 * Validates removeLiquidity parameters.
 * @throws InvalidParametersError if liquidityDelta is not positive.
 */
export function validateRemoveLiquidityParams(liquidityDelta: BN): void {
  if (liquidityDelta.lte(new BN(0))) {
    throw new InvalidParametersError("liquidityDelta must be greater than 0");
  }
}

/**
 * Validates split position parameters (v1 percentage-based).
 * Each percentage must be <= 100, and at least one must be > 0.
 * @throws InvalidSplitPositionParametersError if any percentage is invalid.
 */
export function validateSplitPositionParams(params: {
  permanentLockedLiquidityPercentage: number;
  unlockedLiquidityPercentage: number;
  feeAPercentage: number;
  feeBPercentage: number;
  reward0Percentage: number;
  reward1Percentage: number;
  innerVestingLiquidityPercentage: number;
}): void {
  const {
    permanentLockedLiquidityPercentage,
    unlockedLiquidityPercentage,
    feeAPercentage,
    feeBPercentage,
    reward0Percentage,
    reward1Percentage,
    innerVestingLiquidityPercentage,
  } = params;

  const percentages = [
    permanentLockedLiquidityPercentage,
    unlockedLiquidityPercentage,
    feeAPercentage,
    feeBPercentage,
    reward0Percentage,
    reward1Percentage,
    innerVestingLiquidityPercentage,
  ];

  for (const pct of percentages) {
    if (pct > 100 || pct < 0) {
      throw new InvalidSplitPositionParametersError(
        "Each percentage must be <= 100",
      );
    }
  }

  if (percentages.every((pct) => pct === 0)) {
    throw new InvalidSplitPositionParametersError(
      "At least one percentage must be greater than 0",
    );
  }
}

/**
 * Validates split position 2 parameters (numerator-based).
 * The numerator must be > 0 and <= SPLIT_POSITION_DENOMINATOR.
 * @throws InvalidSplitPositionParametersError if numerator is invalid.
 */
export function validateSplitPosition2Params(numerator: number): void {
  if (numerator <= 0 || numerator > SPLIT_POSITION_DENOMINATOR) {
    throw new InvalidSplitPositionParametersError(
      `numerator must be in (0, ${SPLIT_POSITION_DENOMINATOR}]`,
    );
  }
}

/**
 * Validates lock position vesting parameters (non-time-dependent checks).
 * @throws InvalidVestingInfoError if any parameter is invalid.
 */
export function validateLockPositionParams(params: {
  numberOfPeriod: number;
  periodFrequency: BN;
  cliffUnlockLiquidity: BN;
  liquidityPerPeriod: BN;
}): void {
  const {
    numberOfPeriod,
    periodFrequency,
    cliffUnlockLiquidity,
    liquidityPerPeriod,
  } = params;

  if (numberOfPeriod < 0) {
    throw new InvalidVestingInfoError("numberOfPeriod must be >= 0");
  }

  if (numberOfPeriod > 0) {
    if (periodFrequency.lte(new BN(0)) || liquidityPerPeriod.lte(new BN(0))) {
      throw new InvalidVestingInfoError(
        "periodFrequency and liquidityPerPeriod must be greater than 0 when numberOfPeriod > 0",
      );
    }
  }

  const totalLockAmount = cliffUnlockLiquidity.add(
    liquidityPerPeriod.muln(numberOfPeriod),
  );
  if (totalLockAmount.lte(new BN(0))) {
    throw new InvalidVestingInfoError(
      "Total lock amount must be greater than 0",
    );
  }
}

/**
 * Validates a reward index is within bounds.
 * @throws InvalidRewardIndexError if index >= NUM_REWARDS.
 */
export function validateRewardIndex(rewardIndex: number): void {
  if (rewardIndex < 0 || rewardIndex >= NUM_REWARDS) {
    throw new InvalidRewardIndexError(
      `rewardIndex must be in [0, ${NUM_REWARDS})`,
    );
  }
}

/**
 * Validates a reward duration is within the allowed range.
 * @throws InvalidRewardDurationError if duration is out of range.
 */
export function validateRewardDuration(rewardDuration: BN): void {
  if (
    rewardDuration.lt(new BN(MIN_REWARD_DURATION)) ||
    rewardDuration.gt(new BN(MAX_REWARD_DURATION))
  ) {
    throw new InvalidRewardDurationError(
      `rewardDuration must be between ${MIN_REWARD_DURATION} and ${MAX_REWARD_DURATION} seconds`,
    );
  }
}
