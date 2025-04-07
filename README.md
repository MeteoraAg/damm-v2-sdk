# CP-AMM SDK

The main example for SDK

## 1. Create a CpAmm instance
   ```ts
      const cpAmm = new CpAmm(connection, programId)
   ```
    Note: Flexible setup for mainnet/devnet by connection and programId.
## 2. Create customize pool
   ```ts
     // Setup base fee
     const baseFee: BaseFee = {
        cliffFeeNumerator: new BN(1_000_000), // 1%
        numberOfPeriod: 10,
        periodFrequency: new BN(10),
        reductionFactor: new BN(2),
        feeSchedulerMode: 0, // 0: Linear, 1: Exponential
      };
   
     // Setup dynamic fee (Optional)
     type DynamicFee = {
          binStep: number;
          binStepU128: BN;
          filterPeriod: number;
          decayPeriod: number;
          reductionFactor: number;
          maxVolatilityAccumulator: number;
          variableFeeControl: number;
        };
   
     // Setup pool fees
     const poolFees: PoolFeesParams = {
        baseFee,
        protocolFeePercent: 20,
        partnerFeePercent: 0,
        referralFeePercent: 20,
        dynamicFee: null, // Optional dynamic fee
      };
   
     // Setup params
     const params: InitializeCustomizeablePoolParams = {
        payer: wallet.publicKey,
        creator: wallet.publicKey,
        positionNft: positionNft.publicKey, // position nft pubkey, User can choose specific keypair.
        tokenX,
        tokenY,
        tokenXAmount: new BN(1000 * 10 ** 6), // amount token X
        tokenYAmount: new BN(1000 * 10 ** 9), // amount token Y
        tokenXDecimal: 6,
        tokenYDecimal: 9,
        poolFees, // poolFees setup above
        hasAlphaVault: false,
        activationType: 1, // 0: slot, 1: timestamp
        collectFeeMode: 0, // 0: BothToken 1: OnlyB 
        activationPoint: null,
      };

     const {tx: transaction, pool} = await cpAmm.createCustomPool(params);
   ```
  Note:  We need two signers for transaction: positionNft & payer.
   
## 3. Create position
   ```ts
       // Prepare create position params
       const createPositionParams: CreatePositionParams = {
        owner: wallet.publicKey,
        payer: wallet.publicKey,
        pool: pool,
        positionNft: positionNft.publicKey,
      };
      // Build transaction
      const transaction = await cpAmm.createPosition(createPositionParams);
   ```
Note:  We need two signers for transaction: positionNft & payer.

## 5. Add liquidity
   ```ts
     // Calculate liquidity delta will add by supply max amount for tokenA & tokenB
     const positionState = await cpAmm.fetchPositionState(position);
     const poolState = await cpAmm.fetchPoolState(pool);
     const {
       sqrtPrice,
       sqrtMaxPrice,
       sqrtMinPrice,
       tokenAMint,
       tokenBMint,
       tokenAVault,
       tokenBVault,
       tokenAFlag,
       tokenBFlag,
     } = poolState;
   
     const liquidityDelta = await cpAmm.getLiquidityDelta({
       maxAmountTokenA: new BN(100_000 * 10 ** 6),
       maxAmountTokenB: new BN(100_000 * 10 ** 9),
       tokenAMint,
       tokenBMint,
       sqrtMaxPrice,
       sqrtMinPrice,
       sqrtPrice,
     });
   
     const transaction = await cpAmm.addLiquidity({
       owner: wallet.publicKey,
       position,
       pool,
       positionNftMint: positionState.nftMint,
       liquidityDeltaQ64: liquidityDelta,
       tokenAAmountThreshold: new BN(100000000735553),
       tokenBAmountThreshold: new BN(100000000735553),
       tokenAMint,
       tokenBMint,
       tokenAVault,
       tokenBVault,
       tokenAProgram: getTokenProgram(tokenAFlag),
       tokenBProgram: getTokenProgram(tokenBFlag),
     });
   ```

## 6. Swap
  ```ts
     const poolState = await cpAmm.fetchPoolState(pool);
     const {
       tokenAMint,
       tokenBMint,
       tokenAVault,
       tokenBVault,
       tokenAFlag,
       tokenBFlag,
     } = poolState;
   
     const slippage = 5; // 5%
     // Get quotes
     const quotes = await cpAmm.getQuote({
       inAmount: new BN(1000 * 10 ** 6),
       inputTokenMint: tokenAMint,
       slippage,
       poolState,
     });
   
     const transaction = await cpAmm.swap({
       payer: wallet.publicKey,
       pool,
       inputTokenMint: tokenAMint,
       outputTokenMint: tokenBMint,
       amountIn: new BN(1000 * 10 ** 6),
       minimumAmountOut: new BN(10),
       tokenAMint,
       tokenBMint,
       tokenAVault,
       tokenBVault,
       tokenAProgram: getTokenProgram(tokenAFlag),
       tokenBProgram: getTokenProgram(tokenBFlag),
       referralTokenAccount: null,
     });
  ```

## 7. Remove liquidity
  ```ts
     const positionState = await cpAmm.fetchPositionState(position);
     const poolState = await cpAmm.fetchPoolState(pool);
     const {
       sqrtPrice,
       sqrtMaxPrice,
       sqrtMinPrice,
       tokenAMint,
       tokenBMint,
       tokenAVault,
       tokenBVault,
       tokenAFlag,
       tokenBFlag,
     } = poolState;
   
     const liquidityDelta = await cpAmm.getLiquidityDelta({
       maxAmountTokenA: new BN(100_000 * 10 ** 6),
       maxAmountTokenB: new BN(100_000 * 10 ** 9),
       tokenAMint,
       tokenBMint,
       sqrtMaxPrice,
       sqrtMinPrice,
       sqrtPrice,
     });
   
     const transaction = await cpAmm.removeLiquidity({
       owner: wallet.publicKey,
       position,
       pool,
       positionNftMint: positionState.nftMint,
       liquidityDeltaQ64: liquidityDelta,
       tokenAAmountThreshold: new BN(0),
       tokenBAmountThreshold: new BN(0),
       tokenAMint,
       tokenBMint,
       tokenAVault,
       tokenBVault,
       tokenAProgram: getTokenProgram(tokenAFlag),
       tokenBProgram: getTokenProgram(tokenBFlag),
     });
  ```

