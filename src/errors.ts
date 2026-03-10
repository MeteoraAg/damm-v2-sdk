export class DepositTokenNotAcceptedError extends Error {
  public readonly acceptedToken: "A" | "B";

  constructor(acceptedToken: "A" | "B") {
    const rejectedToken = acceptedToken === "A" ? "B" : "A";
    super(
      `Cannot deposit token ${rejectedToken}: pool price is at the ${rejectedToken === "A" ? "upper" : "lower"} bound. All liquidity is in token ${acceptedToken}.`,
    );
    this.name = "DepositTokenNotAcceptedError";
    this.acceptedToken = acceptedToken;
  }
}

export class InvalidFeeError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "Fee numerator must be less than denominator and denominator must be non-zero",
    );
    this.name = "InvalidFeeError";
  }
}

export class ExceedMaxFeeBpsError extends Error {
  constructor(message?: string) {
    super(message ?? "Fee exceeds maximum allowed basis points");
    this.name = "ExceedMaxFeeBpsError";
  }
}

export class InvalidActivationTypeError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid activation type");
    this.name = "InvalidActivationTypeError";
  }
}

export class InvalidPriceRangeError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid price range");
    this.name = "InvalidPriceRangeError";
  }
}

export class InvalidCollectFeeModeError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid collect fee mode");
    this.name = "InvalidCollectFeeModeError";
  }
}

export class InvalidCompoundingFeeBpsError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid compounding fee bps");
    this.name = "InvalidCompoundingFeeBpsError";
  }
}

export class InvalidFeeTimeSchedulerError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid fee time scheduler");
    this.name = "InvalidFeeTimeSchedulerError";
  }
}

export class InvalidFeeMarketCapSchedulerError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid fee market cap scheduler");
    this.name = "InvalidFeeMarketCapSchedulerError";
  }
}

export class InvalidFeeRateLimiterError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid fee rate limiter");
    this.name = "InvalidFeeRateLimiterError";
  }
}

export class InvalidDynamicFeeParametersError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid dynamic fee parameters");
    this.name = "InvalidDynamicFeeParametersError";
  }
}

export class InvalidMinimumLiquidityError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid minimum liquidity");
    this.name = "InvalidMinimumLiquidityError";
  }
}

export class AmountIsZeroError extends Error {
  constructor(message?: string) {
    super(message ?? "Amount is zero");
    this.name = "AmountIsZeroError";
  }
}

export class InvalidBaseFeeModeError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid base fee mode");
    this.name = "InvalidBaseFeeModeError";
  }
}

export class InvalidPoolVersionError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid pool version");
    this.name = "InvalidPoolVersionError";
  }
}

export class MathOverflowError extends Error {
  constructor(message?: string) {
    super(message ?? "Math overflow");
    this.name = "MathOverflowError";
  }
}

export class InsufficientLiquidityError extends Error {
  constructor(message?: string) {
    super(message ?? "Insufficient liquidity");
    this.name = "InsufficientLiquidityError";
  }
}

export class SwapDisabledError extends Error {
  constructor(message?: string) {
    super(message ?? "Swap is disabled");
    this.name = "SwapDisabledError";
  }
}

export class InvalidInputError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid input");
    this.name = "InvalidInputError";
  }
}

export class PriceRangeViolationError extends Error {
  constructor(message?: string) {
    super(message ?? "Price range is violated");
    this.name = "PriceRangeViolationError";
  }
}

export class SameTokenMintsError extends Error {
  constructor(message?: string) {
    super(message ?? "Token A and Token B mints must be different");
    this.name = "SameTokenMintsError";
  }
}

export class InvalidParametersError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid parameters");
    this.name = "InvalidParametersError";
  }
}

export class InvalidSplitPositionParametersError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid split position parameters");
    this.name = "InvalidSplitPositionParametersError";
  }
}

export class InvalidVestingInfoError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid vesting info");
    this.name = "InvalidVestingInfoError";
  }
}

export class InvalidRewardIndexError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid reward index");
    this.name = "InvalidRewardIndexError";
  }
}

export class InvalidRewardDurationError extends Error {
  constructor(message?: string) {
    super(message ?? "Invalid reward duration");
    this.name = "InvalidRewardDurationError";
  }
}
