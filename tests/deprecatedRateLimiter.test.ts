import { describe, expect, it } from "vitest";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  DeprecatedBaseFeeModeError,
  getBaseFeeParams,
  getRateLimiterParams,
  validatePoolFees,
} from "../src";

describe("Deprecated BaseFeeMode.RateLimiter", () => {
  it("getBaseFeeParams rejects RateLimiter for new pools", () => {
    expect(() =>
      getBaseFeeParams({
        baseFeeMode: BaseFeeMode.RateLimiter,
        rateLimiterParam: {
          baseFeeBps: 100,
          feeIncrementBps: 10,
          referenceAmount: 1,
          maxLimiterDuration: 10,
          maxFeeBps: 5000,
        },
      }),
    ).toThrow(DeprecatedBaseFeeModeError);
  });

  it("validatePoolFees rejects RateLimiter params used for pool creation", () => {
    const baseFee = getRateLimiterParams(
      100,
      10,
      1,
      10,
      5000,
      9,
      ActivationType.Timestamp,
    );

    expect(() =>
      validatePoolFees(
        {
          baseFee,
          compoundingFeeBps: 0,
          padding: 0,
          dynamicFee: null,
        },
        CollectFeeMode.OnlyB,
        ActivationType.Timestamp,
      ),
    ).toThrow(DeprecatedBaseFeeModeError);
  });

  it("still encodes RateLimiter params for existing pools", () => {
    const baseFee = getRateLimiterParams(
      100,
      10,
      1,
      10,
      5000,
      9,
      ActivationType.Timestamp,
    );

    expect(baseFee.data.length).toBeGreaterThan(0);
    expect(baseFee.data[baseFee.data.length - 1]).toBe(BaseFeeMode.RateLimiter);
  });

  it("does not affect other base fee modes", () => {
    const baseFee = getBaseFeeParams({
      baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
      feeTimeSchedulerParam: {
        startingFeeBps: 2500,
        endingFeeBps: 2500,
        numberOfPeriod: 0,
        totalDuration: 0,
      },
    });

    expect(() =>
      validatePoolFees(
        {
          baseFee,
          compoundingFeeBps: 0,
          padding: 0,
          dynamicFee: null,
        },
        CollectFeeMode.BothToken,
        ActivationType.Timestamp,
      ),
    ).not.toThrow();
  });
});
