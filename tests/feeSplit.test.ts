import { describe, it, expect } from "vitest";
import BN from "bn.js";
import { splitFees } from "../src/math/feeMath";
import { CollectFeeMode } from "../src/types";

/** Minimal PoolFeesStruct mock for unit tests */
function makePoolFees(
  protocolFeePercent: number,
  referralFeePercent: number,
  compoundingFeeBps?: number,
): any {
  return {
    baseFee: {
      baseFeeInfo: { data: new Array(32).fill(0) },
    },
    protocolFeePercent,
    referralFeePercent,
    partnerFeePercent: 0, // v0.2.0: always 0 / not used
    compoundingFeeBps: compoundingFeeBps !== undefined ? new BN(compoundingFeeBps) : undefined,
    dynamicFee: {
      initialized: 0,
      binStep: 0,
      variableFeeControl: 0,
      volatilityAccumulator: 0,
    },
    initSqrtPrice: new BN(0),
  };
}

describe("splitFees — BothToken / OnlyB modes (no compounding)", () => {
  const feeAmount = new BN(10_000);
  const poolFees = makePoolFees(20, 25); // 20% protocol, 25% referral

  it("splits protocol and trading fee correctly without referral", () => {
    const result = splitFees(poolFees, feeAmount, false, CollectFeeMode.BothToken);

    // protocolFee = 10000 * 20 / 100 = 2000
    expect(result.protocolFee.toString()).toBe("2000");
    // tradingFee = 10000 - 2000 = 8000
    expect(result.tradingFee.toString()).toBe("8000");
    // no referral
    expect(result.referralFee.toString()).toBe("0");
    // claimingFee = tradingFee = 8000 (all LP fee goes to claimers)
    expect(result.claimingFee.toString()).toBe("8000");
    // no compounding
    expect(result.compoundingFee.toString()).toBe("0");
  });

  it("splits protocol, trading, and referral fees correctly with referral", () => {
    const result = splitFees(poolFees, feeAmount, true, CollectFeeMode.OnlyB);

    // protocolFee = 10000 * 20 / 100 = 2000
    expect(result.protocolFee.toString()).toBe("2000");
    // tradingFee = 10000 - 2000 = 8000
    expect(result.tradingFee.toString()).toBe("8000");
    // referralFee = 8000 * 25 / 100 = 2000
    expect(result.referralFee.toString()).toBe("2000");
    // claimingFee = 8000 - 2000 = 6000
    expect(result.claimingFee.toString()).toBe("6000");
    // no compounding
    expect(result.compoundingFee.toString()).toBe("0");
  });

  it("total fees sum to feeAmount (no referral)", () => {
    const result = splitFees(poolFees, feeAmount, false, CollectFeeMode.BothToken);
    const total = result.protocolFee
      .add(result.tradingFee)
      .sub(result.claimingFee); // tradingFee already includes claimingFee + compoundingFee
    // protocolFee + claimingFee + compoundingFee = feeAmount
    const sanity = result.protocolFee.add(result.claimingFee).add(result.compoundingFee);
    expect(sanity.toString()).toBe(feeAmount.toString());
  });
});

describe("splitFees — Compounding mode", () => {
  const feeAmount = new BN(10_000);

  it("splits a portion into compoundingFee and the rest into claimingFee", () => {
    // protocolFeePercent=20, compoundingFeeBps=3000 (30%)
    const poolFees = makePoolFees(20, 0, 3000);
    const result = splitFees(poolFees, feeAmount, false, CollectFeeMode.Compounding);

    // tradingFee = 10000 - 2000 = 8000
    // compoundingFee = 8000 * 3000 / 10000 = 2400
    // claimingFee = 8000 - 2400 = 5600
    expect(result.tradingFee.toString()).toBe("8000");
    expect(result.compoundingFee.toString()).toBe("2400");
    expect(result.claimingFee.toString()).toBe("5600");
    expect(result.protocolFee.toString()).toBe("2000");
  });

  it("has no compoundingFee when compoundingFeeBps is 0", () => {
    const poolFees = makePoolFees(20, 0, 0);
    const result = splitFees(poolFees, feeAmount, false, CollectFeeMode.Compounding);
    expect(result.compoundingFee.toString()).toBe("0");
    expect(result.claimingFee.toString()).toBe("8000");
  });

  it("total = protocolFee + claimingFee + compoundingFee + referralFee", () => {
    const poolFees = makePoolFees(20, 25, 3000);
    const result = splitFees(poolFees, feeAmount, true, CollectFeeMode.Compounding);
    const total = result.protocolFee
      .add(result.claimingFee)
      .add(result.compoundingFee)
      .add(result.referralFee);
    expect(total.toString()).toBe(feeAmount.toString());
  });
});
