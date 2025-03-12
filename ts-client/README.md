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

     const transaction = await cpAmm.createCustomPool(params);
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
     const liquidityDelta = await cpAmm.getLiquidityDelta({
          maxAmountX: new BN(100_000 * 10 ** 6), // example
          maxAmountY: new BN(100_000 * 10 ** 9), // example
          tokenX, // tokenX mint address
          tokenY, // tokenY mint address
          pool,
        });
     // build add liquidity transaction
     const transaction = await cpAmm.addLiquidity({
        owner: wallet.publicKey,
        position,
        liquidityDeltaQ64: liquidityDelta,
        tokenAAmountThreshold: new BN(100000000735553), // threshold
        tokenBAmountThreshold: new BN(100000000735553), // threshol
      });
   ```

## 6. Swap
  ```ts
      // Get quote
      const quotes = await cpAmm.getQuote({
          pool,
          inAmount: new BN(1000 * 10 ** 6),
          inputTokenMint: tokenX,
          slippage, // slippage in number
        });

      // Build swap transaction
      const transaction = await cpAmm.swap({
          payer: wallet.publicKey,
          pool,
          inputTokenMint: tokenX,
          outputTokenMint: tokenY,
          amountIn: new BN(1000 * 10 ** 6),
          minimumAmountOut: new BN(minOutAmount),
          referralTokenAccount: null,
        });
  ```

## 7. Remove liquidity
  ```ts
      // Calculate liquidity delta will remove by supply max amount for tokenA & tokenB
      const liquidityDelta = await cpAmm.getLiquidityDelta({
        maxAmountX: new BN(1000 * 10 ** 6),
        maxAmountY: new BN(1000 * 10 ** 9),
        tokenX,
        tokenY,
        pool,
      });
  
    // Build remove liquidity transaction
    const transaction = await cpAmm.removeLiquidity({
        owner: wallet.publicKey,
        position,
        liquidityDeltaQ64: liquidityDelta,
        tokenAAmountThreshold: new BN(0),
        tokenBAmountThreshold: new BN(0),
      });
  ```

