import { describe, it, expect } from "vitest";
import { CollectFeeMode, PoolLayoutVersion } from "../src/types";
import { isCompoundingPool, getPoolReserves } from "../src/helpers/utils";
import BN from "bn.js";

describe("CollectFeeMode.Compounding", () => {
  it("enum value is 2 (ordinal after BothToken=0, OnlyB=1)", () => {
    expect(CollectFeeMode.Compounding).toBe(2);
  });

  it("BothToken and OnlyB values are unchanged", () => {
    expect(CollectFeeMode.BothToken).toBe(0);
    expect(CollectFeeMode.OnlyB).toBe(1);
  });

  it("isCompoundingPool returns true for Compounding mode pools", () => {
    const mockPool = { collectFeeMode: CollectFeeMode.Compounding } as any;
    expect(isCompoundingPool(mockPool)).toBe(true);
  });

  it("isCompoundingPool returns false for BothToken pools", () => {
    const mockPool = { collectFeeMode: CollectFeeMode.BothToken } as any;
    expect(isCompoundingPool(mockPool)).toBe(false);
  });

  it("isCompoundingPool returns false for OnlyB pools", () => {
    const mockPool = { collectFeeMode: CollectFeeMode.OnlyB } as any;
    expect(isCompoundingPool(mockPool)).toBe(false);
  });
});

describe("PoolLayoutVersion", () => {
  it("V0 is 0", () => {
    expect(PoolLayoutVersion.V0).toBe(0);
  });

  it("V1 is 1", () => {
    expect(PoolLayoutVersion.V1).toBe(1);
  });

  it("getPoolReserves returns null for V0 pools", () => {
    const mockPool = { layoutVersion: PoolLayoutVersion.V0 } as any;
    expect(getPoolReserves(mockPool)).toBeNull();
  });

  it("getPoolReserves returns amounts for V1 pools", () => {
    const mockPool = {
      layoutVersion: PoolLayoutVersion.V1,
      tokenAAmount: new BN(1_000_000),
      tokenBAmount: new BN(2_000_000),
    } as any;

    const reserves = getPoolReserves(mockPool);
    expect(reserves).not.toBeNull();
    expect(reserves!.tokenAAmount.toString()).toBe("1000000");
    expect(reserves!.tokenBAmount.toString()).toBe("2000000");
  });
});
