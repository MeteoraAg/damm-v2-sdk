import { BN } from "@coral-xyz/anchor";
import { BASIS_POINT_MAX, LIQUIDITY_SCALE } from "../constants";
import Decimal from "decimal.js";
import { PoolState, PositionState, Rounding } from "../types";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { CpAmm } from "../CpAmm";
import { getOrCreateATAInstruction, getTokenProgram } from "./token";
import {
  derivePoolAuthority,
  derivePositionAddress,
  derivePositionNftAccount,
} from "../pda";
import {
  getAmountAFromLiquidityDelta,
  getAmountBFromLiquidityDelta,
} from "./curve";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
/**
 * It takes an amount and a slippage rate, and returns the maximum amount that can be received with
 * that slippage rate
 * @param {BN} amount - The amount of tokens you want to buy.
 * @param {number} rate - The maximum percentage of slippage you're willing to accept. (Max to 2 decimal place)
 * @returns The maximum amount of tokens that can be bought with the given amount of ETH, given the
 * slippage rate.
 */
export const getMaxAmountWithSlippage = (amount: BN, rate: number) => {
  const slippage = ((100 + rate) / 100) * BASIS_POINT_MAX;
  return amount.mul(new BN(slippage)).div(new BN(BASIS_POINT_MAX));
};

/**
 * It takes an amount and a slippage rate, and returns the minimum amount that will be received after
 * slippage
 * @param {BN} amount - The amount of tokens you want to sell.
 * @param {number} rate - The percentage of slippage you're willing to accept. (Max to 2 decimal place)
 * @returns The minimum amount that can be received after slippage is applied.
 */
export const getMinAmountWithSlippage = (amount: BN, rate: number) => {
  const slippage = ((100 - rate) / 100) * BASIS_POINT_MAX;
  return amount.mul(new BN(slippage)).div(new BN(BASIS_POINT_MAX));
};

/**
 * Calculate price impact as a percentage
 * @param nextSqrtPrice sqrt price after swap
 * @param currentSqrtPrice current pool sqrt price
 * @returns Price impact as a percentage (e.g., 1.5 means 1.5%)
 */
export const getPriceImpact = (
  nextSqrtPrice: BN,
  currentSqrtPrice: BN
): number => {
  // price = (sqrtPrice)^2 * 10 ** (base_decimal - quote_decimal) / 2^128
  // k = 10^(base_decimal - quote_decimal) / 2^128
  // priceA = (sqrtPriceA)^2 * k
  // priceB = (sqrtPriceB)^2 * k
  // => price_impact = k * abs ( (sqrtPriceA)^2 - (sqrtPriceB)^2  )  * 100 /  (sqrtPriceB)^2 * k
  // => price_impact = abs ( (sqrtPriceA)^2 - (sqrtPriceB)^2  )  * 100 / (sqrtPriceB)^2
  const diff = nextSqrtPrice
    .pow(new BN(2))
    .sub(currentSqrtPrice.pow(new BN(2)))
    .abs();

  return new Decimal(diff.toString())
    .div(new Decimal(currentSqrtPrice.pow(new BN(2)).toString()))
    .mul(100)
    .toNumber();
};

// (sqrtPrice)^2 * 10 ** (base_decimal - quote_decimal) / 2^128
export const getPriceFromSqrtPrice = (
  sqrtPrice: BN,
  tokenADecimal: number,
  tokenBDecimal: number
): string => {
  const decimalSqrtPrice = new Decimal(sqrtPrice.toString());
  const price = decimalSqrtPrice
    .mul(decimalSqrtPrice)
    .mul(new Decimal(10 ** (tokenADecimal - tokenBDecimal)))
    .div(Decimal.pow(2, 128))
    .toString();

  return price;
};

//  sqrt(price / 10^(tokenADecimal - tokenBDecimal)) * 2^64
export const getSqrtPriceFromPrice = (
  price: string,
  tokenADecimal: number,
  tokenBDecimal: number
): BN => {
  const decimalPrice = new Decimal(price);

  const adjustedByDecimals = decimalPrice.div(
    new Decimal(10 ** (tokenADecimal - tokenBDecimal))
  );

  const sqrtValue = Decimal.sqrt(adjustedByDecimals);

  const sqrtValueQ64 = sqrtValue.mul(Decimal.pow(2, 64));

  return new BN(sqrtValueQ64.floor().toFixed());
};

// fee = totalLiquidity * feePerTokenStore
// precision: (totalLiquidity * feePerTokenStore) >> 128
export const getUnClaimReward = (
  poolState: PoolState,
  positionState: PositionState
): {
  feeTokenA: BN;
  feeTokenB: BN;
  rewards: BN[];
} => {
  const totalPositionLiquidity = positionState.unlockedLiquidity
    .add(positionState.vestedLiquidity)
    .add(positionState.permanentLockedLiquidity);

  const feeAPerTokenStored = new BN(
    Buffer.from(poolState.feeAPerLiquidity).reverse()
  ).sub(new BN(Buffer.from(positionState.feeAPerTokenCheckpoint).reverse()));

  const feeBPerTokenStored = new BN(
    Buffer.from(poolState.feeBPerLiquidity).reverse()
  ).sub(new BN(Buffer.from(positionState.feeBPerTokenCheckpoint).reverse()));

  const feeA = totalPositionLiquidity
    .mul(feeAPerTokenStored)
    .shrn(LIQUIDITY_SCALE);
  const feeB = totalPositionLiquidity
    .mul(feeBPerTokenStored)
    .shrn(LIQUIDITY_SCALE);

  return {
    feeTokenA: positionState.feeAPending.add(feeA),
    feeTokenB: positionState.feeBPending.add(feeB),
    rewards:
      positionState.rewardInfos.length > 0
        ? positionState.rewardInfos.map((item) => item.rewardPendings)
        : [],
  };
};

