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

export function priceToSqrtPrice(
  initPrice: Decimal,
  tokenADecimal: number,
  tokenBDecimal: number
): BN {
  const sqrtPriceQ64 = decimalToQ64(
    initPrice.mul(Decimal.pow(10, tokenBDecimal - tokenADecimal)).sqrt()
  );

  return sqrtPriceQ64;
}
