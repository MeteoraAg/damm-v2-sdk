import { BN } from "bn.js";
import {
  BaseFeeMode,
  BorshFeeMarketCapScheduler,
  BorshFeeRateLimiter,
  BorshFeeTimeScheduler,
  PodAlignedFeeMarketCapScheduler,
  PodAlignedFeeRateLimiter,
  PodAlignedFeeTimeScheduler,
} from "../types";
import { Program } from "@coral-xyz/anchor";
import { CpAmm } from "../idl/cp_amm";
import { FEE_PADDING } from "../constants";

export function encodeFeeTimeSchedulerParams(
  program: Program<CpAmm>,
  cliffFeeNumerator: bigint,
  numberOfPeriod: number,
  periodFrequency: bigint,
  reductionFactor: bigint,
  baseFeeMode:
    | BaseFeeMode.FeeTimeSchedulerLinear
    | BaseFeeMode.FeeTimeSchedulerExponential
): Buffer {
  const feeTimeScheduler: BorshFeeTimeScheduler = {
    cliffFeeNumerator: new BN(cliffFeeNumerator.toString()),
    numberOfPeriod,
    periodFrequency: new BN(periodFrequency.toString()),
    reductionFactor: new BN(reductionFactor.toString()),
    baseFeeMode,
    padding: FEE_PADDING,
  };

  return program.coder.types.encode("borshFeeTimeScheduler", feeTimeScheduler);
}

export function decodeFeeTimeSchedulerParams(
  program: Program<CpAmm>,
  data: Buffer
): BorshFeeTimeScheduler {
  return program.coder.types.decode("borshFeeTimeScheduler", data);
}

export function decodePodAlignedFeeTimeScheduler(
  program: Program<CpAmm>,
  data: Buffer
): PodAlignedFeeTimeScheduler {
  return program.coder.types.decode("podAlignedFeeTimeScheduler", data);
}

export function encodeFeeMarketCapSchedulerParams(
  program: Program<CpAmm>,
  cliffFeeNumerator: bigint,
  numberOfPeriod: number,
  sqrtPriceStepBps: number,
  schedulerExpirationDuration: number,
  reductionFactor: bigint,
  baseFeeMode:
    | BaseFeeMode.FeeMarketCapSchedulerExponential
    | BaseFeeMode.FeeMarketCapSchedulerLinear
): Buffer {
  const feeMarketCapScheduler: BorshFeeMarketCapScheduler = {
    cliffFeeNumerator: new BN(cliffFeeNumerator.toString()),
    numberOfPeriod,
    sqrtPriceStepBps,
    schedulerExpirationDuration,
    reductionFactor: new BN(reductionFactor.toString()),
    baseFeeMode,
    padding: FEE_PADDING,
  };

  return program.coder.types.encode(
    "borshFeeMarketCapScheduler",
    feeMarketCapScheduler
  );
}

export function decodeFeeMarketCapSchedulerParams(
  program: Program<CpAmm>,
  data: Buffer
): BorshFeeMarketCapScheduler {
  return program.coder.types.decode("borshFeeMarketCapScheduler", data);
}

export function decodePodAlignedFeeMarketCapScheduler(
  program: Program<CpAmm>,
  data: Buffer
): PodAlignedFeeMarketCapScheduler {
  return program.coder.types.decode("podAlignedFeeMarketCapScheduler", data);
}

export function encodeFeeRateLimiterParams(
  program: Program<CpAmm>,
  cliffFeeNumerator: bigint,
  feeIncrementBps: number,
  maxLimiterDuration: number,
  maxFeeBps: number,
  referenceAmount: bigint
) {
  const feeRateLimiter: BorshFeeRateLimiter = {
    cliffFeeNumerator: new BN(cliffFeeNumerator.toString()),
    feeIncrementBps,
    maxLimiterDuration,
    maxFeeBps,
    referenceAmount: new BN(referenceAmount.toString()),
    padding: FEE_PADDING,
    baseFeeMode: BaseFeeMode.RateLimiter,
  };

  return program.coder.types.encode("borshFeeRateLimiter", feeRateLimiter);
}

export function decodeFeeRateLimiterParams(
  program: Program<CpAmm>,
  data: Buffer
): BorshFeeRateLimiter {
  return program.coder.types.decode("borshFeeRateLimiter", data);
}

export function decodePodAlignedFeeRateLimiter(
  program: Program<CpAmm>,
  data: Buffer
): PodAlignedFeeRateLimiter {
  return program.coder.types.decode("podAlignedFeeRateLimiter", data);
}
