import { BN } from "@coral-xyz/anchor";
import Decimal from "decimal.js";
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE } from "../constants";

// Calculate init sqrt price
// From: Δa = L * (√P_upper - √P_lower) / (√P_upper * √P_lower) => L * (MAX_SQRT_PRICE - sqrt_init_price) / (MAX_SQRT_PRICE * sqrt_init_price)
// From: Δb = L (√P_upper - √P_lower) =>  L * (sqrt_init_price - MIN_SQRT_PRICE)

// Derive by constant L, init_price = Δb / Δa
// Δb * (MAX_SQRT_PRICE - sqrt_init_price) = Δa * (MAX_SQRT_PRICE * sqrt_init_price) * (sqrt_init_price - MIN_SQRT_PRICE)
// Δb * MAX_SQRT_PRICE - Δb * sqrt_init_price = Δa * MAX_SQRT_PRICE * sqrt_init_price * sqrt_init_price - Δa * MAX_SQRT_PRICE * sqrt_init_price * MIN_SQRT_PRICE

// set sqrt_init_price = x
// Δb * MAX_SQRT_PRICE - Δb * x = Δa * MAX_SQRT_PRICE * x^2 - Δa * MAX_SQRT_PRICE * x * MIN_SQRT_PRICE
// Δa * MAX_SQRT_PRICE * x^2 - (Δa * MAX_SQRT_PRICE * MIN_SQRT_PRICE + Δb) * x + Δb * MAX_SQRT_PRICE = 0
//
// Quadratic equation: a*x^2 + b*x + c = 0
// x = (-b ± √(b² - 4ac)) / 2a
//
// b = (Δa * MAX_SQRT_PRICE * MIN_SQRT_PRICE + Δb)
// a = Δa * MAX_SQRT_PRICE
// c = Δb * MAX_SQRT_PRICE
// sqrt_init_price = ((Δa * MAX_SQRT_PRICE * MIN_SQRT_PRICE + Δb) + √((Δa * MAX_SQRT_PRICE * MIN_SQRT_PRICE + Δb)^2 - 4 * Δa * Δb * MAX_SQRT_PRICE^2)) / (2 * Δa * MAX_SQRT_PRICE)
//
export function calculateSqrtPrice(tokenAAmount: BN, tokenBAmount: BN): BN {
  if (tokenAAmount.isZero() || tokenBAmount.isZero()) {
    throw new Error("Amount cannot be zero");
  }

  //
  const a = tokenAAmount.mul(MAX_SQRT_PRICE);

  // b = -(Δa * MAX_SQRT_PRICE * MIN_SQRT_PRICE + Δb)
  const negB = tokenAAmount
    .mul(MAX_SQRT_PRICE)
    .mul(MIN_SQRT_PRICE)
    .add(tokenBAmount);

  const c = tokenBAmount.mul(MAX_SQRT_PRICE);

  //  b^2 - 4*a*c
  const discriminant = negB.mul(negB).sub(new BN(4).mul(a).mul(c));

  // Check if discriminant is negative
  if (discriminant.lt(new BN(0))) {
    throw new Error("Calculate sqrt price failed");
  }

  // Calculate sqrt(discriminant)
  const sqrtDiscriminant = new Decimal(discriminant.toString()).sqrt();

  //  x = (-b + sqrt(discriminant)) / (2a)
  //  x = (negB + sqrt(discriminant)) / (2a)
  const numerator = negB.add(new BN(sqrtDiscriminant.toFixed()));
  const denominator = new BN(2).mul(a);

  const result = numerator.div(denominator);

  return result;
}
