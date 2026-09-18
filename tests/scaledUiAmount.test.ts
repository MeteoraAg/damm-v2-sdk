import { describe, expect, it } from "vitest";
import {
  ExtensionType,
  Mint,
  SCALED_UI_AMOUNT_CONFIG_SIZE,
  ScaledUiAmountConfigLayout,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import Decimal from "decimal.js";
import {
  getScaledUiAmountMultiplier,
  InvalidScaledUiAmountMultiplierError,
  TokenScale,
} from "../src";

function mintWithScaledUi(params: {
  multiplier: number;
  newMultiplier: number;
  newMultiplierEffectiveTimestamp: bigint;
  address?: PublicKey;
}): Mint {
  const data = Buffer.alloc(SCALED_UI_AMOUNT_CONFIG_SIZE);
  ScaledUiAmountConfigLayout.encode(
    {
      authority: PublicKey.default,
      multiplier: params.multiplier,
      newMultiplierEffectiveTimestamp: params.newMultiplierEffectiveTimestamp,
      newMultiplier: params.newMultiplier,
    },
    data,
  );

  const tlvData = Buffer.alloc(4 + SCALED_UI_AMOUNT_CONFIG_SIZE);
  tlvData.writeUInt16LE(ExtensionType.ScaledUiAmountConfig, 0);
  tlvData.writeUInt16LE(SCALED_UI_AMOUNT_CONFIG_SIZE, 2);
  data.copy(tlvData, 4);

  return {
    address: params.address ?? PublicKey.unique(),
    mintAuthority: null,
    supply: BigInt(0),
    decimals: 6,
    isInitialized: true,
    freezeAuthority: null,
    tlvData,
  };
}

function plainMint(): Mint {
  return {
    address: PublicKey.unique(),
    mintAuthority: null,
    supply: BigInt(0),
    decimals: 9,
    isInitialized: true,
    freezeAuthority: null,
    tlvData: Buffer.alloc(0),
  };
}

describe("getScaledUiAmountMultiplier", () => {
  it("returns 1 when the mint has no ScaledUiAmount extension", () => {
    expect(getScaledUiAmountMultiplier(plainMint(), 0).toNumber()).toBe(1);
  });

  it("uses the current multiplier before the scheduled switch", () => {
    const mint = mintWithScaledUi({
      multiplier: 1,
      newMultiplier: 5,
      newMultiplierEffectiveTimestamp: BigInt(1000),
    });
    expect(getScaledUiAmountMultiplier(mint, 999).toNumber()).toBe(1);
  });

  it("uses the new multiplier once the switch is effective", () => {
    const mint = mintWithScaledUi({
      multiplier: 1,
      newMultiplier: 5,
      newMultiplierEffectiveTimestamp: BigInt(1000),
    });
    expect(getScaledUiAmountMultiplier(mint, 1_000).toNumber()).toBe(5);
  });

  it("throws when the effective multiplier is not finite or not positive", () => {
    const mint = mintWithScaledUi({
      multiplier: 0,
      newMultiplier: 0,
      newMultiplierEffectiveTimestamp: BigInt(0),
    });
    expect(() => getScaledUiAmountMultiplier(mint, 0)).toThrow(
      InvalidScaledUiAmountMultiplierError,
    );
  });
});

describe("TokenScale", () => {
  it("leaves values unchanged when both multipliers are 1", () => {
    const scale = TokenScale.default();
    expect(scale.scalePrice(new Decimal(10)).toNumber()).toBe(10);
    expect(scale.unscalePrice(new Decimal(10)).toNumber()).toBe(10);
    expect(scale.scalePriceString("1.5")).toBe("1.5");
    expect(scale.unscalePriceString("1.5")).toBe("1.5");
    expect(scale.scaleAmount(new BN(100), true).toString()).toBe("100");
    expect(scale.unscaleAmount(new Decimal(100), false).toString()).toBe("100");
  });

  it("scales price by quote / base and amount by the matching mint", () => {
    const scale = TokenScale.fromMultipliers(5, 1);
    expect(scale.scalePrice(new Decimal(10)).toString()).toBe("2");
    expect(scale.unscalePrice(new Decimal(2)).toString()).toBe("10");
    expect(scale.scalePriceString("10")).toBe("2");
    expect(scale.unscalePriceString("2")).toBe("10");
    expect(scale.scaleAmount(new Decimal(100), true).toString()).toBe("500");
    expect(scale.unscaleAmount(new Decimal(500), true).toString()).toBe("100");
    expect(scale.scaleAmount(new Decimal(100), false).toString()).toBe("100");
  });

  it("reads multipliers from a pair of mints", () => {
    const base = mintWithScaledUi({
      multiplier: 5,
      newMultiplier: 5,
      newMultiplierEffectiveTimestamp: BigInt(0),
    });
    const quote = plainMint();
    const scale = TokenScale.fromMints(base, quote, 0);
    expect(scale.baseMultiplier.toNumber()).toBe(5);
    expect(scale.quoteMultiplier.toNumber()).toBe(1);
    expect(scale.priceFactor.toString()).toBe("0.2");
  });

  it("rejects invalid fromMultipliers values", () => {
    expect(() => TokenScale.fromMultipliers(0, 1)).toThrow(
      InvalidScaledUiAmountMultiplierError,
    );
    expect(() => TokenScale.fromMultipliers(1, Number.NaN)).toThrow(
      InvalidScaledUiAmountMultiplierError,
    );
  });
});
