import { BN } from "@coral-xyz/anchor";
import {
  BASIS_POINT_MAX,
  FEE_DENOMINATOR,
  MAX_FEE_BPS_V0,
  MAX_FEE_BPS_V1,
  MAX_FEE_NUMERATOR_V0,
  MAX_FEE_NUMERATOR_V1,
  ONE_Q64,
  SCALE_OFFSET,
  U128_MAX,
} from "../constants";
import { mulDiv, pow } from "./utilsMath";
import {
  CollectFeeMode,
  FeeMode,
  FeeOnAmountResult,
  PoolFeesStruct,
  Rounding,
  SplitFees,
  TradeDirection,
} from "../types";
import {
  getBaseFeeHandlerFromPodAlignedData,
  getDynamicFeeNumerator,
} from "./poolFees";
import {
  InvalidCollectFeeModeError,
  InvalidFeeError,
  InvalidPoolVersionError,
  MathOverflowError,
} from "../errors";

/**
 * Converts basis points to a numerator
 * @param bps - The basis points
 * @param feeDenominator - The fee denominator
 * @returns The numerator
 */
export function toNumerator(bps: BN, feeDenominator: BN): BN {
  const numerator = mulDiv(
    bps,
    feeDenominator,
    new BN(BASIS_POINT_MAX),
    Rounding.Down,
  );
  return numerator;
}

/**
 * Gets the fee in a period
 * @param cliffFeeNumerator - The cliff fee numerator
 * @param reductionFactor - The reduction factor
 * @param passedPeriod - The passed period
 * @returns The fee in a period
 */
export function getFeeInPeriod(
  cliffFeeNumerator: BN,
  reductionFactor: BN,
  passedPeriod: number,
): BN {
  if (reductionFactor.isZero()) {
    return cliffFeeNumerator;
  }

  // Make bin_step into Q64x64, and divided by BASIS_POINT_MAX. If bin_step = 1, we get 0.0001 in Q64x64
  const bps = reductionFactor.shln(SCALE_OFFSET).div(new BN(BASIS_POINT_MAX));
  const base = ONE_Q64.sub(bps);
  const result = pow(base, new BN(passedPeriod));

  if (result.gt(U128_MAX)) {
    throw new MathOverflowError();
  }

  const fee = result.mul(cliffFeeNumerator).shrn(SCALE_OFFSET);

  return fee;
}

/**
 * Gets the fee mode
 * @param collectFeeMode - The collect fee mode
 * @param tradeDirection - The trade direction
 * @param hasReferral - The has referral
 * @returns The fee mode
 */
export function getFeeMode(
  collectFeeMode: CollectFeeMode,
  tradeDirection: TradeDirection,
  hasReferral: boolean,
): FeeMode {
  let feesOnInput: boolean;
  let feesOnTokenA: boolean;

  switch (collectFeeMode) {
    case CollectFeeMode.BothToken:
      switch (tradeDirection) {
        case TradeDirection.AtoB:
          feesOnInput = false;
          feesOnTokenA = false;
          break;
        case TradeDirection.BtoA:
          feesOnInput = false;
          feesOnTokenA = true;
          break;
      }
      break;
    case CollectFeeMode.OnlyB:
      switch (tradeDirection) {
        case TradeDirection.AtoB:
          feesOnInput = false;
          feesOnTokenA = false;
          break;
        case TradeDirection.BtoA:
          feesOnInput = true;
          feesOnTokenA = false;
          break;
      }
      break;
    case CollectFeeMode.Compounding:
      switch (tradeDirection) {
        case TradeDirection.AtoB:
          feesOnInput = false;
          feesOnTokenA = false;
          break;
        case TradeDirection.BtoA:
          feesOnInput = true;
          feesOnTokenA = false;
          break;
      }
      break;
    default:
      throw new InvalidCollectFeeModeError();
  }

  return {
    feesOnInput,
    feesOnTokenA,
    hasReferral,
  };
}

/**
 * Gets the total fee numerator
 * @param poolFees - The pool fees
 * @param baseFeeNumerator - The base fee numerator
 * @param maxFeeNumerator - The max fee numerator
 * @returns The total fee numerator
 */
