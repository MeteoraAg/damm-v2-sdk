import { Program, BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import invariant from "invariant";
import Decimal from "decimal.js";

import CpAmmIDL from "./idl/cp_amm.json";
import type { CpAmm as CpAmmTypes } from "./idl/cp_amm";
import {
  Connection,
  Transaction,
  PublicKey,
  Keypair,
  TransactionInstruction,
} from "@solana/web3.js";
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE } from "./constants";
import {
  AddLiquidityParams,
  AmmProgram,
  ClaimPartnerFeeParams,
  ClaimPositionFeeParams,
  ClaimRewardParams,
  ConfigState,
  CreatePoolParams,
  CreatePositionParams,
  FundRewardParams,
  GetQuoteParams,
  InitializeCustomizeablePoolParams,
  LiquidityDeltaParams,
  LockPositionParams,
  PermanentLockParams,
  PoolState,
  PositionState,
  PreparedPoolCreation,
  PreparePoolCreationParams,
  RefreshVestingParams,
  RemoveLiquidityParams,
  SwapParams,
  TxBuilder,
  UpdateRewardDurationParams,
  UpdateRewardFunderParams,
  WithdrawIneligibleRewardParams,
} from "./types";
import {
  deriveCustomizablePoolAddress,
  derivePoolAddress,
  derivePositionAddress,
  derivePositionNftAccount,
} from "./pda";
import { priceToSqrtPrice } from "./math";

import {
  getFeeNumerator,
  getOrCreateATAInstruction,
  getTokenProgram,
  unwrapSOLInstruction,
  wrapSOLInstruction,
} from "./utils";
import {
  calculateSwap,
  getLiquidityDeltaFromAmountA,
  getLiquidityDeltaFromAmountB,
} from "./utils/curve";
import { getMinAmountWithSlippage, getPriceImpact } from "./utils/utils";

export class CpAmm {
  _program: AmmProgram;
  constructor(connection: Connection) {
    this._program = new Program(CpAmmIDL as CpAmmTypes, {
      connection: connection,
    });
  }

  getProgram() {
    return this._program;
  }

  /**
    Prepares token ordering, calculates the initial sqrtPrice in Q64 format,
    @private
    @async
    @param {PublicKey} tokenX - One token mint address in the pair.
    @param {PublicKey} tokenY - The other token mint address in the pair.
    @param {Decimal} initialPrice - The initial price ratio of tokenX/tokenY (will be inverted if needed).
    @param {Decimal} liquidity - The initial liquidity value.
    @returns {PreparedPoolCreation} Object containing the ordered token mints and their Q64 price/liquidity values. 
  */
  private async preparePoolCreationParams(
    params: PreparePoolCreationParams
  ): Promise<PreparedPoolCreation> {
    const { tokenAAmount, tokenBAmount, tokenADecimal, tokenBDecimal } = params;

    const initPrice = tokenBAmount.div(tokenAAmount); // TODO optimize rounding
    const sqrtPriceQ64 = priceToSqrtPrice(
      new Decimal(initPrice.toString()),
      tokenADecimal,
      tokenBDecimal
    );

    if (sqrtPriceQ64.lt(MIN_SQRT_PRICE) || sqrtPriceQ64.gt(MAX_SQRT_PRICE)) {
      throw new Error(`Invalid sqrt price: ${sqrtPriceQ64.toString()}`);
    }

    const liquidityDeltaFromAmountA = getLiquidityDeltaFromAmountA(
      tokenAAmount,
      sqrtPriceQ64,
      MAX_SQRT_PRICE
    );

    const liquidityDeltaFromAmountB = getLiquidityDeltaFromAmountB(
      tokenBAmount,
      MIN_SQRT_PRICE,
      sqrtPriceQ64
    );

    const liquidityQ64 = liquidityDeltaFromAmountA.gte(
      liquidityDeltaFromAmountB
    )
      ? liquidityDeltaFromAmountB
      : liquidityDeltaFromAmountA;

    return {
      sqrtPriceQ64,
      liquidityQ64,
    };
  }

