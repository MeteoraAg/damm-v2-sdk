import { BN } from "@coral-xyz/anchor";
import Decimal from "decimal.js";

// a = L * (1/s - 1/pb)
// b = L * (s - pa)
// b/a = (s - pa) / (1/s - 1/pb)
// With: x = 1 / pb and y = b/a
// => s ^ 2 + s * (-pa + x * y) - y = 0
// s = [(pa - xy) + √((xy - pa)² + 4y)]/2
//
// export function calculateInitSqrtPrice(
//   tokenAAmount: Decimal, // u64
//   tokenBAmount: Decimal, // u64
//   minSqrtPrice: Decimal, // Q64.64
//   maxSqrtPrice: Decimal // Q64.64
// ): BN {
//   if (tokenAAmount.isZero() || tokenBAmount.isZero()) {
//     throw new Error("Amount cannot be zero");
//   }

//   const x = new Decimal(1).mul(Decimal.pow(2, 128)).div(maxSqrtPrice); // Q128/Q64 => Q64
//   const y = tokenBAmount.div(tokenAAmount);
//   const xy = x.mul(y); // Q64

//   const paMinusXY = minSqrtPrice.sub(xy); // Q64
//   const xyMinusPa = xy.sub(minSqrtPrice);

//   console.log({ paMinusXY, xyMinusPa });

//   const fourY = new Decimal(4).mul(y);

//   const discriminant = xyMinusPa
//     .mul(xyMinusPa)
//     .add(fourY.mul(Decimal.pow(2, 128)));

//   if (discriminant.isNeg()) {
//     throw new Error("Calculate sqrt price failed: negative discriminant");
//   }
//   // sqrt_discriminant = √discriminant
//   const sqrtDiscriminant = discriminant.sqrt().div(Decimal.pow(2, 64)); // Q64
//   const result = paMinusXY.add(sqrtDiscriminant);

//   return new BN(result.floor().toFixed());
// }

// a = L * (1/s - 1/pb)
// b = L * (s - pa)
// b/a = (s - pa) / (1/s - 1/pb)
// With: x = 1 / pb and y = b/a
// => s ^ 2 + s * (-pa + x * y) - y = 0
// s = [(pa - xy) + √((xy - pa)² + 4y)]/2
export function calculateInitSqrtPrice2(
  tokenAAmount: Decimal,
  tokenBAmount: Decimal,
  minSqrtPrice: Decimal,
  maxSqrtPrice: Decimal
): BN {
  if (tokenAAmount.isZero() || tokenBAmount.isZero()) {
    throw new Error("Amount cannot be zero");
  }

  const x = new Decimal(1).div(maxSqrtPrice);
  const y = tokenBAmount.div(tokenAAmount);
  const xy = x.mul(y);

  const paMinusXY = minSqrtPrice.sub(xy);
  const xyMinusPa = xy.sub(minSqrtPrice);

  const fourY = new Decimal(4).mul(y);

  const discriminant = xyMinusPa.mul(xyMinusPa).add(fourY);

  if (discriminant.isNeg()) {
    throw new Error("Calculate sqrt price failed: negative discriminant");
  }
  // sqrt_discriminant = √discriminant
  const sqrtDiscriminant = discriminant.sqrt();
  const result = paMinusXY.add(sqrtDiscriminant).mul(Decimal.pow(2, 64));

  return new BN(result.floor().toFixed());
}