export function getTotalFeeNumerator(
  poolFees: PoolFeesStruct,
  baseFeeNumerator: BN,
  maxFeeNumerator: BN,
): BN {
  let dynamicFeeNumerator = new BN(0);

  if (poolFees.dynamicFee.initialized !== 0) {
    dynamicFeeNumerator = getDynamicFeeNumerator(
      poolFees.dynamicFee.volatilityAccumulator,
      new BN(poolFees.dynamicFee.binStep),
      new BN(poolFees.dynamicFee.variableFeeControl),
    );
  }

  const totalFeeNumerator = dynamicFeeNumerator.add(baseFeeNumerator);

  return BN.min(totalFeeNumerator, maxFeeNumerator);
}

/**
 * Gets the total trading fee from included fee amount
 * @param poolFees - The pool fees
 * @param currentPoint - The current point
 * @param activationPoint - The activation point
 * @param includedFeeAmount - The included fee amount
 * @param tradeDirection - The trade direction
 * @param maxFeeNumerator - The max fee numerator
 * @returns The total trading fee from included fee amount
 */
export function getTotalTradingFeeFromIncludedFeeAmount(
  poolFees: PoolFeesStruct,
  currentPoint: BN,
  activationPoint: BN,
  includedFeeAmount: BN,
  tradeDirection: TradeDirection,
  maxFeeNumerator: BN,
  initSqrtPrice: BN,
  currentSqrtPrice: BN,
): BN {
  const baseFeeHandler = getBaseFeeHandlerFromPodAlignedData(
    poolFees.baseFee.baseFeeInfo.data,
  );

  // get the base fee numerator from the included fee amount
  const baseFeeNumerator =
    baseFeeHandler.getBaseFeeNumeratorFromIncludedFeeAmount(
      currentPoint,
      activationPoint,
      tradeDirection,
      includedFeeAmount,
      initSqrtPrice,
      currentSqrtPrice,
    );

  // get the total fee numerator, capped at maxFeeNumerator
  return getTotalFeeNumerator(poolFees, baseFeeNumerator, maxFeeNumerator);
}

/**
 * Gets the total trading fee from excluded fee amount
 * @param poolFees - The pool fees
 * @param currentPoint - The current point
 * @param activationPoint - The activation point
 * @param excludedFeeAmount - The excluded fee amount
 * @param tradeDirection - The trade direction
 * @param maxFeeNumerator - The max fee numerator
 * @returns The total trading fee from excluded fee amount
 */
export function getTotalTradingFeeFromExcludedFeeAmount(
  poolFees: PoolFeesStruct,
  currentPoint: BN,
  activationPoint: BN,
  excludedFeeAmount: BN,
  tradeDirection: TradeDirection,
  maxFeeNumerator: BN,
  initSqrtPrice: BN,
  currentSqrtPrice: BN,
): BN {
  const baseFeeHandler = getBaseFeeHandlerFromPodAlignedData(
    poolFees.baseFee.baseFeeInfo.data,
  );

  // get the base fee numerator from the excluded fee amount
  const baseFeeNumerator =
    baseFeeHandler.getBaseFeeNumeratorFromExcludedFeeAmount(
      currentPoint,
      activationPoint,
      tradeDirection,
      excludedFeeAmount,
      initSqrtPrice,
      currentSqrtPrice,
    );

  // get the total fee numerator, capped at maxFeeNumerator
  return getTotalFeeNumerator(poolFees, baseFeeNumerator, maxFeeNumerator);
}

/**
 * Splits the fees into protocol, claiming, compounding, and referral portions.
 *
 *
 * @param poolFees - The pool fees
 * @param feeAmount - The fee amount
 * @param hasReferral - Whether a referral account is present
 * @returns The split fees
 */
export function splitFees(
  poolFees: PoolFeesStruct,
  feeAmount: BN,
  hasReferral: boolean,
): SplitFees {
  // protocol_fee = fee_amount * protocol_fee_percent / 100 (rounded down)
  let protocolFee = mulDiv(
    feeAmount,
    new BN(poolFees.protocolFeePercent),
    new BN(100),
    Rounding.Down,
  );

  // trading_fee = fee_amount - protocol_fee
  let tradingFee = feeAmount.sub(protocolFee);

  // compounding/claiming split from claiming_fee
  const compoundingFeeBps = new BN(poolFees.compoundingFeeBps);

  let compoundingFee: BN;
  let claimingFee: BN;
  if (compoundingFeeBps.gt(new BN(0))) {
    // compounding_fee = trading_fee * compounding_fee_bps / MAX_BASIS_POINT (rounded down)
    compoundingFee = mulDiv(
      tradingFee,
      compoundingFeeBps,
      new BN(BASIS_POINT_MAX),
      Rounding.Down,
    );
    // claiming_fee = trading_fee - compounding_fee
    claimingFee = tradingFee.sub(compoundingFee);
  } else {
    compoundingFee = new BN(0);
    claimingFee = tradingFee;
  }

  // referral_fee = protocol_fee * referral_fee_percent / 100 (rounded down)
  let referralFee: BN;
  if (hasReferral) {
    referralFee = mulDiv(
      protocolFee,
      new BN(poolFees.referralFeePercent),
      new BN(100),
      Rounding.Down,
    );
  } else {
    referralFee = new BN(0);
  }

  // protocol_fee = protocol_fee - referral_fee
  protocolFee = protocolFee.sub(referralFee);

  return {
    claimingFee,
    compoundingFee,
    protocolFee,
    referralFee,
  };
}