  /**
    Builds a transaction with the provided instructions, setting the blockhash
    and last valid block height under the hood.
    @private
    @async
    @param {PublicKey} feePayer - The public key responsible for paying transaction fees.
    @param {TransactionInstruction[]} instructions - Array of transaction instructions to include.
    @returns {TxBuilder} A Solana Transaction object with the instructions attached. 
  */

  private async buildTransaction(
    feePayer: PublicKey,
    instructions: TransactionInstruction[]
  ): TxBuilder {
    const { blockhash, lastValidBlockHeight } =
      await this._program.provider.connection.getLatestBlockhash("confirmed");
    return new Transaction({
      blockhash,
      lastValidBlockHeight,
      feePayer,
    }).add(...instructions);
  }

  // fetcher
  async fetchConfigState(config: PublicKey): Promise<ConfigState> {
    const configState = await this._program.account.config.fetchNullable(
      config
    );
    invariant(configState, `Config account: ${config} not found`);

    return configState;
  }

  async fetchPoolState(pool: PublicKey): Promise<PoolState> {
    const poolState = await this._program.account.pool.fetchNullable(pool);
    invariant(poolState, `Pool account: ${pool} not found`);

    return poolState;
  }

  async fetchPositionState(position: PublicKey): Promise<PositionState> {
    const positionState = await this._program.account.position.fetchNullable(
      position
    );
    invariant(positionState, `Position account: ${position} not found`);

    return positionState;
  }

  async getQuote(params: GetQuoteParams): Promise<{
    swapInAmount: BN;
    swapOutAmount: BN;
    minSwapOutAmount: BN;
    totalFee: BN;
    priceImpact: number;
  }> {
    const { inAmount, inputTokenMint, slippage, poolState } = params;
    const {
      sqrtPrice: sqrtPriceQ64,
      liquidity: liquidityQ64,
      activationType,
      activationPoint,
      collectFeeMode,
      poolFees,
    } = poolState;
    const {
      feeSchedulerMode,
      cliffFeeNumerator,
      numberOfPeriod,
      reductionFactor,
      periodFrequency,
    } = poolFees.baseFee;
    const dynamicFee = poolFees.dynamicFee;

    const aToB = poolState.tokenAMint.equals(inputTokenMint);
    const slot = await this._program.provider.connection.getSlot();
    const blockInfo = await this._program.provider.connection.getBlock(slot, {
      maxSupportedTransactionVersion: 0,
    });
    const currentTime = blockInfo?.blockTime ?? Math.floor(Date.now() / 1000);
    const currentPoint = activationType ? currentTime : slot;

    let dynamicFeeParams;
    if (dynamicFee.initialized) {
      const { volatilityAccumulator, binStep, variableFeeControl } = dynamicFee;
      dynamicFeeParams = { volatilityAccumulator, binStep, variableFeeControl };
    }

    const tradeFeeNumerator = getFeeNumerator(
      currentPoint,
      activationPoint,
      numberOfPeriod,
      periodFrequency,
      feeSchedulerMode,
      cliffFeeNumerator,
      reductionFactor,
      dynamicFeeParams
    );

    const { amountOutExcludedlpFee, lpFee } = calculateSwap(
      inAmount,
      sqrtPriceQ64,
      liquidityQ64,
      tradeFeeNumerator,
      aToB,
      collectFeeMode
    );
    const minSwapOutAmount = getMinAmountWithSlippage(
      amountOutExcludedlpFee,
      slippage
    );

    return {
      swapInAmount: inAmount,
      swapOutAmount: amountOutExcludedlpFee,
      minSwapOutAmount,
      totalFee: lpFee,
      priceImpact: getPriceImpact(minSwapOutAmount, amountOutExcludedlpFee),
    };
  }