export async function splitLPPosition(
  cpAmm: CpAmm,
  poolAddress: PublicKey,
  owner: PublicKey,
  newPositionNft: PublicKey,
  toleranceAmount: number
): Promise<Transaction> {
  const userPosition = (
    await cpAmm.getUserPositionByPool(poolAddress, owner)
  )[0];
  let poolState = await cpAmm.fetchPoolState(poolAddress);
  const positionState = userPosition.positionState;

  const tokenAProgram = getTokenProgram(poolState.tokenAFlag);
  const tokenBProgram = getTokenProgram(poolState.tokenBFlag);

  const preInstructions: TransactionInstruction[] = [];
  const [
    { ataPubkey: tokenAAta, ix: createInputTokenAccountIx },
    { ataPubkey: tokenBAta, ix: createOutputTokenAccountIx },
  ] = await Promise.all([
    getOrCreateATAInstruction(
      cpAmm._program.provider.connection,
      poolState.tokenAMint,
      owner,
      owner,
      true,
      tokenAProgram
    ),
    getOrCreateATAInstruction(
      cpAmm._program.provider.connection,
      poolState.tokenBMint,
      owner,
      owner,
      true,
      tokenBProgram
    ),
  ]);
  createInputTokenAccountIx && preInstructions.push(createInputTokenAccountIx);
  createOutputTokenAccountIx &&
    preInstructions.push(createOutputTokenAccountIx);

  // 1. withdraw 50% liquidity from position
  const withdrawLiquidityDelta = positionState.unlockedLiquidity.div(new BN(2));
  const removeLiquidityTx = await cpAmm._program.methods
    .removeLiquidity({
      liquidityDelta: withdrawLiquidityDelta,
      tokenAAmountThreshold: new BN(0),
      tokenBAmountThreshold: new BN(0),
    })
    .accountsPartial({
      poolAuthority: this.poolAuthority,
      pool: poolAddress,
      position: userPosition.position,
      positionNftAccount: derivePositionNftAccount(positionState.nftMint),
      owner,
      tokenAAccount: tokenAAta,
      tokenBAccount: tokenBAta,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram,
      tokenBProgram,
    })
    .preInstructions(preInstructions)
    .transaction();

  // 2. create new position and add 50% liquidity into new position
  const position = derivePositionAddress(newPositionNft);
  const positionNftAccount = derivePositionNftAccount(newPositionNft);

  const createNewPositionTx = await this._program.methods
    .createPosition()
    .accountsPartial({
      owner,
      positionNftMint: newPositionNft,
      poolAuthority: derivePoolAuthority(),
      positionNftAccount,
      payer: owner,
      pool: poolAddress,
      position,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  // 3. add liquidity to new position

  // re-fetching pool state to get newest sqrtPrice
  poolState = await cpAmm.fetchPoolState(poolAddress);
  let tokenAWithdrawnAmount = getAmountAFromLiquidityDelta(
    withdrawLiquidityDelta,
    poolState.sqrtPrice,
    poolState.sqrtMaxPrice,
    Rounding.Down
  );

  let tokenBWithdrawnAmount = getAmountBFromLiquidityDelta(
    withdrawLiquidityDelta,
    poolState.sqrtPrice,
    poolState.sqrtMinPrice,
    Rounding.Down
  );

  tokenAWithdrawnAmount = tokenAWithdrawnAmount.sub(new BN(toleranceAmount));
  tokenBWithdrawnAmount = tokenBWithdrawnAmount.sub(new BN(toleranceAmount));

  // recalculate liquidity delta
  const newLiquidityDelta = cpAmm.getLiquidityDelta({
    maxAmountTokenA: tokenAWithdrawnAmount,
    maxAmountTokenB: tokenBWithdrawnAmount,
    sqrtMaxPrice: poolState.sqrtMaxPrice,
    sqrtMinPrice: poolState.sqrtMinPrice,
    sqrtPrice: poolState.sqrtPrice,
  });
  const addLiquidityTx = await cpAmm._program.methods
    .addLiquidity({
      liquidityDelta: newLiquidityDelta,
      tokenAAmountThreshold: tokenAWithdrawnAmount,
      tokenBAmountThreshold: tokenBWithdrawnAmount,
    })
    .accountsPartial({
      pool: poolAddress,
      position,
      positionNftAccount,
      owner,
      tokenAAccount: tokenAAta,
      tokenBAccount: tokenBAta,
      tokenAMint: poolState.tokenAMint,
      tokenBMint: poolState.tokenBMint,
      tokenAVault: poolState.tokenAVault,
      tokenBVault: poolState.tokenBVault,
      tokenAProgram,
      tokenBProgram,
    })
    .instruction();

  return new Transaction()
    .add(removeLiquidityTx)
    .add(createNewPositionTx)
    .add(addLiquidityTx);
}
