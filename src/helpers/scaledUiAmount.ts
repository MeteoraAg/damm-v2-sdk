import { BN } from "@coral-xyz/anchor";
import { getScaledUiAmountConfig, Mint } from "@solana/spl-token";
import Decimal from "decimal.js";
import { InvalidScaledUiAmountMultiplierError } from "../errors";

const ONE = new Decimal(1);

/**
 * Display-only Token-2022 ScaledUiAmount helpers.
 *
 * The cp-amm program transfers raw amounts and stores per-raw sqrt prices.
 * Do not use these conversions inside create, swap, deposit, or withdraw math,
 * and do not scale the input to {@link getSqrtPriceFromPrice}.
 */

function assertValidMultiplier(
  multiplier: number,
  mintAddress?: string,
): Decimal {
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    const mintSuffix = mintAddress ? ` for mint ${mintAddress}` : "";
    throw new InvalidScaledUiAmountMultiplierError(
      `Invalid ScaledUiAmount multiplier ${multiplier}${mintSuffix}`,
    );
  }
  return new Decimal(multiplier);
}

function assertValidDecimalMultiplier(
  multiplier: Decimal,
  label: string,
): Decimal {
  if (!multiplier.isFinite() || multiplier.lte(0)) {
    throw new InvalidScaledUiAmountMultiplierError(
      `Invalid ScaledUiAmount multiplier ${multiplier.toString()} (${label})`,
    );
  }
  return multiplier;
}

/**
 * Reads the effective ScaledUiAmount multiplier from a mint.
 *
 * @param mint - Unpacked mint whose TLV data is searched for the extension.
 * @param unixTimestamp - On-chain unix timestamp, used to resolve a scheduled
 *     multiplier switch.
 * @returns The effective multiplier, or 1 when the mint has no ScaledUiAmount
 *     extension.
 * @throws {InvalidScaledUiAmountMultiplierError} if the effective multiplier
 *     is zero, negative, or not finite.
 */
export function getScaledUiAmountMultiplier(
  mint: Mint,
  unixTimestamp: number,
): Decimal {
  if (!mint.tlvData || mint.tlvData.length === 0) {
    return ONE;
  }

  const config = getScaledUiAmountConfig(mint);
  if (!config) {
    return ONE;
  }

  const effectiveMultiplier =
    BigInt(unixTimestamp) >= config.newMultiplierEffectiveTimestamp
      ? config.newMultiplier
      : config.multiplier;

  return assertValidMultiplier(effectiveMultiplier, mint.address.toBase58());
}

/**
 * The ScaledUiAmount multipliers of both mints of a pair, and the conversions
 * that apply them.
 *
 * An amount is scaled by the multiplier of the mint that the amount belongs to.
 * A price is quote per base, so it is scaled by the quote multiplier divided by
 * the base multiplier.
 */
export class TokenScale {
  readonly baseMultiplier: Decimal;
  readonly quoteMultiplier: Decimal;
  /** The quote multiplier divided by the base multiplier. */
  readonly priceFactor: Decimal;

  private constructor(baseMultiplier: Decimal, quoteMultiplier: Decimal) {
    this.baseMultiplier = baseMultiplier;
    this.quoteMultiplier = quoteMultiplier;
    this.priceFactor = quoteMultiplier.div(baseMultiplier);
  }

  /**
   * Returns a scale whose multipliers are both 1, so it leaves every value
   * unchanged. Use it for a pair whose mints do not carry the ScaledUiAmount
   * extension.
   */
  static default(): TokenScale {
    return new TokenScale(ONE, ONE);
  }

  /**
   * Reads the multiplier of each mint of a pair.
   *
   * @param baseMint The base (A) mint of the pair.
   * @param quoteMint The quote (B) mint of the pair.
   * @param unixTimestamp An on-chain unix timestamp. It resolves a scheduled
   *     multiplier switch. Pass the same value to every call in one read.
   * @return The scale for the pair.
   * @throws {InvalidScaledUiAmountMultiplierError} If either mint carries an
   *     invalid multiplier.
   */
  static fromMints(
    baseMint: Mint,
    quoteMint: Mint,
    unixTimestamp: number,
  ): TokenScale {
    return new TokenScale(
      getScaledUiAmountMultiplier(baseMint, unixTimestamp),
      getScaledUiAmountMultiplier(quoteMint, unixTimestamp),
    );
  }

  /**
   * Builds a scale from multipliers that the caller already resolved (for
   * example Jupiter `scaledUiConfig`).
   *
   * @throws {InvalidScaledUiAmountMultiplierError} If either multiplier is
   *     zero, negative, or not finite.
   */
  static fromMultipliers(
    baseMultiplier: Decimal.Value,
    quoteMultiplier: Decimal.Value,
  ): TokenScale {
    return new TokenScale(
      assertValidDecimalMultiplier(new Decimal(baseMultiplier), "base"),
      assertValidDecimalMultiplier(new Decimal(quoteMultiplier), "quote"),
    );
  }

  /**
   * Converts a raw price to the price that a wallet displays.
   *
   * @param price A raw price, in token space.
   * @return The displayed price.
   */
  scalePrice(price: Decimal): Decimal {
    return price.mul(this.priceFactor);
  }

  /**
   * Converts a displayed price back to a raw price. It is the inverse of
   * {@link scalePrice}.
   *
   * @param price A displayed price, in token space.
   * @return The raw price.
   */
  unscalePrice(price: Decimal): Decimal {
    return price.div(this.priceFactor);
  }

  /**
   * Applies {@link scalePrice} to a price held as a string. The string is
   * returned unchanged if the price factor is 1.
   *
   * @param price A raw price, in token space.
   * @return The displayed scaled price.
   */
  scalePriceString(price: string): string {
    return this.priceFactor.eq(ONE)
      ? price
      : this.scalePrice(new Decimal(price)).toString();
  }

  /**
   * Applies {@link unscalePrice} to a price held as a string. The string is
   * returned unchanged if the price factor is 1.
   *
   * @param price A displayed price, in token space.
   * @return The raw price.
   */
  unscalePriceString(price: string): string {
    return this.priceFactor.eq(ONE)
      ? price
      : this.unscalePrice(new Decimal(price)).toString();
  }

  /**
   * Applies one of the pair's two multipliers to an amount.
   *
   * @param amount A raw amount.
   * @param isBaseToken True if the amount is an amount of the base (A) token,
   *     which uses {@link baseMultiplier}. False if it is an amount of the
   *     quote (B) token, which uses {@link quoteMultiplier}.
   * @return The scaled amount, in the same unit. It is fractional if the
   *     multiplier is fractional. Round it down before you put it in a `BN`.
   */
  scaleAmount(amount: BN | Decimal, isBaseToken: boolean): Decimal {
    const multiplier = isBaseToken ? this.baseMultiplier : this.quoteMultiplier;
    const decimalAmount =
      amount instanceof Decimal ? amount : new Decimal(amount.toString());
    return decimalAmount.mul(multiplier);
  }

  /**
   * Converts a displayed amount back to a raw amount. It is the inverse of
   * {@link scaleAmount}.
   */
  unscaleAmount(amount: BN | Decimal, isBaseToken: boolean): Decimal {
    const multiplier = isBaseToken ? this.baseMultiplier : this.quoteMultiplier;
    const decimalAmount =
      amount instanceof Decimal ? amount : new Decimal(amount.toString());
    return decimalAmount.div(multiplier);
  }
}
