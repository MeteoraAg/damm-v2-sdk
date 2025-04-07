import { BN } from "@coral-xyz/anchor";
import Decimal from "decimal.js";

// a = L * (1/s - 1/pb)
// b = L * (s - pa)
// b/a = (s - pa) / (1/s - 1/pb)
// With: x = 1 / pb and y = b/a
// => s ^ 2 + s * (-pa + x * y) - y = 0
// s = [(pa - xy) + √((xy - pa)² + 4y)]/2
export function calculateInitSqrtPrice(
  tokenAAmount: BN,
  tokenBAmount: BN,
  minSqrtPrice: BN,
  maxSqrtPrice: BN
): BN {
  if (tokenAAmount.isZero() || tokenBAmount.isZero()) {
    throw new Error("Amount cannot be zero");
  }

  const amountADecimal = new Decimal(tokenAAmount.toString());
  const amountBDecimal = new Decimal(tokenAAmount.toString());
  const minSqrtPriceDecimal = new Decimal(minSqrtPrice.toString()).div(
    Decimal.pow(2, 64)
  );
  const maxSqrtPriceDecimal = new Decimal(maxSqrtPrice.toString()).div(
    Decimal.pow(2, 64)
  );

  const x = new Decimal(1).div(maxSqrtPriceDecimal);
  const y = amountBDecimal.div(amountADecimal);
  const xy = x.mul(y);

  const paMinusXY = minSqrtPriceDecimal.sub(xy);
  const xyMinusPa = xy.sub(minSqrtPriceDecimal);

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