  /**
   * Computes the liquidity delta based on the provided token amounts and pool state.
   *
   * @param {LiquidityDeltaParams} params - The parameters for liquidity calculation, including:
   *   - tokenX: The mint address of token X.
   *   - tokenY: The mint address of token Y.
   *   - maxAmountX: The maximum amount of token X available.
   *   - maxAmountY: The maximum amount of token Y available.
   *   - pool: The address of the liquidity pool.
   *
   * @returns {Promise<BN>} - The computed liquidity delta in Q64 value.
   */
  async getLiquidityDelta(params: LiquidityDeltaParams): Promise<BN> {
    const {
      maxAmountTokenA,
      maxAmountTokenB,
      sqrtMaxPrice,
      sqrtMinPrice,
      sqrtPrice,
    } = params;

    const liquidityDeltaFromAmountA = getLiquidityDeltaFromAmountA(
      maxAmountTokenA,
      sqrtPrice,
      sqrtMaxPrice
    );

    const liquidityDeltaFromAmountB = getLiquidityDeltaFromAmountB(
      maxAmountTokenB,
      sqrtMinPrice,
      sqrtPrice
    );

    return liquidityDeltaFromAmountA.gte(liquidityDeltaFromAmountB)
      ? liquidityDeltaFromAmountB
      : liquidityDeltaFromAmountA;
  }

  async createPool(params: CreatePoolParams): TxBuilder {
    const {
      payer,
      creator,
      config,
      tokenAMint,
      tokenBMint,
      activationPoint,
      tokenAAmount,
      tokenBAmount,
      tokenADecimal,
      tokenBDecimal,
    } = params;

    const { sqrtPriceQ64, liquidityQ64 } = await this.preparePoolCreationParams(
      {
        tokenAAmount,
        tokenBAmount,
        tokenADecimal,
        tokenBDecimal,
      }
    );

    const pool = derivePoolAddress(
      config,
      tokenAMint,
      tokenBMint,
      this._program.programId
    );
    const positionNft = Keypair.generate();
    const tokenAProgram = (
      await this._program.provider.connection.getParsedAccountInfo(tokenAMint)
    )?.value?.owner;

    const tokenBProgram = (
      await this._program.provider.connection.getParsedAccountInfo(tokenBMint)
    )?.value?.owner;

    const payerTokenA = getAssociatedTokenAddressSync(
      tokenAMint,
      payer,
      true,
      tokenAProgram
    );
    const payerTokenB = getAssociatedTokenAddressSync(
      tokenBMint,
      payer,
      true,
      tokenBProgram
    );

    const instructions = await this._program.methods
      .initializePool({
        liquidity: liquidityQ64,
        sqrtPrice: sqrtPriceQ64,
        activationPoint: activationPoint,
      })
      .accounts({
        creator,
        positionNftMint: positionNft.publicKey,
        payer: payer,
        config,
        pool,
        tokenAMint,
        tokenBMint,
        payerTokenA,
        payerTokenB,
        tokenAProgram,
        tokenBProgram,
      })
      .instruction();

    const tx = await this.buildTransaction(payer, [instructions]);
    tx.partialSign(positionNft);

    return tx;
  }

