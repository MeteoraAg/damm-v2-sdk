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
  return cpAmmCoder.types.decode("BorshFeeTimeScheduler", data);
}

export function decodePodAlignedFeeTimeScheduler(
  data: Buffer
): PodAlignedFeeTimeScheduler {
  return cpAmmCoder.types.decode("PodAlignedFeeTimeScheduler", data);
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
  return cpAmmCoder.types.decode("BorshFeeMarketCapScheduler", data);
}

export function decodePodAlignedFeeMarketCapScheduler(
  data: Buffer
): PodAlignedFeeMarketCapScheduler {
  return cpAmmCoder.types.decode("PodAlignedFeeMarketCapScheduler", data);
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
  return cpAmmCoder.types.decode("BorshFeeRateLimiter", data);
}

export function decodePodAlignedFeeRateLimiter(
  data: Buffer
): PodAlignedFeeRateLimiter {
  return cpAmmCoder.types.decode("PodAlignedFeeRateLimiter", data);
}
