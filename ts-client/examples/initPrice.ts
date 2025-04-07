import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  CpAmm,
  getTokenProgram,
  CP_AMM_PROGRAM_ID,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  getLiquidityDeltaFromAmountA,
  getLiquidityDeltaFromAmountB,
} from "../src";
import { calculateInitSqrtPrice } from "../src/math";
import Decimal from "decimal.js";

(async () => {
  const tokenADecimal = 6;
  const tokenBDecimal = 9;
  const maxAmountTokenA = new BN(1000 * 10 ** tokenADecimal);
  const maxAmountTokenB = new BN(1000 * 10 ** tokenBDecimal);
  const sqrtPriceQ64 = calculateInitSqrtPrice(
    maxAmountTokenA,
    maxAmountTokenB,
    MIN_SQRT_PRICE,
    MAX_SQRT_PRICE
  );

  const liquidityDeltaFromAmountA = getLiquidityDeltaFromAmountA(
    maxAmountTokenA,
    sqrtPriceQ64,
    MAX_SQRT_PRICE
  );

  const liquidityDeltaFromAmountB = getLiquidityDeltaFromAmountB(
    maxAmountTokenB,
    MIN_SQRT_PRICE,
    sqrtPriceQ64
  );

  const sqrtPriceDecimal = new Decimal(sqrtPriceQ64.toString());
  const result = sqrtPriceDecimal
    .mul(sqrtPriceDecimal)
    .div(Decimal.pow(2, 128));
  console.log({
    MIN_SQRT_PRICE: MIN_SQRT_PRICE.toString(),
    MAX_SQRT_PRICE: MAX_SQRT_PRICE.toString(),
    sqrtPriceQ64: sqrtPriceQ64.toString(),
    priceBaseToQuote: result.mul(
      Decimal.pow(10, tokenADecimal - tokenBDecimal)
    ),
    priceQuoteToBase: result.mul(
      Decimal.pow(10, tokenBDecimal - tokenADecimal)
    ),
    liquidityDeltaFromAmountA: liquidityDeltaFromAmountA.toString(),
    liquidityDeltaFromAmountB: liquidityDeltaFromAmountB.toString(),
  });
})();