  async createCustomPool(params: InitializeCustomizeablePoolParams): Promise<{
    tx: Transaction;
    pool: PublicKey;
    position: PublicKey;
  }> {
    const {
      tokenAMint,
      tokenBMint,
      tokenAAmount,
      tokenBAmount,
      tokenADecimal,
      tokenBDecimal,
      payer,
      creator,
      positionNft,
      poolFees,
      hasAlphaVault,
      collectFeeMode,
      activationPoint,
      activationType,
    } = params;

    const { sqrtPriceQ64, liquidityQ64 } = await this.preparePoolCreationParams(
      {
        tokenAAmount,
        tokenBAmount,
        tokenADecimal,
        tokenBDecimal,
      }
    );

    const pool = deriveCustomizablePoolAddress(
      tokenAMint,
      tokenBMint,
      this._program.programId
    );
    const position = derivePositionAddress(
      positionNft,
      this._program.programId
    );
    const tokenAProgram = (
      await this._program.provider.connection.getAccountInfo(tokenAMint)
    ).owner;

    const tokenBProgram = (
      await this._program.provider.connection.getAccountInfo(tokenBMint)
    ).owner;

    const preInstructions = [];
    const [
      { ataPubkey: payerTokenA, ix: createTokenATokenAccountIx },
      { ataPubkey: payerTokenB, ix: createTokenBTokenAccountIx },
    ] = await Promise.all([
      getOrCreateATAInstruction(
        this._program.provider.connection,
        tokenAMint,
        payer,
        payer,
        true,
        tokenAProgram
      ),
      getOrCreateATAInstruction(
        this._program.provider.connection,
        tokenBMint,
        payer,
        payer,
        true,
        tokenBProgram
      ),
    ]);

    createTokenATokenAccountIx &&
      preInstructions.push(createTokenATokenAccountIx);
    createTokenBTokenAccountIx &&
      preInstructions.push(createTokenBTokenAccountIx);

    if (tokenAMint.equals(NATIVE_MINT)) {
      const wrapSOLIx = wrapSOLInstruction(
        payer,
        payerTokenA,
        BigInt(tokenAAmount.toString())
      );

      preInstructions.push(...wrapSOLIx);
    }

    if (tokenBMint.equals(NATIVE_MINT)) {
      const wrapSOLIx = wrapSOLInstruction(
        payer,
        payerTokenB,
        BigInt(tokenBAmount.toString())
      );

      preInstructions.push(...wrapSOLIx);
    }

    const transaction = await this._program.methods
      .initializeCustomizablePool({
        poolFees,
        sqrtMinPrice: MIN_SQRT_PRICE,
        sqrtMaxPrice: MAX_SQRT_PRICE,
        hasAlphaVault,
        liquidity: liquidityQ64,
        sqrtPrice: sqrtPriceQ64,
        activationType,
        collectFeeMode,
        activationPoint,
      })
      .accounts({
        creator,
        positionNftMint: positionNft,
        payer: payer,
        pool,
        tokenAMint,
        tokenBMint,
        payerTokenA,
        payerTokenB,
        tokenAProgram,
        tokenBProgram,
      })
      .preInstructions(preInstructions)
      .transaction();

    return { tx: transaction, pool, position };
  }

  async createPosition(params: CreatePositionParams): TxBuilder {
    const { owner, payer, pool, positionNft } = params;

    const instructions = await this._program.methods
      .createPosition()
      .accounts({
        owner,
        positionNftMint: positionNft,
        payer: payer,
        pool,
      })
      .instruction();

    return await this.buildTransaction(payer, [instructions]);
  }

