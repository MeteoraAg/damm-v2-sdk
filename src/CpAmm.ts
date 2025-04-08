import { Program, BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import invariant from "invariant";

import CpAmmIDL from "./idl/cp_amm.json";
import type { CpAmm as CpAmmTypes } from "./idl/cp_amm";
import {
  Connection,
  Transaction,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE } from "./constants";
import {
  AddLiquidityParams,
  AmmProgram,
  ClaimPartnerFeeParams,
  ClaimPositionFeeParams,
  ClaimRewardParams,
  ClosePositionParams,
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
  RemoveAllLiquidityParams,
  RemoveLiquidityParams,
  SwapParams,
  TxBuilder,
  UpdateRewardDurationParams,
  UpdateRewardFunderParams,
  VestingState,
  WithdrawIneligibleRewardParams,
} from "./types";
import {
  deriveCustomizablePoolAddress,
  deriveEventAuthority,
  derivePoolAddress,
  derivePoolAuthority,
  derivePositionAddress,
  derivePositionNftAccount,
  deriveTokenVaultAddress,
} from "./pda";

import {
  getFeeNumerator,
  getNftOwner,
  getOrCreateATAInstruction,
  getTokenProgram,
  unwrapSOLInstruction,
  wrapSOLInstruction,
  getSwapAmount,
  getLiquidityDeltaFromAmountA,
  getLiquidityDeltaFromAmountB,
  getMinAmountWithSlippage,
  getPriceImpact,
  positionByPoolFilter,
  vestingByPositionFilter,
  calculateInitSqrtPrice,
} from "./helpers";

/**
 * CpAmm SDK class to interact with the Dynamic CP-AMM
 */
export class CpAmm {
  _program: AmmProgram;
  constructor(connection: Connection) {
    this._program = new Program(CpAmmIDL as CpAmmTypes, {
      connection: connection,
    });
  }

  /**
   * Returns the Anchor program instance.
   * @returns The AmmProgram instance.
   */
  getProgram() {
    return this._program;
  }

  /**
   * Prepares parameters required for pool creation, including initial sqrt price and liquidity.
   * @private
   * @param {PreparePoolCreationParams} params - Initial token amounts for pool creation.
   * @returns init sqrt price and liquidity in Q64 format.
   */
  private async preparePoolCreationParams(
    params: PreparePoolCreationParams
  ): Promise<PreparedPoolCreation> {
    const { tokenAAmount, tokenBAmount, minSqrtPrice, maxSqrtPrice } = params;

    if (tokenAAmount.eq(new BN(0)) && tokenBAmount.eq(new BN(0))) {
      throw new Error("Invalid input amount");
    }

    if (minSqrtPrice.gt(maxSqrtPrice)) {
      throw new Error("Invalid sqrtPrice");
    }

    const sqrtPriceQ64 = calculateInitSqrtPrice(
      tokenAAmount,
      tokenBAmount,
      minSqrtPrice,
      maxSqrtPrice
    );

    const liquidityDeltaFromAmountA = getLiquidityDeltaFromAmountA(
      tokenAAmount,
      sqrtPriceQ64,
      maxSqrtPrice
    );

    const liquidityDeltaFromAmountB = getLiquidityDeltaFromAmountB(
      tokenBAmount,
      minSqrtPrice,
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
   * Fetches the Config state of the program.
   * @param config - Public key of the config account.
   * @returns Parsed ConfigState.
   */
  async fetchConfigState(config: PublicKey): Promise<ConfigState> {
    const configState = await this._program.account.config.fetchNullable(
      config
    );
    invariant(configState, `Config account: ${config} not found`);

    return configState;
  }

  /**
   * Fetches the Pool state.
   * @param pool - Public key of the pool.
   * @returns Parsed PoolState.
   */
  async fetchPoolState(pool: PublicKey): Promise<PoolState> {
    const poolState = await this._program.account.pool.fetchNullable(pool);
    invariant(poolState, `Pool account: ${pool} not found`);

    return poolState;
  }

  /**
   * Fetches the Position state.
   * @param position - Public key of the position.
   * @returns Parsed PositionState.
   */
  async fetchPositionState(position: PublicKey): Promise<PositionState> {
    const positionState = await this._program.account.position.fetchNullable(
      position
    );
    invariant(positionState, `Position account: ${position} not found`);

    return positionState;
  }

  /**
   * Retrieves all config accounts.
   * @returns Array of config public keys and their states.
   */
  async getAllConfigs(): Promise<
    Array<{ publicKey: PublicKey; account: ConfigState }>
  > {
    const configAccounts = await this._program.account.config.all();

    return configAccounts;
  }

  /**
   * Retrieves all pool accounts.
   * @returns Array of pool public keys and their states.
   */
  async getAllPools(): Promise<
    Array<{ publicKey: PublicKey; account: PoolState }>
  > {
    const poolAccounts = await this._program.account.pool.all();

    return poolAccounts;
  }

  /**
   * Retrieves all position accounts.
   * @returns Array of position public keys and their states.
   */
  async getAllPositions(): Promise<
    Array<{
      publicKey: PublicKey;
      account: PositionState;
    }>
  > {
    const poolAccounts = await this._program.account.position.all();

    return poolAccounts;
  }

  /**
   * Gets all positions a specific pool.
   * @param pool - Public key of the pool.
   * @returns List of user positions for the pool.
   */
  async getAllPositionsByPool(pool: PublicKey): Promise<
    Array<{
      publicKey: PublicKey;
      account: PositionState;
    }>
  > {
    return await this._program.account.position.all([
      positionByPoolFilter(pool),
    ]);
  }

  /**
   * Gets all positions of a user for a specific pool.
   * @param pool - Public key of the pool.
   * @param user - Public key of the user.
   * @returns List of user positions for the pool.
   */
  async getUserPositionByPool(
    pool: PublicKey,
    user: PublicKey
  ): Promise<
    Array<{
      publicKey: PublicKey;
      account: PositionState;
    }>
  > {
    const positions = await this._program.account.position.all([
      positionByPoolFilter(pool),
    ]);
    const result: Array<{
      publicKey: PublicKey;
      account: PositionState;
    }> = [];
    for (const position of positions) {
      const owner = await getNftOwner(
        this._program.provider.connection,
        position.account.nftMint
      );
      if (owner.equals(user)) {
        result.push(position);
      }
    }
    return result;
  }

  /**
   * Gets all positions of a user across all pools.
   * @param user - Public key of the user.
   * @returns Array of user positions.
   */
  async getPositionsByUser(user: PublicKey): Promise<
    Array<{
      publicKey: PublicKey;
      account: PositionState;
    }>
  > {
    const positions = await this._program.account.position.all();
    const result: Array<{
      publicKey: PublicKey;
      account: PositionState;
    }> = [];
    for (const position of positions) {
      const owner = await getNftOwner(
        this._program.provider.connection,
        position.account.nftMint
      );
      if (owner.equals(user)) {
        result.push(position);
      }
    }
    return result;
  }

  async getAllVestingsByPosition(position: PublicKey): Promise<
    Array<{
      publicKey: PublicKey;
      account: VestingState;
    }>
  > {
    const vestings = await this._program.account.vesting.all([
      vestingByPositionFilter(position),
    ]);

    return vestings;
  }

  /**
   * Calculates swap quote based on input amount and pool state.
   * @param params - Swap parameters including input amount, pool state, slippage, etc.
   * @returns Swap quote including expected output amount, fee, and price impact.
   */
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

    const { actualOutAmount, totalFee } = getSwapAmount(
      inAmount,
      sqrtPriceQ64,
      liquidityQ64,
      tradeFeeNumerator,
      aToB,
      collectFeeMode
    );
    const minSwapOutAmount = getMinAmountWithSlippage(
      actualOutAmount,
      slippage
    );

    return {
      swapInAmount: inAmount,
      swapOutAmount: actualOutAmount,
      minSwapOutAmount,
      totalFee,
      priceImpact: getPriceImpact(minSwapOutAmount, actualOutAmount),
    };
  }

  /**
   * Computes the liquidity delta based on the provided token amounts and pool state.
   *
   * @param {LiquidityDeltaParams} params - The parameters for liquidity calculation
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

  /**
   * Builds a transaction to create a permissionless pool.
   * @param params - Parameters for pool creation.
   * @returns Transaction builder.
   */
  async createPool(params: CreatePoolParams): TxBuilder {
    const {
      payer,
      creator,
      config,
      positionNft,
      tokenAMint,
      tokenBMint,
      activationPoint,
      tokenAAmount,
      tokenBAmount,
      minSqrtPrice,
      maxSqrtPrice,
      tokenADecimal,
      tokenBDecimal,
      tokenAProgram,
      tokenBProgram,
    } = params;

    const { sqrtPriceQ64, liquidityQ64 } = await this.preparePoolCreationParams(
      {
        tokenAAmount,
        tokenBAmount,
        minSqrtPrice,
        maxSqrtPrice,
        tokenADecimal,
        tokenBDecimal,
      }
    );

    const poolAuthority = derivePoolAuthority(this._program.programId);

    const pool = derivePoolAddress(
      config,
      tokenAMint,
      tokenBMint,
      this._program.programId
    );

    const position = derivePositionAddress(
      positionNft,
      this._program.programId
    );
    const positionNftAccount = derivePositionNftAccount(
      positionNft,
      this._program.programId
    );

    const tokenAVault = deriveTokenVaultAddress(
      tokenAMint,
      pool,
      this._program.programId
    );
    const tokenBVault = deriveTokenVaultAddress(
      tokenBMint,
      pool,
      this._program.programId
    );

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

    const tx = await this._program.methods
      .initializePool({
        liquidity: liquidityQ64,
        sqrtPrice: sqrtPriceQ64,
        activationPoint: activationPoint,
      })
      .accountsStrict({
        creator,
        positionNftAccount,
        positionNftMint: positionNft,
        payer: payer,
        config,
        poolAuthority,
        pool,
        position,
        tokenAMint,
        tokenBMint,
        tokenAVault,
        tokenBVault,
        payerTokenA,
        payerTokenB,
        token2022Program: TOKEN_2022_PROGRAM_ID,
        tokenAProgram,
        tokenBProgram,
        systemProgram: SystemProgram.programId,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .preInstructions(preInstructions)
      .transaction();

    return tx;
  }

  /**
   * Builds a transaction to create a customizable pool.
   * @param params - Parameters for customizable pool creation.
   * @returns Transaction and related addresses.
   */
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
      minSqrtPrice,
      maxSqrtPrice,
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
      tokenAProgram,
      tokenBProgram,
    } = params;

    const { sqrtPriceQ64, liquidityQ64 } = await this.preparePoolCreationParams(
      {
        tokenAAmount,
        tokenBAmount,
        minSqrtPrice,
        maxSqrtPrice,
        tokenADecimal,
        tokenBDecimal,
      }
    );
    const poolAuthority = derivePoolAuthority(this._program.programId);
    const pool = deriveCustomizablePoolAddress(
      tokenAMint,
      tokenBMint,
      this._program.programId
    );
    const position = derivePositionAddress(
      positionNft,
      this._program.programId
    );
    const positionNftAccount = derivePositionNftAccount(
      positionNft,
      this._program.programId
    );

    const tokenAVault = deriveTokenVaultAddress(
      tokenAMint,
      pool,
      this._program.programId
    );
    const tokenBVault = deriveTokenVaultAddress(
      tokenBMint,
      pool,
      this._program.programId
    );

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
      .accountsStrict({
        creator,
        positionNftAccount,
        positionNftMint: positionNft,
        payer: payer,
        poolAuthority,
        pool,
        position,
        tokenAMint,
        tokenBMint,
        tokenAVault,
        tokenBVault,
        payerTokenA,
        payerTokenB,
        token2022Program: TOKEN_2022_PROGRAM_ID,
        tokenAProgram,
        tokenBProgram,
        systemProgram: SystemProgram.programId,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .preInstructions(preInstructions)
      .transaction();

    return { tx: transaction, pool, position };
  }

  /**
   * Builds a transaction to create a position.
   * @param {CreatePositionParams} params - Parameters for position creation.
   * @returns Transaction builder.
   */
  async createPosition(params: CreatePositionParams): TxBuilder {
    const { owner, payer, pool, positionNft } = params;
    const poolAuthority = derivePoolAuthority(this._program.programId);

    const position = derivePositionAddress(
      positionNft,
      this._program.programId
    );
    const positionNftAccount = derivePositionNftAccount(
      positionNft,
      this._program.programId
    );

    return await this._program.methods
      .createPosition()
      .accountsStrict({
        owner,
        positionNftMint: positionNft,
        poolAuthority,
        positionNftAccount,
        payer: payer,
        pool,
        position,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .transaction();
  }

  /**
   * Builds a transaction to add liquidity to an existing position.
   * @param {AddLiquidityParams} params - Parameters for adding liquidity.
   * @returns Transaction builder.
   */
  async addLiquidity(params: AddLiquidityParams): TxBuilder {
    const {
      owner,
      pool,
      position,
      positionNftMint,
      liquidityDeltaQ64,
      maxAmountTokenA,
      maxAmountTokenB,
      tokenAAmountThreshold,
      tokenBAmountThreshold,
      tokenAMint,
      tokenBMint,
      tokenAVault,
      tokenBVault,
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
    return await this._program.methods
      .addLiquidity({
        liquidityDelta: liquidityDeltaQ64,
        tokenAAmountThreshold,
        tokenBAmountThreshold,
      })
      .accountsStrict({
        pool,
        position,
        positionNftAccount,
        owner: owner,
        tokenAAccount,
        tokenBAccount,
        tokenAMint: tokenAMint,
        tokenBMint: tokenBMint,
        tokenAVault,
        tokenBVault,
        tokenAProgram,
        tokenBProgram,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();
  }

  /**
   * Builds a transaction to remove liquidity from a position.
   * @param {RemoveLiquidityParams} params - Parameters for removing liquidity.
   * @returns Transaction builder.
   */
  async removeLiquidity(params: RemoveLiquidityParams): TxBuilder {
    const {
      owner,
      pool,
      position,
      positionNftMint,
      liquidityDeltaQ64,
      tokenAAmountThreshold,
      tokenBAmountThreshold,
      tokenAMint,
      tokenBMint,
      tokenAVault,
      tokenBVault,
      tokenAProgram,
      tokenBProgram,
    } = params;
    const positionNftAccount = derivePositionNftAccount(
      positionNftMint,
      this._program.programId
    );

    const poolAuthority = derivePoolAuthority(this._program.programId);

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

    return await this._program.methods
      .removeLiquidity({
        liquidityDelta: liquidityDeltaQ64,
        tokenAAmountThreshold,
        tokenBAmountThreshold,
      })
      .accountsStrict({
        poolAuthority,
        pool,
        position,
        positionNftAccount,
        owner,
        tokenAAccount,
        tokenBAccount,
        tokenAMint,
        tokenBMint,
        tokenAVault,
        tokenBVault,
        tokenAProgram,
        tokenBProgram,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();
  }

  /**
   * Builds a transaction to remove liquidity from a position.
   * @param {RemoveLiquidityParams} params - Parameters for removing liquidity.
   * @returns Transaction builder.
   */
  async removeAllLiquidity(params: RemoveAllLiquidityParams): TxBuilder {
    const {
      owner,
      pool,
      position,
      positionNftMint,
      tokenAAmountThreshold,
      tokenBAmountThreshold,
      tokenAMint,
      tokenBMint,
      tokenAVault,
      tokenBVault,
      tokenAProgram,
      tokenBProgram,
    } = params;
    const positionNftAccount = derivePositionNftAccount(
      positionNftMint,
      this._program.programId
    );

    const poolAuthority = derivePoolAuthority(this._program.programId);

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

    return await this._program.methods
      .removeAllLiquidity(tokenAAmountThreshold, tokenBAmountThreshold)
      .accountsPartial({
        poolAuthority,
        pool,
        position,
        positionNftAccount,
        owner,
        tokenAAccount,
        tokenBAccount,
        tokenAMint,
        tokenBMint,
        tokenAVault,
        tokenBVault,
        tokenAProgram,
        tokenBProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();
  }

  /**
   * Builds a transaction to perform a swap in the pool.
   * @param {SwapParams} params - Parameters for swapping tokens.
   * @returns Transaction builder.
   */
  async swap(params: SwapParams): TxBuilder {
    const {
      payer,
      pool,
      inputTokenMint,
      outputTokenMint,
      amountIn,
      minimumAmountOut,
      tokenAVault,
      tokenBVault,
      tokenAMint,
      tokenBMint,
      tokenAProgram,
      tokenBProgram,
      referralTokenAccount,
    } = params;

    const poolAuthority = derivePoolAuthority(this._program.programId);

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
    if (
      [tokenAMint.toBase58(), tokenBMint.toBase58()].includes(
        NATIVE_MINT.toBase58()
      )
    ) {
      const closeWrappedSOLIx = await unwrapSOLInstruction(payer);
      closeWrappedSOLIx && postInstructions.push(closeWrappedSOLIx);
    }

    return await this._program.methods
      .swap({
        amountIn,
        minimumAmountOut,
      })
      .accountsStrict({
        poolAuthority,
        pool,
        payer,
        inputTokenAccount,
        outputTokenAccount,
        tokenAVault,
        tokenBVault,
        tokenAMint,
        tokenBMint,
        tokenAProgram,
        tokenBProgram,
        referralTokenAccount,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();
  }

  /**
   * Builds a transaction to lock a position with vesting schedule.
   * @param {LockPositionParams} params - Locking parameters.
   * @returns Transaction builder.
   */
  async lockPosition(params: LockPositionParams): TxBuilder {
    const {
      owner,
      pool,
      payer,
      vestingAccount,
      position,
      positionNftMint,
      cliffPoint,
      periodFrequency,
      cliffUnlockLiquidity,
      liquidityPerPeriod,
      numberOfPeriod,
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
    };
    return await this._program.methods
      .lockPosition(lockPositionParams)
      .accountsStrict({
        position,
        positionNftAccount,
        vesting: vestingAccount,
        pool: pool,
        owner: owner,
        payer: payer,
        systemProgram: SystemProgram.programId,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .transaction();
  }

  /**
   * Builds a transaction to permanently lock a position.
   * @param {PermanentLockParams} params - Parameters for permanent locking.
   * @returns Transaction builder.
   */
  async permanentLockPosition(params: PermanentLockParams): TxBuilder {
    const { owner, position, positionNftMint, pool, unlockedLiquidity } =
      params;
    const positionNftAccount = derivePositionNftAccount(
      positionNftMint,
      this._program.programId
    );

    return await this._program.methods
      .permanentLockPosition(unlockedLiquidity)
      .accountsStrict({
        position,
        positionNftAccount,
        pool: pool,
        owner: owner,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .transaction();
  }

  /**
   * Builds a transaction to refresh vesting status of a position.
   * @param {RefreshVestingParams} params - Refresh vesting parameters.
   * @returns Transaction builder.
   */
  async refreshVesting(params: RefreshVestingParams): TxBuilder {
    const { owner, position, positionNftMint, pool, vestings } = params;
    const positionNftAccount = derivePositionNftAccount(
      positionNftMint,
      this._program.programId
    );

    return await this._program.methods
      .refreshVesting()
      .accountsStrict({
        position,
        positionNftAccount,
        pool: pool,
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
      .transaction();
  }

  /**
   * Builds a transaction to claim position fee rewards.
   * @param {ClaimPositionFeeParams} params - Parameters for claiming position fee.
   * @returns Transaction builder.
   */
  async claimPositionFee(params: ClaimPositionFeeParams): TxBuilder {
    const {
      owner,
      pool,
      position,
      nftPositionMint,
      tokenAVault,
      tokenBVault,
      tokenAMint,
      tokenBMint,
      tokenAProgram,
      tokenBProgram,
    } = params;

    const positionNftAccount = derivePositionNftAccount(
      nftPositionMint,
      this._program.programId
    );
    const poolAuthority = derivePoolAuthority(this._program.programId);

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

    return await this._program.methods
      .claimPositionFee()
      .accountsStrict({
        poolAuthority,
        owner: owner,
        pool,
        position,
        positionNftAccount,
        tokenAAccount,
        tokenBAccount,
        tokenAVault,
        tokenBVault,
        tokenAMint,
        tokenBMint,
        tokenAProgram,
        tokenBProgram,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();
  }

  async closePosition(params: ClosePositionParams): TxBuilder {
    const { owner, pool, position, positionNftMint } = params;
    const poolAuthority = derivePoolAuthority(this._program.programId);

    const positionNftAccount = derivePositionNftAccount(
      positionNftMint,
      this._program.programId
    );

    return await this._program.methods
      .closePosition()
      .accountsPartial({
        positionNftMint,
        positionNftAccount,
        pool,
        position,
        poolAuthority,
        rentReceiver: owner,
        owner,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction();
  }

  /**
   * Builds a transaction to update reward duration.
   * @param {UpdateRewardDurationParams} params - Parameters including pool and new duration.
   * @returns Transaction builder.
   */
  async updateRewardDuration(params: UpdateRewardDurationParams): TxBuilder {
    const { pool, admin, rewardIndex, newDuration } = params;
    return await this._program.methods
      .updateRewardDuration(rewardIndex, newDuration)
      .accountsStrict({
        pool,
        admin: admin,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .transaction();
  }

  /**
   * Builds a transaction to update reward funder address.
   * @param {UpdateRewardFunderParams} params - Parameters including pool and new funder address.
   * @returns Transaction builder.
   */
  async updateRewardFunder(params: UpdateRewardFunderParams): TxBuilder {
    const { pool, admin, rewardIndex, newFunder } = params;
    return await this._program.methods
      .updateRewardFunder(rewardIndex, newFunder)
      .accountsStrict({
        pool,
        admin: admin,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .transaction();
  }

  /**
   * Builds a transaction to fund rewards in a pool.
   * @param {FundRewardParams} params - Funding parameters.
   * @returns Transaction builder.
   */
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

    return await this._program.methods
      .fundReward(rewardIndex, amount, carryForward)
      .accountsStrict({
        pool,
        rewardVault: vault,
        rewardMint: mint,
        funderTokenAccount,
        funder: funder,
        tokenProgram,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .transaction();
  }

  /**
   * Builds a transaction to withdraw ineligible rewards from a pool.
   * @param {WithdrawIneligibleRewardParams} params - Parameters for withdrawal.
   * @returns Transaction builder.
   */
  async withdrawIneligibleReward(
    params: WithdrawIneligibleRewardParams
  ): TxBuilder {
    const { rewardIndex, pool, funder } = params;
    const poolAuthority = derivePoolAuthority(this._program.programId);
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

    return await this._program.methods
      .withdrawIneligibleReward(rewardIndex)
      .accountsStrict({
        pool,
        rewardVault: vault,
        rewardMint: mint,
        poolAuthority,
        funderTokenAccount,
        funder: funder,
        tokenProgram,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();
  }

  /**
   * Builds a transaction to claim partner fee rewards.
   * @param {ClaimPartnerFeeParams} params - Claim parameters including amounts and partner address.
   * @returns Transaction builder.
   */
  async claimPartnerFee(params: ClaimPartnerFeeParams): TxBuilder {
    const { partner, pool, maxAmountA, maxAmountB } = params;
    const poolState = await this.fetchPoolState(pool);
    const {
      tokenAVault,
      tokenBVault,
      tokenAMint,
      tokenBMint,
      tokenAFlag,
      tokenBFlag,
    } = poolState;

    const poolAuthority = derivePoolAuthority(this._program.programId);

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

    return await this._program.methods
      .claimPartnerFee(maxAmountA, maxAmountB)
      .accountsStrict({
        poolAuthority,
        pool,
        tokenAAccount,
        tokenBAccount,
        tokenAVault,
        tokenBVault,
        tokenAMint,
        tokenBMint,
        partner,
        tokenAProgram,
        tokenBProgram,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();
  }

  /**
   * Builds a transaction to claim reward from a position.
   * @param {ClaimRewardParams} params - Parameters for claiming reward.
   * @returns Transaction builder.
   */
  async claimReward(params: ClaimRewardParams): TxBuilder {
    const { user, position, rewardIndex } = params;

    const poolAuthority = derivePoolAuthority(this._program.programId);
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
    return await this._program.methods
      .claimReward(rewardIndex)
      .accountsStrict({
        pool: positionState.pool,
        positionNftAccount,
        rewardVault: rewardInfo.vault,
        rewardMint: rewardInfo.mint,
        poolAuthority,
        position,
        userTokenAccount,
        owner: user,
        tokenProgram,
        eventAuthority: deriveEventAuthority(this._program.programId)[0],
        program: this._program.programId,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();
  }
}
