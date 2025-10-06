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
  U64_MAX,
} from "../constants";
import { mulDiv, pow } from "./utilsMath";
import {
  CollectFeeMode,
  FeeMode,
  FeeOnAmountResult,
  PoolFeesStruct,
  PoolVersion,
  Rounding,
  SplitFees,
  TradeDirection,
} from "../types";
import { getBaseFeeHandler, getDynamicFeeNumerator } from "./poolFees";

/**
 * Converts basis points to a numerator
 * @param bps - The basis points
 * @param feeDenominator - The fee denominator
 * @returns The numerator
 */
export function toNumerator(bps: BN, feeDenominator: BN): BN {
  try {
    const numerator = mulDiv(
      bps,
      feeDenominator,
      new BN(BASIS_POINT_MAX),
      Rounding.Down
    );
    return numerator;
  } catch (error) {
    throw new Error("Type cast failed or calculation overflow in toNumerator");
  }
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
  passedPeriod: number
): BN {
  if (reductionFactor.isZero()) {
    return cliffFeeNumerator;
  }

  // Make bin_step into Q64x64, and divided by BASIS_POINT_MAX. If bin_step = 1, we get 0.0001 in Q64x64
  const bps = reductionFactor.shln(SCALE_OFFSET).div(new BN(BASIS_POINT_MAX));
  const base = ONE_Q64.sub(bps);
  const result = pow(base, new BN(passedPeriod));

  if (result.gt(U128_MAX)) {
    throw new Error("Math overflow");
  }

  const fee = result.mul(cliffFeeNumerator).shrn(SCALE_OFFSET);

  if (fee.gt(U64_MAX)) {
    throw new Error("Type cast failed: fee does not fit in u64");
  }

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
  hasReferral: boolean
): FeeMode {
  // (CollectFeeMode::BothToken, TradeDirection::AToB) => (false, false)
  // (CollectFeeMode::BothToken, TradeDirection::BtoA) => (false, true)
  // (CollectFeeMode::OnlyB, TradeDirection::AtoB) => (false, false)
  // (CollectFeeMode::OnlyB, TradeDirection::BtoA) => (true, false)

  let feesOnInput: boolean;
  let feesOnTokenA: boolean;

  if (collectFeeMode === CollectFeeMode.BothToken) {
    if (tradeDirection === TradeDirection.AtoB) {
      feesOnInput = false;
      feesOnTokenA = false;
    } else {
      // TradeDirection::BtoA
      feesOnInput = false;
      feesOnTokenA = true;
    }
  } else {
    // CollectFeeMode::OnlyB
    if (tradeDirection === TradeDirection.AtoB) {
      feesOnInput = false;
      feesOnTokenA = false;
    } else {
      // TradeDirection::BtoA
      feesOnInput = true;
      feesOnTokenA = false;
    }
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
  maxFeeNumerator: BN
): BN {
  const dynamicFeeNumerator = getDynamicFeeNumerator(
    poolFees.dynamicFee.volatilityAccumulator,
    new BN(poolFees.dynamicFee.binStep),
    new BN(poolFees.dynamicFee.variableFeeControl)
  );

  const totalFeeNumerator = dynamicFeeNumerator.add(baseFeeNumerator);

  if (totalFeeNumerator.gt(U64_MAX)) {
    throw new Error("Type cast failed: fee does not fit in u64");
  }

  if (totalFeeNumerator.gt(maxFeeNumerator)) {
    return maxFeeNumerator;
  } else {
    return totalFeeNumerator;
  }
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
  maxFeeNumerator: BN
): BN {
  const baseFeeHandler = getBaseFeeHandler(
    poolFees.baseFee.cliffFeeNumerator,
    poolFees.baseFee.firstFactor,
    poolFees.baseFee.secondFactor,
    poolFees.baseFee.thirdFactor,
    poolFees.baseFee.baseFeeMode
  );

  // get the base fee numerator from the included fee amount
  const baseFeeNumerator =
    baseFeeHandler.getBaseFeeNumeratorFromIncludedFeeAmount(
      currentPoint,
      activationPoint,
      tradeDirection,
      includedFeeAmount
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
  maxFeeNumerator: BN
): BN {
  const baseFeeHandler = getBaseFeeHandler(
    poolFees.baseFee.cliffFeeNumerator,
    poolFees.baseFee.firstFactor,
    poolFees.baseFee.secondFactor,
    poolFees.baseFee.thirdFactor,
    poolFees.baseFee.baseFeeMode
  );

  // get the base fee numerator from the excluded fee amount
  const baseFeeNumerator =
    baseFeeHandler.getBaseFeeNumeratorFromExcludedFeeAmount(
      currentPoint,
      activationPoint,
      tradeDirection,
      excludedFeeAmount
    );

  // get the total fee numerator, capped at maxFeeNumerator
  return getTotalFeeNumerator(poolFees, baseFeeNumerator, maxFeeNumerator);
}

/**
 * Splits the fees
 * @param poolFees - The pool fees
 * @param feeAmount - The fee amount
 * @param hasReferral - The has referral
 * @param hasPartner - The has partner
 * @returns The split fees
 */
export function splitFees(
  poolFees: PoolFeesStruct,
  feeAmount: BN,
  hasReferral: boolean,
  hasPartner: boolean
): SplitFees {
  // protocol_fee = feeAmount * protocol_fee_percent / 100 (rounded down)
  const protocolFee = feeAmount.muln(poolFees.protocolFeePercent).divn(100);

  // trading_fee = feeAmount - protocol_fee
  const tradingFee = feeAmount.sub(protocolFee);

  // referral_fee = protocol_fee * referral_fee_percent / 100 (rounded down) if hasReferral else 0
  let referralFee = new BN(0);
  if (hasReferral) {
    referralFee = protocolFee.muln(poolFees.referralFeePercent).divn(100);
  }

  // protocol_fee_after_referral_fee = protocol_fee - referral_fee
  const protocolFeeAfterReferral = protocolFee.sub(referralFee);

  // partner_fee = protocol_fee_after_referral_fee * partner_fee_percent / 100 (rounded down) if hasPartner && partner_fee_percent > 0 else 0
  let partnerFee = new BN(0);
  if (hasPartner && poolFees.partnerFeePercent > 0) {
    partnerFee = protocolFeeAfterReferral
      .muln(poolFees.partnerFeePercent)
      .divn(100);
  }

  // protocol_fee = protocol_fee_after_referral_fee - partner_fee
  const finalProtocolFee = protocolFeeAfterReferral.sub(partnerFee);

  return {
    tradingFee,
    protocolFee: finalProtocolFee,
    referralFee,
    partnerFee,
  };
}

/**
 * Gets the fee on amount
 * @param poolFees - The pool fees
 * @param amount - The amount
 * @param tradeFeeNumerator - The trade fee numerator
 * @param hasReferral - The has referral
 * @param hasPartner - The has partner
 * @returns The fee on amount result
 */
export function getFeeOnAmount(
  poolFees: PoolFeesStruct,
  amount: BN,
  tradeFeeNumerator: BN,
  hasReferral: boolean,
  hasPartner: boolean
): FeeOnAmountResult {
  // get the amount and trading fee after excluding the fee from the amount
  const { excludedFeeAmount, tradingFee } = getExcludedFeeAmount(
    tradeFeeNumerator,
    amount
  );

  // split the trading fee into protocol, referral, and partner fees
  const splitFeesResult = splitFees(
    poolFees,
    tradingFee,
    hasReferral,
    hasPartner
  );

  return {
    amount: excludedFeeAmount,
    tradingFee: splitFeesResult.tradingFee,
    protocolFee: splitFeesResult.protocolFee,
    partnerFee: splitFeesResult.partnerFee,
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
  includedFeeAmount: BN
): { excludedFeeAmount: BN; tradingFee: BN } {
  const tradingFee = mulDiv(
    includedFeeAmount,
    tradeFeeNumerator,
    new BN(FEE_DENOMINATOR),
    Rounding.Up
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
  excludedFeeAmount: BN
): { includedFeeAmount: BN; feeAmount: BN } {
  const denominator = new BN(FEE_DENOMINATOR).sub(tradeFeeNumerator);
  if (denominator.isZero() || denominator.isNeg()) {
    throw new Error("Invalid fee numerator");
  }

  const includedFeeAmount = mulDiv(
    excludedFeeAmount,
    new BN(FEE_DENOMINATOR),
    denominator,
    Rounding.Up
  );

  const feeAmount = includedFeeAmount.sub(excludedFeeAmount);

  return { includedFeeAmount, feeAmount };
}

/**
 * Gets the max fee numerator
 * @param poolVersion - The pool version
 * @returns The max fee numerator
 */
export function getMaxFeeNumerator(poolVersion: PoolVersion): BN {
  switch (poolVersion) {
    case PoolVersion.V0:
      return new BN(MAX_FEE_NUMERATOR_V0);
    case PoolVersion.V1:
      return new BN(MAX_FEE_NUMERATOR_V1);
    default:
      throw new Error("Invalid pool version");
  }
}

/**
 * Gets the max fee bps
 * @param poolVersion - The pool version
 * @returns The max fee bps
 */
export function getMaxFeeBps(poolVersion: PoolVersion): number {
  switch (poolVersion) {
    case PoolVersion.V0:
      return MAX_FEE_BPS_V0;
    case PoolVersion.V1:
      return MAX_FEE_BPS_V1;
    default:
      throw new Error("Invalid pool version");
  }
}