  async addLiquidity(params: AddLiquidityParams): TxBuilder {
    const {
      owner,
      position,
      positionNftMint,
      liquidityDeltaQ64,
      maxAmountTokenA,
      maxAmountTokenB,
      tokenAAmountThreshold,
      tokenBAmountThreshold,
      tokenAMint,
      tokenBMint,
      tokenAProgram,
      tokenBProgram,
    } = params;
    const positionNftAccount = derivePositionNftAccount(
      positionNftMint,
      this._program.programId
    );

    const preInstructions: TransactionInstruction[] = [];
    const [
      { ataPubkey: tokenAAccount, ix: createTokenATokenAccountIx },
      { ataPubkey: tokenBAccount, ix: createTokenBTokenAccountIx },
    ] = await Promise.all([
      getOrCreateATAInstruction(
        this._program.provider.connection,
        tokenAMint,
        owner,
        owner,
        true,
        tokenAProgram
      ),
      getOrCreateATAInstruction(
        this._program.provider.connection,
        tokenBMint,
        owner,
        owner,
        true,
        tokenBProgram
      ),
    ]);

    createTokenATokenAccountIx &&
      preInstructions.push(createTokenATokenAccountIx);
    createTokenBTokenAccountIx &&
      preInstructions.push(createTokenBTokenAccountIx);

    if (tokenAMint.equals(NATIVE_MINT)) {
      const wrapSOLIx = wrapSOLInstruction(
        owner,
        tokenAAccount,
        BigInt(maxAmountTokenA.toString())
      );

      preInstructions.push(...wrapSOLIx);
    }

    if (tokenBMint.equals(NATIVE_MINT)) {
      const wrapSOLIx = wrapSOLInstruction(
        owner,
        tokenBAccount,
        BigInt(maxAmountTokenB.toString())
      );

      preInstructions.push(...wrapSOLIx);
    }

    const postInstructions: TransactionInstruction[] = [];
    if (
      [tokenAMint.toBase58(), tokenBMint.toBase58()].includes(
        NATIVE_MINT.toBase58()
      )
    ) {
      const closeWrappedSOLIx = await unwrapSOLInstruction(owner);
      closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);
    }
    const instructions = await this._program.methods
      .addLiquidity({
        liquidityDelta: liquidityDeltaQ64,
        tokenAAmountThreshold,
        tokenBAmountThreshold,
      })
      .accounts({
        position,
        positionNftAccount,
        owner: owner,
        tokenAAccount,
        tokenBAccount,
        tokenAProgram,
        tokenBProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .instruction();

    return await this.buildTransaction(owner, [instructions]);
  }

  async removeLiquidity(params: RemoveLiquidityParams): TxBuilder {
    const {
      owner,
      position,
      positionNftMint,
      liquidityDeltaQ64,
      tokenAAmountThreshold,
      tokenBAmountThreshold,
      tokenAMint,
      tokenBMint,
      tokenAProgram,
      tokenBProgram,
    } = params;
    const positionNftAccount = derivePositionNftAccount(
      positionNftMint,
      this._program.programId
    );

    const preInstructions: TransactionInstruction[] = [];
    const [
      { ataPubkey: tokenAAccount, ix: createTokenAAccountIx },
      { ataPubkey: tokenBAccount, ix: createTokenBAccountIx },
    ] = await Promise.all([
      getOrCreateATAInstruction(
        this._program.provider.connection,
        tokenAMint,
        owner,
        owner,
        true,
        tokenAProgram
      ),
      getOrCreateATAInstruction(
        this._program.provider.connection,
        tokenBMint,
        owner,
        owner,
        true,
        tokenBProgram
      ),
    ]);
    createTokenAAccountIx && preInstructions.push(createTokenAAccountIx);
    createTokenBAccountIx && preInstructions.push(createTokenBAccountIx);

    const postInstructions: TransactionInstruction[] = [];
    if (
      [tokenAMint.toBase58(), tokenBMint.toBase58()].includes(
        NATIVE_MINT.toBase58()
      )
    ) {
      const closeWrappedSOLIx = await unwrapSOLInstruction(owner);
      closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);
    }

    const instructions = await this._program.methods
      .removeLiquidity({
        liquidityDelta: liquidityDeltaQ64,
        tokenAAmountThreshold,
        tokenBAmountThreshold,
      })
      .accounts({
        position,
        positionNftAccount,
        owner: owner,
        tokenAAccount,
        tokenBAccount,
        tokenAProgram,
        tokenBProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .instruction();

    return await this.buildTransaction(owner, [instructions]);
  }

  async swap(params: SwapParams): TxBuilder {
    const {
      payer,
      pool,
      inputTokenMint,
      outputTokenMint,
      amountIn,
      minimumAmountOut,
      tokenAMint,
      tokenBMint,
      tokenAProgram,
      tokenBProgram,
      referralTokenAccount,
    } = params;

    const preInstructions: TransactionInstruction[] = [];
    const [
      { ataPubkey: inputTokenAccount, ix: createInputTokenAccountIx },
      { ataPubkey: outputTokenAccount, ix: createOutputTokenAccountIx },
    ] = await Promise.all([
      getOrCreateATAInstruction(
        this._program.provider.connection,
        inputTokenMint,
        payer,
        payer,
        true,
        tokenAProgram
      ),
      getOrCreateATAInstruction(
        this._program.provider.connection,
        outputTokenMint,
        payer,
        payer,
        true,
        tokenBProgram
      ),
    ]);
    createInputTokenAccountIx &&
      preInstructions.push(createInputTokenAccountIx);
    createOutputTokenAccountIx &&
      preInstructions.push(createOutputTokenAccountIx);

    if (inputTokenMint.equals(NATIVE_MINT)) {
      const wrapSOLIx = wrapSOLInstruction(
        payer,
        inputTokenAccount,
        BigInt(amountIn.toString())
      );

      preInstructions.push(...wrapSOLIx);
    }

    const postInstructions: TransactionInstruction[] = [];
    if (outputTokenMint.equals(NATIVE_MINT)) {
      const closeWrappedSOLIx = await unwrapSOLInstruction(payer);
      closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);
    }

    const instructions = await this._program.methods
      .swap({
        amountIn,
        minimumAmountOut,
      })
      .accounts({
        pool,
        payer: payer,
        inputTokenAccount,
        outputTokenAccount,
        tokenAMint: tokenAMint,
        tokenBMint: tokenBMint,
        tokenAProgram,
        tokenBProgram,
        referralTokenAccount,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .instruction();

    return await this.buildTransaction(payer, [instructions]);
  }

  async lockPosition(params: LockPositionParams): TxBuilder {
    const {
      owner,
      payer,
      vestingAccount,
      position,
      positionNftMint,
      pool,
      cliffPoint,
      periodFrequency,
      cliffUnlockLiquidity,
      liquidityPerPeriod,
      numberOfPeriod,
      vestings,
    } = params;
    const positionNftAccount = derivePositionNftAccount(
      positionNftMint,
      this._program.programId
    );

    const lockPositionParams = {
      cliffPoint,
      periodFrequency,
      cliffUnlockLiquidity,
      liquidityPerPeriod,
      numberOfPeriod,
      index: vestings.length,
    };
    const instructions = await this._program.methods
      .lockPosition(lockPositionParams)
      .accounts({
        position,
        positionNftAccount,
        vesting: vestingAccount,
        owner: owner,
        payer: payer,
      })
      .instruction();

    return await this.buildTransaction(owner, [instructions]);
  }

  async permanentLockPosition(params: PermanentLockParams): TxBuilder {
    const { owner, position, positionNftMint, pool, unlockedLiquidity } =
      params;
    const positionNftAccount = derivePositionNftAccount(
      positionNftMint,
      this._program.programId
    );

    const instructions = await this._program.methods
      .permanentLockPosition(unlockedLiquidity)
      .accounts({
        position,
        positionNftAccount,
        owner,
      })
      .instruction();

    return await this.buildTransaction(owner, [instructions]);
  }

  async refreshVesting(params: RefreshVestingParams): TxBuilder {
    const { owner, position, positionNftMint, pool, vestings } = params;
    const positionNftAccount = derivePositionNftAccount(
      positionNftMint,
      this._program.programId
    );

    const instructions = await this._program.methods
      .refreshVesting()
      .accounts({
        position,
        positionNftAccount,
        owner,
      })
      .remainingAccounts(
        vestings.map((pubkey: PublicKey) => {
          return {
            isSigner: false,
            isWritable: true,
            pubkey,
          };
        })
      )
      .instruction();

    return await this.buildTransaction(owner, [instructions]);
  }

  async claimPositionFee(params: ClaimPositionFeeParams): TxBuilder {
    const {
      owner,
      position,
      nftPositionMint,
      tokenAMint,
      tokenBMint,
      tokenAProgram,
      tokenBProgram,
    } = params;

    const positionNftAccount = derivePositionNftAccount(
      nftPositionMint,
      this._program.programId
    );

    const preInstructions: TransactionInstruction[] = [];
    const [
      { ataPubkey: tokenAAccount, ix: createTokenAAccountIx },
      { ataPubkey: tokenBAccount, ix: createTokenBAccountIx },
    ] = await Promise.all([
      getOrCreateATAInstruction(
        this._program.provider.connection,
        tokenAMint,
        owner,
        owner,
        true,
        tokenAProgram
      ),
      getOrCreateATAInstruction(
        this._program.provider.connection,
        tokenBMint,
        owner,
        owner,
        true,
        tokenBProgram
      ),
    ]);
    createTokenAAccountIx && preInstructions.push(createTokenAAccountIx);
    createTokenBAccountIx && preInstructions.push(createTokenBAccountIx);

    const postInstructions: TransactionInstruction[] = [];
    if (
      [tokenAMint.toBase58(), tokenBMint.toBase58()].includes(
        NATIVE_MINT.toBase58()
      )
    ) {
      const closeWrappedSOLIx = await unwrapSOLInstruction(owner);
      closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);
    }

    const instructions = await this._program.methods
      .claimPositionFee()
      .accounts({
        owner: owner,
        position,
        positionNftAccount,
        tokenAAccount,
        tokenBAccount,
        tokenAProgram,
        tokenBProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .instruction();

    return await this.buildTransaction(owner, [instructions]);
  }

  async updateRewardDuration(params: UpdateRewardDurationParams): TxBuilder {
    const { pool, admin, rewardIndex, newDuration } = params;
    const instruction = await this._program.methods
      .updateRewardDuration(rewardIndex, newDuration)
      .accounts({
        pool,
        admin: admin,
      })
      .instruction();

    return await this.buildTransaction(admin, [instruction]);
  }

  async updateRewardFunder(params: UpdateRewardFunderParams): TxBuilder {
    const { pool, admin, rewardIndex, newFunder } = params;
    const instruction = await this._program.methods
      .updateRewardFunder(rewardIndex, newFunder)
      .accounts({
        pool,
        admin: admin,
      })
      .instruction();

    return await this.buildTransaction(admin, [instruction]);
  }

  async fundReward(params: FundRewardParams): TxBuilder {
    const { rewardIndex, carryForward, pool, funder, amount } = params;

    const poolState = await this.fetchPoolState(pool);
    const rewardInfo = poolState.rewardInfos[rewardIndex];
    const { vault, mint } = rewardInfo;
    const tokenProgram = getTokenProgram(rewardIndex);

    const preInstructions: TransactionInstruction[] = [];

    const { ataPubkey: funderTokenAccount, ix: createFunderTokenAccountIx } =
      await getOrCreateATAInstruction(
        this._program.provider.connection,
        mint,
        funder,
        funder,
        true,
        tokenProgram
      );

    createFunderTokenAccountIx &&
      preInstructions.push(createFunderTokenAccountIx);

    // TODO: check case reward mint is wSOL && carryForward is true => total amount > amount
    if (mint.equals(NATIVE_MINT) && !amount.isZero()) {
      const wrapSOLIx = wrapSOLInstruction(
        funder,
        funderTokenAccount,
        BigInt(amount.toString())
      );

      preInstructions.push(...wrapSOLIx);
    }

    const instruction = await this._program.methods
      .fundReward(rewardIndex, amount, carryForward)
      .accounts({
        pool,
        rewardVault: vault,
        rewardMint: mint,
        funderTokenAccount,
        funder: funder,
        tokenProgram,
      })
      .instruction();

    return await this.buildTransaction(funder, [instruction]);
  }

  async withdrawIneligibleReward(
    params: WithdrawIneligibleRewardParams
  ): TxBuilder {
    const { rewardIndex, pool, funder } = params;

    const poolState = await this.fetchPoolState(pool);

    const rewardInfo = poolState.rewardInfos[rewardIndex];
    const { mint, vault, rewardTokenFlag } = rewardInfo;
    const tokenProgram = getTokenProgram(rewardTokenFlag);

    const preInstructions: TransactionInstruction[] = [];
    const postInstructions: TransactionInstruction[] = [];
    const { ataPubkey: funderTokenAccount, ix: createFunderTokenAccountIx } =
      await getOrCreateATAInstruction(
        this._program.provider.connection,
        mint,
        funder,
        funder,
        true,
        tokenProgram
      );
    createFunderTokenAccountIx &&
      preInstructions.push(createFunderTokenAccountIx);

    if (mint.equals(NATIVE_MINT)) {
      const closeWrappedSOLIx = await unwrapSOLInstruction(funder);
      closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);
    }

    const instruction = await this._program.methods
      .withdrawIneligibleReward(rewardIndex)
      .accounts({
        pool,
        rewardVault: vault,
        rewardMint: mint,
        funderTokenAccount,
        funder: funder,
        tokenProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .instruction();

    return await this.buildTransaction(funder, [instruction]);
  }

  async claimPartnerFee(params: ClaimPartnerFeeParams): TxBuilder {
    const { partner, pool, maxAmountA, maxAmountB } = params;
    const poolState = await this.fetchPoolState(pool);
    const { tokenAFlag, tokenBFlag } = poolState;

    const tokenAProgram = getTokenProgram(tokenAFlag);
    const tokenBProgram = getTokenProgram(tokenBFlag);

    const preInstructions: TransactionInstruction[] = [];
    const [
      { ataPubkey: tokenAAccount, ix: createTokenAAccountIx },
      { ataPubkey: tokenBAccount, ix: createTokenBAccountIx },
    ] = await Promise.all([
      getOrCreateATAInstruction(
        this._program.provider.connection,
        poolState.tokenAMint,
        partner,
        partner,
        true,
        tokenAProgram
      ),
      getOrCreateATAInstruction(
        this._program.provider.connection,
        poolState.tokenBMint,
        partner,
        partner,
        true,
        tokenBProgram
      ),
    ]);
    createTokenAAccountIx && preInstructions.push(createTokenAAccountIx);
    createTokenBAccountIx && preInstructions.push(createTokenBAccountIx);

    const postInstructions: TransactionInstruction[] = [];
    if (
      [
        poolState.tokenAMint.toBase58(),
        poolState.tokenBMint.toBase58(),
      ].includes(NATIVE_MINT.toBase58())
    ) {
      const closeWrappedSOLIx = await unwrapSOLInstruction(partner);
      closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);
    }

    const instruction = await this._program.methods
      .claimPartnerFee(maxAmountA, maxAmountB)
      .accounts({
        pool,
        tokenAAccount,
        tokenBAccount,
        tokenAProgram,
        tokenBProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .instruction();

    return await this.buildTransaction(partner, [instruction]);
  }

  async claimReward(params: ClaimRewardParams): TxBuilder {
    const { user, position, rewardIndex } = params;

    const positionState = await this.fetchPositionState(position);
    const poolState = await this.fetchPoolState(positionState.pool);

    const positionNftAccount = derivePositionNftAccount(
      positionState.nftMint,
      this._program.programId
    );

    const rewardInfo = poolState.rewardInfos[rewardIndex];
    const tokenProgram = getTokenProgram(rewardInfo.rewardTokenFlag);

    const preInstructions: TransactionInstruction[] = [];
    const postInstructions: TransactionInstruction[] = [];
    const { ataPubkey: userTokenAccount, ix: createUserTokenAccountIx } =
      await getOrCreateATAInstruction(
        this._program.provider.connection,
        rewardInfo.mint,
        user,
        user,
        true,
        tokenProgram
      );
    createUserTokenAccountIx && preInstructions.push(createUserTokenAccountIx);

    if (rewardInfo.mint.equals(NATIVE_MINT)) {
      const closeWrappedSOLIx = await unwrapSOLInstruction(user);
      closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);
    }
    const instructions = await this._program.methods
      .claimReward(rewardIndex)
      .accounts({
        positionNftAccount,
        rewardVault: rewardInfo.vault,
        rewardMint: rewardInfo.mint,
        position,
        userTokenAccount,
        owner: user,
        tokenProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .instruction();

    return await this.buildTransaction(user, [instructions]);
  }
}
