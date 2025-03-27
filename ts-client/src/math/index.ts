import { BN } from "@coral-xyz/anchor";
import Decimal from "decimal.js";
import { Rounding } from "../types";

export function mulShr(x: BN, y: BN, offset: number, rounding: Rounding): BN {
  const denominator = new BN(1).shln(offset);
  return mulDiv(x, y, denominator, rounding);
}

export function shlDiv(x: BN, y: BN, offset: number, rounding: Rounding): BN {
  const scale = new BN(1).shln(offset);
  return mulDiv(x, scale, y, rounding);
}

export function mulDiv(x: BN, y: BN, denominator: BN, rounding: Rounding): BN {
  const { div, mod } = x.mul(y).divmod(denominator);

  if (rounding == Rounding.Up && !mod.isZero()) {
    return div.add(new BN(1));
  }
  return div;
}

export function divCeil(a: BN, b: BN): BN {
  if (a.isZero()) {
    return new BN(0);
  }
  // (a + b - 1) /b
  return a.add(b.sub(new BN(1))).div(b);
}

export function q64ToDecimal(num: BN, decimalPlaces?: number): Decimal {
  return new Decimal(num.toString())
    .div(Decimal.pow(2, 64))
    .toDecimalPlaces(decimalPlaces);
}

export function decimalToQ64(num: Decimal): BN {
  return new BN(num.mul(Decimal.pow(2, 64)).floor().toFixed());
}

// Calculate init sqrt price
// From: Δa = L * (1 / √P_lower - 1 / √P_upper) => a = L * (1/s - 1/pb)
// From: Δb = L (√init_price - MIN_SQRT_PRICE) => b = L * (s - pa)
///
/// Derive
///
/// b/a = (1/s - 1/pb) / (s - pa)
/// (b/a) * (s - pa) * s = 1 - s/pb
/// (b/a) * s^2 - (b/a) * pa * s = 1 - s/pb
/// Quadratic Formular: s^2* (b/a) - s * (b/a * pa + 1/pb) + 1 = 0
///  => s = {[b/a * pa + 1/pb] + √[(b/a * pa + 1/pb)² - 4(b/a)(1)]} / (2(b/a))
/// b/a = A, B = -(b/a * pa + 1/pb) => s =  [-B + √(B² - 4A)] / (2A)

export function calculateSqrtPrice(tokenAAmount: BN, tokenBAmount: BN): BN {}
