import Decimal from "decimal.js";
import { Rounding } from "../types";
import { MAX, MAX_EXPONENTIAL, ONE_Q64, SCALE_OFFSET } from "../constants";
import BN from "bn.js";

export function mulDiv(x: BN, y: BN, denominator: BN, rounding: Rounding): BN {
  const { div, mod } = x.mul(y).divmod(denominator);

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

export function sqrt(value: BN): BN {
  if (value.isZero()) {
    return new BN(0);
  }

  if (value.eq(new BN(1))) {
    return new BN(1);
  }

  let x = value;
  let y = value.add(new BN(1)).div(new BN(2));

  while (y.lt(x)) {
    x = y;
    y = x.add(value.div(x)).div(new BN(2));
  }

  return x;
}

export function pow(base: BN, exp: BN): BN {
  let invert = exp.isNeg();

  if (exp.isZero()) {
    return ONE_Q64;
  }

  exp = invert ? exp.abs() : exp;

  if (exp.gt(MAX_EXPONENTIAL)) {
    return new BN(0);
  }

  let squaredBase = base;
  let result = ONE_Q64;

  if (squaredBase.gte(result)) {
    squaredBase = MAX.div(squaredBase);
    invert = !invert;
  }

  if (!exp.and(new BN(0x1)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x2)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x4)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x8)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x10)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x20)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x40)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x80)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x100)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x200)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x400)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x800)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x1000)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x2000)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x4000)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x8000)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x10000)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x20000)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  squaredBase = squaredBase.mul(squaredBase).shrn(SCALE_OFFSET);

  if (!exp.and(new BN(0x40000)).isZero()) {
    result = result.mul(squaredBase).shrn(SCALE_OFFSET);
  }

  if (result.isZero()) {
    return new BN(0);
  }

  if (invert) {
    result = MAX.div(result);
  }

  return result;
}
