import BN from "bn.js";
import {
  TradeDirection,
  BaseFeeMode,
  CollectFeeMode,
  ActivationType,
  BaseFeeHandler,
  PoolVersion,
} from "../../types";
import {
  getFeeNumeratorFromIncludedFeeAmount,
  getFeeNumeratorFromExcludedFeeAmount,
  isRateLimiterApplied,
} from "./rateLimiter";
import { getBaseFeeNumerator } from "./feeScheduler";
import { validateFeeRateLimiter, validateFeeScheduler } from "../../helpers";

/**
 * Fee Rate Limiter implementation
 */
export class FeeRateLimiter implements BaseFeeHandler {
  constructor(
    public cliffFeeNumerator: BN,
    public feeIncrementBps: number,
    public maxFeeBps: number,
    public maxLimiterDuration: number,
    public referenceAmount: BN
  ) {}

  validate(
    collectFeeMode: CollectFeeMode,
    activationType: ActivationType,
    poolVersion: PoolVersion
  ): boolean {
    return validateFeeRateLimiter(
      this.cliffFeeNumerator,
      this.feeIncrementBps,
      this.maxFeeBps,
      this.maxLimiterDuration,
      this.referenceAmount,
      collectFeeMode,
      activationType,
      poolVersion
    );
  }

  getBaseFeeNumeratorFromIncludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN,
    tradeDirection: TradeDirection,
    includedFeeAmount: BN
  ): BN {
    if (
      isRateLimiterApplied(
        this.referenceAmount,
        this.maxLimiterDuration,
        this.maxFeeBps,
        this.feeIncrementBps,
        currentPoint,
        activationPoint,
        tradeDirection
      )
    ) {
      return getFeeNumeratorFromIncludedFeeAmount(
        includedFeeAmount,
        this.referenceAmount,
        this.cliffFeeNumerator,
        this.maxFeeBps,
        this.feeIncrementBps
      );
    } else {
      return this.cliffFeeNumerator;
    }
  }

  getBaseFeeNumeratorFromExcludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN,
    tradeDirection: TradeDirection,
    excludedFeeAmount: BN
  ): BN {
    if (
      isRateLimiterApplied(
        this.referenceAmount,
        this.maxLimiterDuration,
        this.maxFeeBps,
        this.feeIncrementBps,
        currentPoint,
        activationPoint,
        tradeDirection
      )
    ) {
      return getFeeNumeratorFromExcludedFeeAmount(
        excludedFeeAmount,
        this.referenceAmount,
        this.cliffFeeNumerator,
        this.maxFeeBps,
        this.feeIncrementBps
      );
    } else {
      return this.cliffFeeNumerator;
    }
  }
}

/**
 * Fee Scheduler implementation
 */
export class FeeScheduler implements BaseFeeHandler {
  constructor(
    public cliffFeeNumerator: BN,
    public numberOfPeriod: number,
    public periodFrequency: BN,
    public reductionFactor: BN,
    public feeSchedulerMode: BaseFeeMode
  ) {}

  validate(
    collectFeeMode: CollectFeeMode,
    activationType: ActivationType,
    poolVersion: PoolVersion
  ): boolean {
    return validateFeeScheduler(
      this.numberOfPeriod,
      this.periodFrequency,
      this.reductionFactor,
      this.cliffFeeNumerator,
      this.feeSchedulerMode,
      poolVersion
    );
  }

  getBaseFeeNumeratorFromIncludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN
  ): BN {
    return getBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.periodFrequency,
      this.reductionFactor,
      this.feeSchedulerMode,
      currentPoint,
      activationPoint
    );
  }

  getBaseFeeNumeratorFromExcludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN
  ): BN {
    return getBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.periodFrequency,
      this.reductionFactor,
      this.feeSchedulerMode,
      currentPoint,
      activationPoint
    );
  }
}

/**
 * Get base fee handler based on base fee mode
 * @param cliffFeeNumerator Cliff fee numerator
 * @param firstFactor First factor (feeScheduler: numberOfPeriod, rateLimiter: feeIncrementBps)
 * @param secondFactor Second factor (feeScheduler: periodFrequency, rateLimiter: maxLimiterDuration)
 * @param thirdFactor Third factor (feeScheduler: reductionFactor, rateLimiter: referenceAmount)
 * @param baseFeeMode Base fee mode
 * @returns Base fee handler instance
 */
export function getBaseFeeHandler(
  cliffFeeNumerator: BN,
  firstFactor: number,
  secondFactor: number[],
  thirdFactor: BN,
  baseFeeMode: BaseFeeMode
): BaseFeeHandler {
  switch (baseFeeMode) {
    case BaseFeeMode.FeeSchedulerLinear:
    case BaseFeeMode.FeeSchedulerExponential: {
      if (secondFactor.length < 8) {
        throw new Error(
          "TypeCastFailed: secondFactor must be at least 8 bytes"
        );
      }

      // periodFrequency is a u64 little-endian from 8 bytes
      const periodFrequency = new BN(
        Buffer.from(secondFactor.slice(0, 8)),
        "le"
      );
      const feeScheduler = new FeeScheduler(
        cliffFeeNumerator,
        firstFactor,
        periodFrequency,
        thirdFactor,
        baseFeeMode
      );
      return feeScheduler;
    }
    case BaseFeeMode.RateLimiter: {
      // secondFactor: first 4 bytes = maxLimiterDuration (u32 LE), next 4 bytes = maxFeeBps (u32 LE)
      if (secondFactor.length < 8) {
        throw new Error(
          "TypeCastFailed: secondFactor must be at least 8 bytes"
        );
      }
      const maxLimiterDuration = Buffer.from(
        secondFactor.slice(0, 4)
      ).readUInt32LE(0);
      const maxFeeBps = Buffer.from(secondFactor.slice(4, 8)).readUInt32LE(0);

      const feeRateLimiter = new FeeRateLimiter(
        cliffFeeNumerator,
        firstFactor,
        maxLimiterDuration,
        maxFeeBps,
        thirdFactor
      );
      return feeRateLimiter;
    }
    default:
      throw new Error("Invalid base fee mode");
  }
}
