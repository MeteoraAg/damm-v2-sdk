import { BN } from "@coral-xyz/anchor";
import Decimal from "decimal.js";

/**
 * Calculates the initial sqrt price
 * a = L * (1/s - 1/pb)
 * b = L * (s - pa)
 * b/a = (s - pa) / (1/s - 1/pb)
 * With: x = 1 / pb and y = b/a
 * => s ^ 2 + s * (-pa + x * y) - y = 0
 * s = [(pa - xy) + √((xy - pa)² + 4y)]/2
 * @param tokenAAmount - The token A amount
 * @param tokenBAmount - The token B amount
 * @param minSqrtPrice - The min sqrt price
 * @param maxSqrtPrice - The max sqrt price
 * @returns The initial sqrt price
 */
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
  const amountBDecimal = new Decimal(tokenBAmount.toString());
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

  // sqrt_discriminant = √discriminant
  const sqrtDiscriminant = discriminant.sqrt();
  const result = paMinusXY
    .add(sqrtDiscriminant)
    .div(new Decimal(2))
    .mul(Decimal.pow(2, 64));

  return new BN(result.floor().toFixed());
}
