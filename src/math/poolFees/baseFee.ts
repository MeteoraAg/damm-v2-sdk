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
  getRateLimiterMaxBaseFeeNumerator,
  getRateLimiterMinBaseFeeNumerator,
} from "./rateLimiter";
import {
  getFeeTimeBaseFeeNumerator,
  getFeeTimeMinBaseFeeNumerator,
} from "./feeTimeScheduler";
import {
  getFeeMarketCapBaseFeeNumerator,
  getFeeMarketCapMinBaseFeeNumerator,
} from "./feeMarketCapScheduler";
import {
  validateFeeRateLimiter,
  validateFeeTimeScheduler,
  validateFeeMarketCapScheduler,
  validateFeeTimeSchedulerBaseFeeIsStatic,
  validateFeeMarketCapBaseFeeIsStatic,
  validateFeeRateLimiterBaseFeeIsStatic,
  decodePodAlignedFeeRateLimiter,
  decodePodAlignedFeeTimeScheduler,
  decodePodAlignedFeeMarketCapScheduler,
} from "../../helpers";
import { U64_MAX } from "../../constants";

/**
 * Fee Rate Limiter class
 */
export class FeeRateLimiter implements BaseFeeHandler {
  constructor(
    public cliffFeeNumerator: BN,
    public feeIncrementBps: number,
    public maxFeeBps: number,
    public maxLimiterDuration: number,
    public referenceAmount: BN,
  ) {}

  validate(
    collectFeeMode: CollectFeeMode,
    activationType: ActivationType,
    poolVersion: PoolVersion,
  ): boolean {
    return validateFeeRateLimiter(
      this.cliffFeeNumerator,
      this.feeIncrementBps,
      this.maxFeeBps,
      this.maxLimiterDuration,
      this.referenceAmount,
      collectFeeMode,
      activationType,
      poolVersion,
    );
  }

  getBaseFeeNumeratorFromIncludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN,
    tradeDirection: TradeDirection,
    includedFeeAmount: BN,
    _initSqrtPrice: BN,
    _currentSqrtPrice: BN,
  ): BN {
    if (
      isRateLimiterApplied(
        this.referenceAmount,
        this.maxLimiterDuration,
        this.maxFeeBps,
        this.feeIncrementBps,
        currentPoint,
        activationPoint,
        tradeDirection,
      )
    ) {
      return getFeeNumeratorFromIncludedFeeAmount(
        includedFeeAmount,
        this.referenceAmount,
        this.cliffFeeNumerator,
        this.maxFeeBps,
        this.feeIncrementBps,
      );
    } else {
      return this.cliffFeeNumerator;
    }
  }

  getBaseFeeNumeratorFromExcludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN,
    tradeDirection: TradeDirection,
    excludedFeeAmount: BN,
    _initSqrtPrice: BN,
    _currentSqrtPrice: BN,
  ): BN {
    if (
      isRateLimiterApplied(
        this.referenceAmount,
        this.maxLimiterDuration,
        this.maxFeeBps,
        this.feeIncrementBps,
        currentPoint,
        activationPoint,
        tradeDirection,
      )
    ) {
      return getFeeNumeratorFromExcludedFeeAmount(
        excludedFeeAmount,
        this.referenceAmount,
        this.cliffFeeNumerator,
        this.maxFeeBps,
        this.feeIncrementBps,
      );
    } else {
      return this.cliffFeeNumerator;
    }
  }

  validateBaseFeeIsStatic(currentPoint: BN, activationPoint: BN): boolean {
    return validateFeeRateLimiterBaseFeeIsStatic(
      currentPoint,
      activationPoint,
      this.maxLimiterDuration,
      this.referenceAmount,
      this.maxFeeBps,
      this.feeIncrementBps,
    );
  }

  getMinFeeNumerator(): BN {
    return getRateLimiterMinBaseFeeNumerator(this.cliffFeeNumerator);
  }

  getMaxFeeNumerator(): BN {
    return getRateLimiterMaxBaseFeeNumerator(
      U64_MAX,
      this.referenceAmount,
      this.cliffFeeNumerator,
      this.maxFeeBps,
      this.feeIncrementBps,
    );
  }
}

/**
 * Fee Time Scheduler implementation
 */
export class FeeTimeScheduler implements BaseFeeHandler {
  constructor(
    public cliffFeeNumerator: BN,
    public numberOfPeriod: number,
    public periodFrequency: BN,
    public reductionFactor: BN,
    public feeTimeSchedulerMode: BaseFeeMode,
  ) {}

  validate(
    collectFeeMode: CollectFeeMode,
    activationType: ActivationType,
    poolVersion: PoolVersion,
  ): boolean {
    return validateFeeTimeScheduler(
      this.numberOfPeriod,
      this.periodFrequency,
      this.reductionFactor,
      this.cliffFeeNumerator,
      this.feeTimeSchedulerMode,
      poolVersion,
    );
  }

  getBaseFeeNumeratorFromIncludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN,
    _tradeDirection: TradeDirection,
    _includedFeeAmount: BN,
    _initSqrtPrice: BN,
    _currentSqrtPrice: BN,
  ): BN {
    return getFeeTimeBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.periodFrequency,
      this.reductionFactor,
      this.feeTimeSchedulerMode,
      currentPoint,
      activationPoint,
    );
  }

  getBaseFeeNumeratorFromExcludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN,
    _tradeDirection: TradeDirection,
    _excludedFeeAmount: BN,
    _initSqrtPrice: BN,
    _currentSqrtPrice: BN,
  ): BN {
    return getFeeTimeBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.periodFrequency,
      this.reductionFactor,
      this.feeTimeSchedulerMode,
      currentPoint,
      activationPoint,
    );
  }

  validateBaseFeeIsStatic(currentPoint: BN, activationPoint: BN): boolean {
    return validateFeeTimeSchedulerBaseFeeIsStatic(
      currentPoint,
      activationPoint,
      new BN(this.numberOfPeriod),
      this.periodFrequency,
    );
  }

  getMinFeeNumerator(): BN {
    return getFeeTimeMinBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.reductionFactor,
      this.feeTimeSchedulerMode,
    );
  }

  getMaxFeeNumerator(): BN {
    return this.cliffFeeNumerator;
  }
}

/**
 * Fee Market Cap Scheduler implementation
 */
export class FeeMarketCapScheduler implements BaseFeeHandler {
  constructor(
    public cliffFeeNumerator: BN,
    public numberOfPeriod: number,
    public sqrtPriceStepBps: number,
    public schedulerExpirationDuration: number,
    public reductionFactor: BN,
    public feeMarketCapSchedulerMode: BaseFeeMode,
  ) {}

  validate(
    _collectFeeMode: CollectFeeMode,
    _activationType: ActivationType,
    poolVersion: PoolVersion,
  ): boolean {
    return validateFeeMarketCapScheduler(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      new BN(this.sqrtPriceStepBps),
      this.reductionFactor,
      new BN(this.schedulerExpirationDuration),
      this.feeMarketCapSchedulerMode,
      poolVersion,
    );
  }

  getBaseFeeNumeratorFromIncludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN,
    _tradeDirection: TradeDirection,
    _includedFeeAmount: BN,
    initSqrtPrice: BN,
    currentSqrtPrice: BN,
  ): BN {
    return getFeeMarketCapBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.sqrtPriceStepBps,
      this.schedulerExpirationDuration,
      this.reductionFactor,
      this.feeMarketCapSchedulerMode,
      currentPoint,
      activationPoint,
      initSqrtPrice,
      currentSqrtPrice,
    );
  }

  getBaseFeeNumeratorFromExcludedFeeAmount(
    currentPoint: BN,
    activationPoint: BN,
    _tradeDirection: TradeDirection,
    _excludedFeeAmount: BN,
    initSqrtPrice: BN,
    currentSqrtPrice: BN,
  ): BN {
    return getFeeMarketCapBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.sqrtPriceStepBps,
      this.schedulerExpirationDuration,
      this.reductionFactor,
      this.feeMarketCapSchedulerMode,
      currentPoint,
      activationPoint,
      initSqrtPrice,
      currentSqrtPrice,
    );
  }

  validateBaseFeeIsStatic(currentPoint: BN, activationPoint: BN): boolean {
    return validateFeeMarketCapBaseFeeIsStatic(
      currentPoint,
      activationPoint,
      new BN(this.schedulerExpirationDuration),
    );
  }

  getMinFeeNumerator(): BN {
    return getFeeMarketCapMinBaseFeeNumerator(
      this.cliffFeeNumerator,
      this.numberOfPeriod,
      this.reductionFactor,
      this.feeMarketCapSchedulerMode,
    );
  }

  getMaxFeeNumerator(): BN {
    return this.cliffFeeNumerator;
  }
}

/**
 * Get base fee handler based on base fee mode
 * @param rawData Raw data
 * @returns Base fee handler instance
 */
export function getBaseFeeHandler(rawData: number[]): BaseFeeHandler {
  const data = Buffer.from(rawData);
  const modeIndex = data.readUInt8(8); // offset 8 for poolFees pod format
  const baseFeeMode = modeIndex as BaseFeeMode;

  switch (baseFeeMode) {
    case BaseFeeMode.FeeTimeSchedulerLinear:
    case BaseFeeMode.FeeTimeSchedulerExponential: {
      const poolFees = decodePodAlignedFeeTimeScheduler(data);
      return new FeeTimeScheduler(
        poolFees.cliffFeeNumerator,
        poolFees.numberOfPeriod,
        poolFees.periodFrequency,
        poolFees.reductionFactor,
        poolFees.baseFeeMode,
      );
    }
    case BaseFeeMode.RateLimiter: {
      const poolFees = decodePodAlignedFeeRateLimiter(data);
      return new FeeRateLimiter(
        poolFees.cliffFeeNumerator,
        poolFees.feeIncrementBps,
        poolFees.maxFeeBps,
        poolFees.maxLimiterDuration,
        poolFees.referenceAmount,
      );
    }
    case BaseFeeMode.FeeMarketCapSchedulerLinear:
    case BaseFeeMode.FeeMarketCapSchedulerExponential: {
      const poolFees = decodePodAlignedFeeMarketCapScheduler(data);
      return new FeeMarketCapScheduler(
        poolFees.cliffFeeNumerator,
        poolFees.numberOfPeriod,
        poolFees.sqrtPriceStepBps,
        poolFees.schedulerExpirationDuration,
        poolFees.reductionFactor,
        poolFees.baseFeeMode,
      );
    }
    default:
      throw new Error("Invalid base fee mode");
  }
}
