import { Program, BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import invariant from "invariant";

import { CpAmm as CpmmIdl, IDL } from "./idl";
import {
  Connection,
  Transaction,
  PublicKey,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import { CP_AMM_PROGRAM_ID, MAX_SQRT_PRICE, MIN_SQRT_PRICE } from "./constants";
import {
  AddLiquidityParams,
  AmmProgram,
  ClaimPositionFeeParams,
  ClaimRewardParams,
  ConfigState,
  CreatePoolParams,
  CreatePositionParams,
  InitializeCustomizeablePoolParams,
  PermanentLockParams,
  PoolState,
  PositionState,
  RefreshVestingParams,
  RemoveLiquidityParams,
  RewardInfo,
} from "./types";
import {
  deriveCustomizablePoolAddress,
  derivePoolAddress,
  derivePoolAuthority,
  derivePositionAddress,
  derivePositionNftAccount,
  deriveTokenVaultAddress,
} from "./pda";
import { decimalToX64, priceToSqrtPrice } from "./math";
import Decimal from "decimal.js";
import { getTokenDecimals } from "./utils";

export class CpAmm {
  _program: AmmProgram;
  constructor(connection: Connection, programId?: PublicKey) {
    this._program = new Program<CpmmIdl>(IDL, programId ?? CP_AMM_PROGRAM_ID, {
      connection: connection,
    });
  }

  /**
   * initialPrice = tokenX/tokenY
   * initPrice = tokenB/tokenA
   * will invert the price with correct token order
   */
  private async normalizeCreatePoolParams(
    tokenX: PublicKey,
    tokenY: PublicKey,
    initialPrice: Decimal,
    liquidity: Decimal
  ): Promise<{
    tokenAMint: PublicKey;
    tokenBMint: PublicKey;
    sqrtPriceX64: BN;
    liquidityX64: BN;
  }> {
    const [tokenAMint, tokenBMint, initPrice] = new BN(tokenX.toBuffer()).gt(
      new BN(tokenY.toBuffer())
    )
      ? [tokenY, tokenX, new Decimal(1).div(initialPrice)]
      : [tokenX, tokenY, initialPrice];

    const tokenADecimal = await getTokenDecimals(
      this._program.provider.connection,
      tokenAMint
    );

    const tokenBDecimal = await getTokenDecimals(
      this._program.provider.connection,
      tokenBMint
    );

    const sqrtPriceX64 = priceToSqrtPrice(
      new Decimal(initPrice),
      tokenADecimal,
      tokenBDecimal
    );
    const liquidityX64 = decimalToX64(liquidity);

    return { tokenAMint, tokenBMint, sqrtPriceX64, liquidityX64 };
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

  async getQuote(): Promise<any> {}

  async createPool(params: CreatePoolParams): Promise<Transaction> {
    let {
      payer,
      creator,
      config,
      tokenX,
      tokenY,
      activationPoint,
      initialPrice, //
      liquidity,
    } = params;

    const { tokenAMint, tokenBMint, sqrtPriceX64, liquidityX64 } =
      await this.normalizeCreatePoolParams(
        tokenX,
        tokenY,
        new Decimal(initialPrice),
        new Decimal(liquidity)
      );

    const poolAuthority = derivePoolAuthority();
    const pool = derivePoolAddress(config, tokenX, tokenY);

    const tokenAVault = deriveTokenVaultAddress(tokenAMint, pool);
    const tokenBVault = deriveTokenVaultAddress(tokenBMint, pool);

    const positionNft = Keypair.generate();
    const position = derivePositionAddress(positionNft.publicKey);
    const positionNftAccount = derivePositionNftAccount(positionNft.publicKey);

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

    return await this._program.methods
      .initializePool({
        liquidity: liquidityX64,
        sqrtPrice: sqrtPriceX64,
        activationPoint: activationPoint,
      })
      .accounts({
        creator,
        positionNftAccount,
        positionNftMint: positionNft.publicKey,
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

        systemProgram: SystemProgram.programId,
      })
      .transaction();
  }

  async createCustomizePool(
    params: InitializeCustomizeablePoolParams
  ): Promise<Transaction> {
    const {
      tokenX,
      tokenY,
      payer,
      creator,
      poolFees,
      hasAlphaVault,
      liquidity,
      initialPrice,
      collectFeeMode,
      activationPoint,
      activationType,
    } = params;

    const { tokenAMint, tokenBMint, sqrtPriceX64, liquidityX64 } =
      await this.normalizeCreatePoolParams(
        tokenX,
        tokenY,
        new Decimal(initialPrice),
        new Decimal(liquidity)
      );

    const poolAuthority = derivePoolAuthority();
    const pool = deriveCustomizablePoolAddress(tokenAMint, tokenBMint);

    const positionNftKP = Keypair.generate();
    const position = derivePositionAddress(positionNftKP.publicKey);
    const positionNftAccount = derivePositionNftAccount(
      positionNftKP.publicKey
    );

    const tokenAProgram = (
      await this._program.provider.connection.getParsedAccountInfo(tokenAMint)
    )?.value?.owner;

    const tokenBProgram = (
      await this._program.provider.connection.getParsedAccountInfo(tokenBMint)
    )?.value?.owner;

    const tokenAVault = deriveTokenVaultAddress(tokenAMint, pool);
    const tokenBVault = deriveTokenVaultAddress(tokenBMint, pool);

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

    return await this._program.methods
      .initializeCustomizablePool({
        poolFees,
        sqrtMinPrice: MIN_SQRT_PRICE,
        sqrtMaxPrice: MAX_SQRT_PRICE,
        hasAlphaVault,
        liquidity: liquidityX64,
        sqrtPrice: sqrtPriceX64,
        activationType,
        collectFeeMode,
        activationPoint,
      })
      .accounts({
        creator,
        positionNftAccount,
        positionNftMint: positionNftKP.publicKey,
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
      })
      .transaction();
  }

  async createPosition(params: CreatePositionParams): Promise<Transaction> {
    const { owner, payer, pool } = params;
    const poolAuthority = derivePoolAuthority();

    const positionNft = Keypair.generate();
    const position = derivePositionAddress(positionNft.publicKey);
    const positionNftAccount = derivePositionNftAccount(positionNft.publicKey);

    return await this._program.methods
      .createPosition()
      .accounts({
        owner,
        positionNftMint: positionNft.publicKey,
        poolAuthority,
        positionNftAccount,
        payer: payer,
        pool,
        position,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
  }

  async addLiquidity(params: AddLiquidityParams): Promise<Transaction> {
    const {
      owner,
      position,
      liquidityDelta,
      tokenAAmountThreshold,
      tokenBAmountThreshold,
    } = params;
    const liquidityDeltaX64 = decimalToX64(new Decimal(liquidityDelta));

    const positionState = await this.fetchPositionState(position);
    const poolState = await this.fetchPoolState(positionState.pool);
    const positionNftAccount = derivePositionNftAccount(positionState.nftMint);

    const tokenAProgram =
      poolState.tokenAFlag == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
    const tokenBProgram =
      poolState.tokenBFlag == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

    const tokenAAccount = getAssociatedTokenAddressSync(
      poolState.tokenAMint,
      owner,
      true,
      tokenAProgram
    );
    const tokenBAccount = getAssociatedTokenAddressSync(
      poolState.tokenBMint,
      owner,
      true,
      tokenBProgram
    );

    return await this._program.methods
      .addLiquidity({
        liquidityDelta: liquidityDeltaX64,
        tokenAAmountThreshold,
        tokenBAmountThreshold,
      })
      .accounts({
        pool: positionState.pool,
        position,
        positionNftAccount,
        owner: owner,
        tokenAAccount,
        tokenBAccount,
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAProgram,
        tokenBProgram,
      })
      .transaction();
  }

  async removeLiquidity(params: RemoveLiquidityParams): Promise<Transaction> {
    const {
      owner,
      position,
      liquidityDelta,
      tokenAAmountThreshold,
      tokenBAmountThreshold,
    } = params;
    const liquidityDeltaX64 = decimalToX64(new Decimal(liquidityDelta));
    const positionState = await this.fetchPositionState(position);
    const poolState = await this.fetchPoolState(positionState.pool);
    const positionNftAccount = derivePositionNftAccount(positionState.nftMint);

    const poolAuthority = derivePoolAuthority();
    const tokenAProgram =
      poolState.tokenAFlag == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
    const tokenBProgram =
      poolState.tokenBFlag == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

    const tokenAAccount = getAssociatedTokenAddressSync(
      poolState.tokenAMint,
      owner,
      true,
      tokenAProgram
    );
    const tokenBAccount = getAssociatedTokenAddressSync(
      poolState.tokenBMint,
      owner,
      true,
      tokenBProgram
    );

    return await this._program.methods
      .removeLiquidity({
        maxLiquidityDelta: liquidityDeltaX64,
        tokenAAmountThreshold,
        tokenBAmountThreshold,
      })
      .accounts({
        poolAuthority,
        pool: positionState.pool,
        position,
        positionNftAccount,
        owner: owner,
        tokenAAccount,
        tokenBAccount,
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAProgram,
        tokenBProgram,
      })
      .transaction();
  }

  async swap(params: any): Promise<Transaction> {
    const {
      payer,
      pool,
      inputTokenMint,
      outputTokenMint,
      amountIn,
      minimumAmountOut,
      referralTokenAccount,
    } = params;

    const poolState = await this.fetchPoolState(pool);
    const poolAuthority = derivePoolAuthority();

    const tokenAProgram =
      poolState.tokenAFlag == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
    const tokenBProgram =
      poolState.tokenBFlag == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

    const inputTokenAccount = getAssociatedTokenAddressSync(
      inputTokenMint,
      payer.publicKey,
      true,
      tokenAProgram
    );
    const outputTokenAccount = getAssociatedTokenAddressSync(
      outputTokenMint,
      payer.publicKey,
      true,
      tokenBProgram
    );
    return await this._program.methods
      .swap({
        amountIn,
        minimumAmountOut,
      })
      .accounts({
        poolAuthority,
        pool,
        payer: payer.publicKey,
        inputTokenAccount,
        outputTokenAccount,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAProgram,
        tokenBProgram,
        referralTokenAccount,
      })
      .transaction();
  }

  async lockPosition(params: any): Promise<Transaction> {
    const { owner, payer, position } = params;
    const positionState = await this.fetchPositionState(position);
    const positionNftAccount = derivePositionNftAccount(positionState.nftMint);

    const vestingKP = Keypair.generate();

    return await this._program.methods
      .lockPosition(params)
      .accounts({
        position,
        positionNftAccount,
        vesting: vestingKP.publicKey,
        pool: positionState.pool,
        owner: owner,
        payer: payer,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
  }

  async permanentLockPosition(
    params: PermanentLockParams
  ): Promise<Transaction> {
    const { owner, position } = params;
    const positionState = await this.fetchPositionState(position);
    const positionNftAccount = derivePositionNftAccount(positionState.nftMint);

    return await this._program.methods
      .permanentLockPosition(positionState.unlockedLiquidity)
      .accounts({
        position,
        positionNftAccount,
        pool: positionState.pool,
        owner: owner,
      })
      .transaction();
  }

  async refreshVesting(params: RefreshVestingParams): Promise<Transaction> {
    const { owner, position, vestings } = params;

    const positionState = await this.fetchPositionState(position);
    const positionNftAccount = derivePositionNftAccount(positionState.nftMint);

    return await this._program.methods
      .refreshVesting()
      .accounts({
        position,
        positionNftAccount,
        pool: positionState.pool,
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

  async claimPositionFee(params: ClaimPositionFeeParams): Promise<Transaction> {
    const { owner, position } = params;

    const positionState = await this.fetchPositionState(position);

    const poolState = await this.fetchPoolState(positionState.pool);

    const positionNftAccount = derivePositionNftAccount(positionState.nftMint);

    const poolAuthority = derivePoolAuthority();

    const tokenAProgram =
      poolState.tokenAFlag == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

    const tokenBProgram =
      poolState.tokenBFlag == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;

    const tokenAAccount = getAssociatedTokenAddressSync(
      poolState.tokenAMint,
      owner,
      true,
      tokenAProgram
    );
    const tokenBAccount = getAssociatedTokenAddressSync(
      poolState.tokenBMint,
      owner,
      true,
      tokenBProgram
    );

    return await this._program.methods
      .claimPositionFee()
      .accounts({
        poolAuthority,
        owner: owner,
        pool: positionState.pool,
        position,
        positionNftAccount,
        tokenAAccount,
        tokenBAccount,
        tokenAVault: poolState.tokenAVault,
        tokenBVault: poolState.tokenBVault,
        tokenAMint: poolState.tokenAMint,
        tokenBMint: poolState.tokenBMint,
        tokenAProgram,
        tokenBProgram,
      })
      .transaction();
  }

  async claimReward(params: ClaimRewardParams): Promise<Transaction> {
    const { user, position, rewardIndex } = params;
    const poolAuthority = derivePoolAuthority();

    const positionState = await this.fetchPositionState(position);
    const poolState = await this.fetchPoolState(positionState.pool);

    const positionNftAccount = derivePositionNftAccount(positionState!.nftMint);

    const rewardInfo: RewardInfo = poolState?.rewardInfos[rewardIndex];
    const tokenProgram =
      rewardInfo.rewardTokenFlag == 0
        ? TOKEN_PROGRAM_ID
        : TOKEN_2022_PROGRAM_ID;

    const userTokenAccount = getAssociatedTokenAddressSync(
      rewardInfo.mint,
      user,
      true,
      tokenProgram
    );

    return await this._program.methods
      .claimReward(rewardIndex)
      .accounts({
        pool: positionState.pool,
        positionNftAccount,
        rewardVault: rewardInfo.vault,
        rewardMint: rewardInfo.mint,
        poolAuthority,
        position,
        userTokenAccount,
        owner: user,
        tokenProgram,
      })
      .transaction();
  }
}
