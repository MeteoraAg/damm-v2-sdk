import { describe, it, expect } from "vitest";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { parseEvtSwap2 } from "../src/helpers/events";

const MOCK_POOL = new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG");

function makeRawEvt(overrides: Partial<any> = {}): any {
  return {
    pool: MOCK_POOL,
    swapResult: {
      inAmount: new BN(1_000_000),
      outAmount: new BN(990_000),
      tradingFee: new BN(3_000),
      protocolFee: new BN(600),
      claimingFee: new BN(1_800),
      compoundingFee: new BN(600),
      referralFee: new BN(0),
      tokenAReserveAmount: new BN(50_000_000),
      tokenBReserveAmount: new BN(50_000_000),
      ...overrides,
    },
  };
}

describe("parseEvtSwap2", () => {
  it("parses all fields correctly", () => {
    const raw = makeRawEvt();
    const parsed = parseEvtSwap2(raw);

    expect(parsed.pool.toBase58()).toBe(MOCK_POOL.toBase58());
    expect(parsed.inAmount.toString()).toBe("1000000");
    expect(parsed.outAmount.toString()).toBe("990000");
    expect(parsed.tradingFee.toString()).toBe("3000");
    expect(parsed.protocolFee.toString()).toBe("600");
    expect(parsed.claimingFee.toString()).toBe("1800");
    expect(parsed.compoundingFee.toString()).toBe("600");
    expect(parsed.referralFee.toString()).toBe("0");
    expect(parsed.tokenAReserveAmount.toString()).toBe("50000000");
    expect(parsed.tokenBReserveAmount.toString()).toBe("50000000");
  });

  it("does NOT have a partnerFee field", () => {
    const parsed = parseEvtSwap2(makeRawEvt()) as any;
    expect(parsed.partnerFee).toBeUndefined();
    expect(parsed.partner_fee).toBeUndefined();
  });

  it("claimingFee + compoundingFee equals LP fee portion of tradingFee (after protocol cut)", () => {
    const raw = makeRawEvt();
    const parsed = parseEvtSwap2(raw);

    // After protocol fee: 3000 - 600 = 2400
    // claimingFee (1800) + compoundingFee (600) = 2400 ✓
    const lpFeeTotal = parsed.claimingFee.add(parsed.compoundingFee);
    const expectedLpFee = parsed.tradingFee.sub(parsed.protocolFee);
    expect(lpFeeTotal.toString()).toBe(expectedLpFee.toString());
  });

  it("handles missing referralFee gracefully (defaults to 0)", () => {
    const raw = makeRawEvt({ referralFee: undefined });
    const parsed = parseEvtSwap2(raw);
    expect(parsed.referralFee.toString()).toBe("0");
  });

  it("handles V0 pool with no reserve amounts (defaults to 0)", () => {
    const raw = makeRawEvt({
      tokenAReserveAmount: undefined,
      tokenBReserveAmount: undefined,
    });
    const parsed = parseEvtSwap2(raw);
    expect(parsed.tokenAReserveAmount.toString()).toBe("0");
    expect(parsed.tokenBReserveAmount.toString()).toBe("0");
  });

  it("compoundingFee is 0 for BothToken / OnlyB mode pools", () => {
    const raw = makeRawEvt({ compoundingFee: new BN(0) });
    const parsed = parseEvtSwap2(raw);
    expect(parsed.compoundingFee.toString()).toBe("0");
  });
});
