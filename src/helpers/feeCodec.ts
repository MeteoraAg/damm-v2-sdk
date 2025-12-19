import BN from "bn.js";
import {
  BaseFeeMode,
  BorshFeeMarketCapScheduler,
  BorshFeeRateLimiter,
  BorshFeeTimeScheduler,
  PodAlignedFeeMarketCapScheduler,
  PodAlignedFeeRateLimiter,
  PodAlignedFeeTimeScheduler,
} from "../types";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import CpAmmIDL from "../idl/cp_amm.json";
import { FEE_PADDING } from "../constants";

export const cpAmmCoder = new BorshCoder(CpAmmIDL as Idl);

export function encodeFeeTimeSchedulerParams(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  periodFrequency: BN,
  reductionFactor: BN,
  baseFeeMode: BaseFeeMode
): Buffer {
  const feeTimeScheduler = {
    cliff_fee_numerator: new BN(cliffFeeNumerator.toString()),
    number_of_period: numberOfPeriod,
    period_frequency: new BN(periodFrequency.toString()),
    reduction_factor: new BN(reductionFactor.toString()),
    base_fee_mode: baseFeeMode,
    padding: FEE_PADDING,
  };

  return cpAmmCoder.types.encode("BorshFeeTimeScheduler", feeTimeScheduler);
}

export function decodeFeeTimeSchedulerParams(
  data: Buffer
): BorshFeeTimeScheduler {
  const decoded = cpAmmCoder.types.decode("BorshFeeTimeScheduler", data);
  return {
    cliffFeeNumerator: decoded.cliff_fee_numerator,
    numberOfPeriod: decoded.number_of_period,
    periodFrequency: decoded.period_frequency,
    reductionFactor: decoded.reduction_factor,
    baseFeeMode: decoded.base_fee_mode,
    padding: decoded.padding,
  };
}

export function decodePodAlignedFeeTimeScheduler(
  data: Buffer
): PodAlignedFeeTimeScheduler {
  const decoded = cpAmmCoder.types.decode("PodAlignedFeeTimeScheduler", data);
  return {
    cliffFeeNumerator: decoded.cliff_fee_numerator,
    numberOfPeriod: decoded.number_of_period,
    periodFrequency: decoded.period_frequency,
    reductionFactor: decoded.reduction_factor,
    baseFeeMode: decoded.base_fee_mode,
    padding: decoded.padding,
  };
}

export function encodeFeeMarketCapSchedulerParams(
  cliffFeeNumerator: BN,
  numberOfPeriod: number,
  sqrtPriceStepBps: number,
  schedulerExpirationDuration: number,
  reductionFactor: BN,
  baseFeeMode: BaseFeeMode
): Buffer {
  const feeMarketCapScheduler = {
    cliff_fee_numerator: new BN(cliffFeeNumerator.toString()),
    number_of_period: numberOfPeriod,
    sqrt_price_step_bps: sqrtPriceStepBps,
    scheduler_expiration_duration: schedulerExpirationDuration,
    reduction_factor: new BN(reductionFactor.toString()),
    base_fee_mode: baseFeeMode,
    padding: FEE_PADDING,
  };

  return cpAmmCoder.types.encode(
    "BorshFeeMarketCapScheduler",
    feeMarketCapScheduler
  );
}

export function decodeFeeMarketCapSchedulerParams(
  data: Buffer
): BorshFeeMarketCapScheduler {
  const decoded = cpAmmCoder.types.decode("BorshFeeMarketCapScheduler", data);
  return {
    cliffFeeNumerator: decoded.cliff_fee_numerator,
    numberOfPeriod: decoded.number_of_period,
    sqrtPriceStepBps: decoded.sqrt_price_step_bps,
    schedulerExpirationDuration: decoded.scheduler_expiration_duration,
    reductionFactor: decoded.reduction_factor,
    baseFeeMode: decoded.base_fee_mode,
    padding: decoded.padding,
  };
}

export function decodePodAlignedFeeMarketCapScheduler(
  data: Buffer
): PodAlignedFeeMarketCapScheduler {
  const decoded = cpAmmCoder.types.decode(
    "PodAlignedFeeMarketCapScheduler",
    data
  );
  return {
    cliffFeeNumerator: decoded.cliff_fee_numerator,
    numberOfPeriod: decoded.number_of_period,
    sqrtPriceStepBps: decoded.sqrt_price_step_bps,
    schedulerExpirationDuration: decoded.scheduler_expiration_duration,
    reductionFactor: decoded.reduction_factor,
    baseFeeMode: decoded.base_fee_mode,
    padding: decoded.padding,
  };
}

export function encodeFeeRateLimiterParams(
  cliffFeeNumerator: BN,
  feeIncrementBps: number,
  maxLimiterDuration: number,
  maxFeeBps: number,
  referenceAmount: BN
): Buffer {
  const feeRateLimiter = {
    cliff_fee_numerator: new BN(cliffFeeNumerator.toString()),
    fee_increment_bps: feeIncrementBps,
    max_limiter_duration: maxLimiterDuration,
    max_fee_bps: maxFeeBps,
    reference_amount: new BN(referenceAmount.toString()),
    base_fee_mode: BaseFeeMode.RateLimiter,
    padding: FEE_PADDING,
  };

  return cpAmmCoder.types.encode("BorshFeeRateLimiter", feeRateLimiter);
}

export function decodeFeeRateLimiterParams(data: Buffer): BorshFeeRateLimiter {
  const decoded = cpAmmCoder.types.decode("BorshFeeRateLimiter", data);
  return {
    cliffFeeNumerator: decoded.cliff_fee_numerator,
    feeIncrementBps: decoded.fee_increment_bps,
    maxLimiterDuration: decoded.max_limiter_duration,
    maxFeeBps: decoded.max_fee_bps,
    referenceAmount: decoded.reference_amount,
    baseFeeMode: decoded.base_fee_mode,
    padding: decoded.padding,
  };
}

export function decodePodAlignedFeeRateLimiter(
  data: Buffer
): PodAlignedFeeRateLimiter {
  const decoded = cpAmmCoder.types.decode("PodAlignedFeeRateLimiter", data);
  return {
    cliffFeeNumerator: decoded.cliff_fee_numerator,
    feeIncrementBps: decoded.fee_increment_bps,
    maxLimiterDuration: decoded.max_limiter_duration,
    maxFeeBps: decoded.max_fee_bps,
    referenceAmount: decoded.reference_amount,
    baseFeeMode: decoded.base_fee_mode,
    padding: decoded.padding,
  };
}