/**
 * Gets the fee on amount
 * @param poolFees - The pool fees
 * @param amount - The amount
 * @param tradeFeeNumerator - The trade fee numerator
 * @param hasReferral - Whether a referral account is present
 * @returns The fee on amount result
 */
export function getFeeOnAmount(
  poolFees: PoolFeesStruct,
  amount: BN,
  tradeFeeNumerator: BN,
  hasReferral: boolean,
): FeeOnAmountResult {
  const { excludedFeeAmount, tradingFee } = getExcludedFeeAmount(
    tradeFeeNumerator,
    amount,
  );

  const splitFeesResult = splitFees(poolFees, tradingFee, hasReferral);

  return {
    amount: excludedFeeAmount,
    claimingFee: splitFeesResult.claimingFee,
    compoundingFee: splitFeesResult.compoundingFee,
    protocolFee: splitFeesResult.protocolFee,
    referralFee: splitFeesResult.referralFee,
  };
}

/**
 * Calculates the excluded fee amount and trading fee from an included fee amount
 * @param tradeFeeNumerator - The fee numerator
 * @param includedFeeAmount - The amount that includes the fee
 * @returns Tuple of [excluded_fee_amount, trading_fee]
 */
export function getExcludedFeeAmount(
  tradeFeeNumerator: BN,
  includedFeeAmount: BN,
): { excludedFeeAmount: BN; tradingFee: BN } {
  const tradingFee = mulDiv(
    includedFeeAmount,
    tradeFeeNumerator,
    new BN(FEE_DENOMINATOR),
    Rounding.Up,
  );
  const excludedFeeAmount = includedFeeAmount.sub(tradingFee);

  return { excludedFeeAmount, tradingFee };
}

/**
 * Calculates the included fee amount and fee amount from an excluded fee amount
 * @param tradeFeeNumerator - The fee numerator
 * @param excludedFeeAmount - The amount that excludes the fee
 * @returns Tuple of [included_fee_amount, fee_amount]
 */
export function getIncludedFeeAmount(
  tradeFeeNumerator: BN,
  excludedFeeAmount: BN,
): { includedFeeAmount: BN; feeAmount: BN } {
  const denominator = new BN(FEE_DENOMINATOR).sub(tradeFeeNumerator);
  if (denominator.isZero() || denominator.isNeg()) {
    throw new InvalidFeeError("Fee denominator must be positive and non-zero");
  }

  const includedFeeAmount = mulDiv(
    excludedFeeAmount,
    new BN(FEE_DENOMINATOR),
    denominator,
    Rounding.Up,
  );

  const feeAmount = includedFeeAmount.sub(excludedFeeAmount);

  return { includedFeeAmount, feeAmount };
}

/**
 * Gets the max fee numerator
 * @param feeVersion - The fee version
 * @returns The max fee numerator
 */
export function getMaxFeeNumerator(feeVersion: number): BN {
  switch (feeVersion) {
    case 0:
      return new BN(MAX_FEE_NUMERATOR_V0);
    case 1:
      return new BN(MAX_FEE_NUMERATOR_V1);
    default:
      throw new InvalidPoolVersionError();
  }
}

/**
 * Gets the max fee bps
 * @param poolVersion - The pool version
 * @returns The max fee bps
 */
export function getMaxFeeBps(feeVersion: number): number {
  switch (feeVersion) {
    case 0:
      return MAX_FEE_BPS_V0;
    case 1:
      return MAX_FEE_BPS_V1;
    default:
      throw new InvalidPoolVersionError();
  }
}
