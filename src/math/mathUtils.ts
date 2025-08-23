import { BN } from "@coral-xyz/anchor";
import Decimal from "decimal.js";
import { Rounding } from "../types";

export function mulDiv(x: BN, y: BN, denominator: BN, rounding: Rounding): BN {
  const { div, mod } = (x.mul(y)as any).divmod(denominator);

  if (rounding == Rounding.Up && !mod.isZero()) {
    return div.add(new BN(1));
  }
  return div;
}

export function q64ToDecimal(num: BN, decimalPlaces?: number): Decimal {
  return new Decimal(num.toString())
    .div(Decimal.pow(2, 64))
    .toDecimalPlaces(decimalPlaces);
}

export function decimalToQ64(num: Decimal): BN {
  return new BN(num.mul(Decimal.pow(2, 64)).floor().toFixed());
}
