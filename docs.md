# Dynamic CP-AMM SDK: Function Documentation

## Table of Contents
- [Core Functions](#core-functions)
  - [createPool](#createpool)
  - [createCustomPool](#createcustompool)
  - [createPosition](#createposition)
  - [getQuote](#getquote)
  - [getDepositQuote](#getdepositquote)
  - [getWithdrawQuote](#getwithdrawquote)
  - [swap](#swap)
  - [addLiquidity](#addliquidity)
  - [removeLiquidity](#removeliquidity)
  - [removeAllLiquidity](#removeallliquidity)
  - [removeAllLiquidityAndClosePosition](#removeallliquidityandcloseposition)
  - [mergePosition](#mergeposition)
  - [lockPosition](#lockposition)
  - [permanentLockPosition](#permanentlockposition)
  - [refreshVesting](#refreshvesting)
  - [claimPositionFee](#claimpositionfee)
  - [claimPartnerFee](#claimpartnerfee)
  - [claimReward](#claimreward)
  - [closePosition](#closeposition)
- [State Functions](#state-functions)
  - [fetchConfigState](#fetchconfigstate)
  - [fetchPoolState](#fetchpoolstate)
  - [fetchPositionState](#fetchpositionstate)
  - [getAllConfigs](#getallconfigs)
  - [getAllPools](#getallpools)
  - [getAllPositions](#getallpositions)
  - [getAllPositionsByPool](#getallpositionsbypool)
  - [getUserPositionByPool](#getuserpositionbypool)
  - [getPositionsByUser](#getpositionsbyuser)
  - [getAllVestingsByPosition](#getallvestingsbyposition)
  - [isLockedPosition](#islockedposition)
  - [isPoolExist](#ispoolexist)
- [Reward Management Functions](#reward-management-functions)
  - [updateRewardDuration](#updaterewardduration)
  - [updateRewardFunder](#updaterewardfunder)
  - [fundReward](#fundreward)
  - [withdrawIneligibleReward](#withdrawineligiblereward)
- [Helper Functions](#helper-functions)
  - [preparePoolCreationParams](#preparepoolcreationparams)
  - [getProgram](#getprogram)

---

## Core Functions

### createPool

Creates a new standard pool according to a predefined configuration.

#### Function
```typescript
async createPool(params: CreatePoolParams): TxBuilder
```

#### Parameters
```typescript
interface CreatePoolParams {
  payer: PublicKey;              // The wallet paying for the transaction
  creator: PublicKey;            // The creator of the pool
  config: PublicKey;             // The configuration account for the pool
  positionNft: PublicKey;        // The mint for the initial position NFT
  tokenAMint: PublicKey;         // The mint address for token A
  tokenBMint: PublicKey;         // The mint address for token B
  activationPoint: BN;           // The slot or timestamp for activation 
  tokenAAmount: BN;              // Initial amount of token A to deposit
  tokenBAmount: BN;              // Initial amount of token B to deposit
  initSqrtPrice: BN;             // Initial sqrt price in Q64 format
  liquidityDelta: BN;            // Initial liquidity delta in Q64 format
  tokenAProgram: PublicKey;      // Token program for token A
  tokenBProgram: PublicKey;      // Token program for token B
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
// First, prepare the pool creation parameters
const { initSqrtPrice, liquidityDelta } = cpAmm.preparePoolCreationParams({
  tokenAAmount: new BN(1_000_000_000), // 1,000 USDC with 6 decimals
  tokenBAmount: new BN(5_000_000_000), // 5 SOL with 9 decimals
  minSqrtPrice: MIN_SQRT_PRICE,
  maxSqrtPrice: MAX_SQRT_PRICE
});

const createPoolTx = await cpAmm.createPool({
  payer: wallet.publicKey,
  creator: wallet.publicKey,
  config: configAddress,
  positionNft: positionNftMint,
  tokenAMint: usdcMint,
  tokenBMint: solMint,
  activationPoint: new BN(Date.now()),
  tokenAAmount: new BN(1_000_000_000),
  tokenBAmount: new BN(5_000_000_000),
  initSqrtPrice: initSqrtPrice,
  liquidityDelta: liquidityDelta,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});

const tx = await createPoolTx.transaction();
const result = await wallet.sendTransaction(tx, connection);
```

#### Notes
- Both token amounts must be greater than zero
- If using native SOL, it will be automatically wrapped to wSOL
- The `config` parameter should be a valid configuration account
- Pool creation automatically creates an initial position
- Use `preparePoolCreationParams` to calculate proper `initSqrtPrice` and `liquidityDelta`

---

### createCustomPool

Creates a customizable pool with specific fee parameters, reward settings, and activation conditions.

#### Function
```typescript
async createCustomPool(params: InitializeCustomizeablePoolParams): Promise<{
  tx: Transaction;
  pool: PublicKey;
  position: PublicKey;
}>
```

#### Parameters
```typescript
interface InitializeCustomizeablePoolParams {
  payer: PublicKey;              // The wallet paying for the transaction
  creator: PublicKey;            // The creator of the pool
  positionNft: PublicKey;        // The mint for the initial position NFT
  tokenAMint: PublicKey;         // The mint address for token A
  tokenBMint: PublicKey;         // The mint address for token B
  tokenAAmount: BN;              // Initial amount of token A to deposit
  tokenBAmount: BN;              // Initial amount of token B to deposit
  sqrtMinPrice: BN;              // Minimum sqrt price
  sqrtMaxPrice: BN;              // Maximum sqrt price
  initSqrtPrice: BN;             // Initial sqrt price in Q64 format
  liquidityDelta: BN;            // Initial liquidity in Q64 format
  tokenAProgram: PublicKey;      // Token program for token A
  tokenBProgram: PublicKey;      // Token program for token B
  poolFees: PoolFees;            // Fee configuration
  hasAlphaVault: boolean;        // Whether the pool has an alpha vault
  collectFeeMode: number;        // How fees are collected (0: normal, 1: alpha)
  activationPoint: BN;           // The slot or timestamp for activation
  activationType: number;        // 0: slot, 1: timestamp
}

interface PoolFees {
  baseFee: {
    feeSchedulerMode: number;    // 0: Linear, 1: Exponential
    cliffFeeNumerator: number;   // Initial fee numerator
    numberOfPeriod: number;      // Number of fee reduction periods
    reductionFactor: number;     // How much fee reduces each period
    periodFrequency: number;     // How often fees change
  };
  partnerFee?: {                 // Optional partner fee configuration
    partnerAddress: PublicKey;   // Address to receive partner fees
    partnerFeeNumerator: number; // Share of fees for partner
  };
  dynamicFee?: {                 // Optional dynamic fee configuration
    initialized: boolean;        // Whether dynamic fees are enabled
    volatilityAccumulator?: number; // Current volatility measure
    binStep?: number;           // Bin step for dynamic fee calculation
    variableFeeControl?: {       // Controls for variable fees
      maxFeeNumerator: number;   // Maximum fee rate 
      minFeeNumerator: number;   // Minimum fee rate
      volatilityThreshold: number; // Threshold to trigger fee changes
      feeDamper: number;         // Controls fee response to volatility
    };
  };
}
```

#### Returns
An object containing:
- `tx`: The transaction to sign and send
- `pool`: The public key of the created pool
- `position`: The public key of the initial position

#### Example
```typescript
// First, prepare the pool creation parameters
const { initSqrtPrice, liquidityDelta } = cpAmm.preparePoolCreationParams({
  tokenAAmount: new BN(5_000_000_000),
  tokenBAmount: new BN(20_000_000),
  minSqrtPrice: MIN_SQRT_PRICE,
  maxSqrtPrice: MAX_SQRT_PRICE
});

const poolFees = {
  baseFee: {
    feeSchedulerMode: 0, // 0: Linear, 1: Exponential
    cliffFeeNumerator: 1_000_000,
    numberOfPeriod: 0,
    reductionFactor: 0,
    periodFrequency: 0
  },
  partnerFee: {
    partnerAddress: partnerWallet.publicKey,
    partnerFeeNumerator: 1000,
  },
  dynamicFee: {
    initialized: false
  }
};

const { tx, pool, position } = await cpAmm.createCustomPool({
  payer: wallet.publicKey,
  creator: wallet.publicKey,
  positionNft: positionNftMint,
  tokenAMint: usdcMint,
  tokenBMint: btcMint,
  tokenAAmount: new BN(5_000_000_000),
  tokenBAmount: new BN(20_000_000),
  sqrtMinPrice: MIN_SQRT_PRICE,
  sqrtMaxPrice: MAX_SQRT_PRICE,
  initSqrtPrice: initSqrtPrice,
  liquidityDelta: liquidityDelta,
  poolFees,
  hasAlphaVault: false,
  collectFeeMode: 0, // 0: BothToken, 1: onlyB
  activationPoint: new BN(Date.now()),
  activationType: 1, // 0: slot, 1: timestamp
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});

const result = await wallet.sendTransaction(tx, connection);
```

#### Notes
- Use this function instead of `createPool` when you need custom fee structures
- Dynamic fees can adjust based on market volatility
- Partner fees allow a portion of trading fees to be directed to a specific account
- Alpha vault is an advanced feature for protocol-owned liquidity
- Use `preparePoolCreationParams` to calculate proper `initSqrtPrice` and `liquidityDelta`

---

### createPosition

Creates a new position in an existing pool.

#### Function
```typescript
async createPosition(params: CreatePositionParams): TxBuilder
```

#### Parameters
```typescript
interface CreatePositionParams {
  owner: PublicKey;          // The owner of the position
  payer: PublicKey;          // The wallet paying for the transaction
  pool: PublicKey;           // The pool to create a position in
  positionNft: PublicKey;    // The mint for the position NFT
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const createPositionTx = await cpAmm.createPosition({
  owner: wallet.publicKey,
  payer: wallet.publicKey,
  pool: poolAddress,
  positionNft: positionNftMint
});

const tx = await createPositionTx.transaction();
const result = await wallet.sendTransaction(tx, connection);
```

#### Notes
- The `positionNft` should be a new mint that doesn't already have a position
- Creating a position doesn't automatically add liquidity
- After creating a position, use `addLiquidity` to provide tokens

---

### getQuote

Calculates the expected output amount for a swap, including fees and slippage protection.

#### Function
```typescript
async getQuote(params: GetQuoteParams): Promise<{
  swapInAmount: BN;
  consumedInAmount: BN;
  swapOutAmount: BN;
  minSwapOutAmount: BN;
  totalFee: BN;
  priceImpact: number;
}>
```

#### Parameters
```typescript
interface GetQuoteParams {
  inAmount: BN;                // The amount of input token to swap
  inputTokenMint: PublicKey;   // The mint of the input token
  slippage: number;            // Slippage tolerance in percentage (e.g., 0.5 for 0.5%)
  poolState: PoolState;        // The state of the pool
  currentTime?: number;        // Current timestamp (for time-based fees)
  currentSlot?: number;        // Current slot (for slot-based fees)
  inputTokenInfo?: any;        // Token info for Token2022 transfer fee calculations
  outputTokenInfo?: any;       // Token info for Token2022 transfer fee calculations
}
```

#### Returns
An object containing:
- `swapInAmount`: The original input amount
- `consumedInAmount`: The actual input amount used (after transfer fees)
- `swapOutAmount`: The expected output amount
- `minSwapOutAmount`: The minimum output amount accounting for slippage
- `totalFee`: The total fee to be paid
- `priceImpact`: The price impact of the swap as a percentage

#### Example
```typescript
const poolState = await cpAmm.fetchPoolState(poolAddress);

const quote = await cpAmm.getQuote({
  inAmount: new BN(100_000_000), // 100 USDC
  inputTokenMint: usdcMint,
  slippage: 0.5, // 0.5% slippage
  poolState,
  currentTime: Date.now()
});

console.log(`Expected output: ${quote.swapOutAmount.toString()}`);
console.log(`Minimum output: ${quote.minSwapOutAmount.toString()}`);
console.log(`Fee: ${quote.totalFee.toString()}`);
console.log(`Price impact: ${quote.priceImpact.toFixed(2)}%`);
```

#### Notes
- Always check the price impact before executing a swap
- The `slippage` parameter protects users from price movements
- This function doesn't execute a swap, only provides a quote
- Use the `minSwapOutAmount` as the `minimumAmountOut` parameter for `swap`
- For Token2022 tokens with transfer fees, provide the token info parameters

---

### getDepositQuote

Calculates the deposit quote for adding liquidity to a pool based on a single token input.

#### Function
```typescript
async getDepositQuote(params: GetDepositQuoteParams): Promise<DepositQuote>
```

#### Parameters
```typescript
interface GetDepositQuoteParams {
  inAmount: BN;                 // The amount of input token
  isTokenA: boolean;            // Whether the input token is token A
  inputTokenInfo?: any;         // Token info for Token2022 transfer fee calculations  
  outputTokenInfo?: any;        // Token info for Token2022 transfer fee calculations
  minSqrtPrice: BN;             // Minimum sqrt price
  maxSqrtPrice: BN;             // Maximum sqrt price
  sqrtPrice: BN;                // Current sqrt price
}
```

#### Returns
An object containing:
- `actualInputAmount`: The actual input amount (after transfer fees)
- `consumedInputAmount`: The full input amount including transfer fees
- `liquidityDelta`: The amount of liquidity that will be added
- `outputAmount`: The calculated amount of the other token to be paired

#### Example
```typescript
const poolState = await cpAmm.fetchPoolState(poolAddress);

const depositQuote = await cpAmm.getDepositQuote({
  inAmount: new BN(1_000_000_000), // 1,000 USDC
  isTokenA: true, // USDC is token A
  minSqrtPrice: MIN_SQRT_PRICE,
  maxSqrtPrice: MAX_SQRT_PRICE,
  sqrtPrice: poolState.sqrtPrice
});

console.log(`Liquidity delta: ${depositQuote.liquidityDelta.toString()}`);
console.log(`Required token B: ${depositQuote.outputAmount.toString()}`);
```

#### Notes
- Use this to calculate how much of token B is needed when adding token A (or vice versa)
- Particularly useful for single-sided liquidity provision
- The function handles Token2022 transfer fees if token info is provided

---

### getWithdrawQuote

Calculates the withdrawal quote for removing liquidity from a pool.

#### Function
```typescript
async getWithdrawQuote(params: GetWithdrawQuoteParams): Promise<WithdrawQuote>
```

#### Parameters
```typescript
interface GetWithdrawQuoteParams {
  liquidityDelta: BN;         // The amount of liquidity to withdraw
  sqrtPrice: BN;              // Current sqrt price
  maxSqrtPrice: BN;           // Maximum sqrt price
  minSqrtPrice: BN;           // Minimum sqrt price
  tokenATokenInfo?: any;      // Token info for Token2022 transfer fee calculations
  tokenBTokenInfo?: any;      // Token info for Token2022 transfer fee calculations
}
```

#### Returns
An object containing:
- `liquidityDelta`: The amount of liquidity being removed
- `outAmountA`: The calculated amount of token A to receive
- `outAmountB`: The calculated amount of token B to receive

#### Example
```typescript
const poolState = await cpAmm.fetchPoolState(poolAddress);
const positionState = await cpAmm.fetchPositionState(positionAddress);

// Calculate quote for removing half the liquidity
const liquidityToRemove = positionState.liquidity.div(new BN(2));

const withdrawQuote = await cpAmm.getWithdrawQuote({
  liquidityDelta: liquidityToRemove,
  sqrtPrice: poolState.sqrtPrice,
  maxSqrtPrice: MAX_SQRT_PRICE,
  minSqrtPrice: MIN_SQRT_PRICE
});

console.log(`Expected token A: ${withdrawQuote.outAmountA.toString()}`);
console.log(`Expected token B: ${withdrawQuote.outAmountB.toString()}`);
```

#### Notes
- Use this to estimate the tokens you'll receive when removing liquidity
- The function handles Token2022 transfer fees if token info is provided
- The calculation accounts for the current price relative to the position's price range

---

### swap

Executes a token swap in the pool.

#### Function
```typescript
async swap(params: SwapParams): TxBuilder
```

#### Parameters
```typescript
interface SwapParams {
  payer: PublicKey;              // The wallet paying for the transaction
  pool: PublicKey;               // Address of the pool to swap in
  inputTokenMint: PublicKey;     // Mint of the input token
  outputTokenMint: PublicKey;    // Mint of the output token
  amountIn: BN;                  // Amount of input token to swap
  minimumAmountOut: BN;          // Minimum amount of output token (slippage protection)
  tokenAVault: PublicKey;        // Pool's token A vault
  tokenBVault: PublicKey;        // Pool's token B vault
  tokenAMint: PublicKey;         // Pool's token A mint
  tokenBMint: PublicKey;         // Pool's token B mint
  tokenAProgram: PublicKey;      // Token program for token A
  tokenBProgram: PublicKey;      // Token program for token B
  referralTokenAccount?: PublicKey; // Optional referral account for fees
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const poolState = await cpAmm.fetchPoolState(poolAddress);

// Get quote first
const quote = await cpAmm.getQuote({
  inAmount: new BN(100_000_000), // 100 USDC
  inputTokenMint: poolState.tokenAMint,
  slippage: 0.5,
  poolState,
  currentTime: Date.now()
});

// Execute swap
const swapTx = await cpAmm.swap({
  payer: wallet.publicKey,
  pool: poolAddress,
  inputTokenMint: poolState.tokenAMint,
  outputTokenMint: poolState.tokenBMint,
  amountIn: new BN(100_000_000),
  minimumAmountOut: quote.minSwapOutAmount,
  tokenAVault: poolState.tokenAVault,
  tokenBVault: poolState.tokenBVault,
  tokenAMint: poolState.tokenAMint,
  tokenBMint: poolState.tokenBMint,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});

const tx = await swapTx.transaction();
const result = await wallet.sendTransaction(tx, connection);
```

#### Notes
- Get a quote first using `getQuote` to determine the `minimumAmountOut`
- The SDK handles wrapping/unwrapping of SOL automatically
- Token accounts are created automatically if they don't exist
- The transaction will fail if the output amount would be less than `minimumAmountOut`
- Optional referral tokenAccount will receive a portion of fees if the pool is configured for referrals

---

### addLiquidity

Adds liquidity to an existing position.

#### Function
```typescript
async addLiquidity(params: AddLiquidityParams): TxBuilder
```

#### Parameters
```typescript
interface AddLiquidityParams {
  owner: PublicKey;              // The owner of the position
  pool: PublicKey;               // The pool address
  position: PublicKey;           // The position address
  positionNftAccount?: PublicKey; // The position NFT account
  liquidityDelta: BN;            // The amount of liquidity to add in Q64 format
  maxAmountTokenA: BN;           // Maximum amount of token A to use
  maxAmountTokenB: BN;           // Maximum amount of token B to use
  tokenAAmountThreshold: BN;     // Minimum acceptable token A amount (slippage protection)
  tokenBAmountThreshold: BN;     // Minimum acceptable token B amount (slippage protection)
  tokenAMint: PublicKey;         // The mint of token A
  tokenBMint: PublicKey;         // The mint of token B
  tokenAVault: PublicKey;        // The pool's token A vault
  tokenBVault: PublicKey;        // The pool's token B vault
  tokenAProgram: PublicKey;      // Token program for token A
  tokenBProgram: PublicKey;      // Token program for token B
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const poolState = await cpAmm.fetchPoolState(poolAddress);
const positionState = await cpAmm.fetchPositionState(positionAddress);

// Get deposit quote
const depositQuote = await cpAmm.getDepositQuote({
  inAmount: new BN(1_000_000_000), // 1,000 USDC
  isTokenA: true,
  minSqrtPrice: MIN_SQRT_PRICE,
  maxSqrtPrice: MAX_SQRT_PRICE,
  sqrtPrice: poolState.sqrtPrice
});

// Add liquidity
const addLiquidityTx = await cpAmm.addLiquidity({
  owner: wallet.publicKey,
  pool: poolAddress,
  position: positionAddress,
  positionNftAccount: positionNftAccount,
  liquidityDelta: depositQuote.liquidityDelta,
  maxAmountTokenA: new BN(1_000_000_000),
  maxAmountTokenB: depositQuote.outputAmount,
  tokenAAmountThreshold: new BN(0),
  tokenBAmountThreshold: new BN(0),
  tokenAMint: poolState.tokenAMint,
  tokenBMint: poolState.tokenBMint,
  tokenAVault: poolState.tokenAVault,
  tokenBVault: poolState.tokenBVault,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});

const tx = await addLiquidityTx.transaction();
const result = await wallet.sendTransaction(tx, connection);
```

#### Notes
- Calculate the liquidity delta first using `getDepositQuote`
- The SDK handles wrapping/unwrapping of SOL automatically
- Token accounts are created automatically if they don't exist
- Set appropriate thresholds to protect against slippage

---

### removeLiquidity

Removes a specific amount of liquidity from an existing position.

#### Function
```typescript
async removeLiquidity(params: RemoveLiquidityParams): TxBuilder
```

#### Parameters
```typescript
interface RemoveLiquidityParams {
  owner: PublicKey;              // The owner of the position
  pool: PublicKey;               // The pool address
  position: PublicKey;           // The position address
  positionNftAccount?: PublicKey; // The position NFT account
  liquidityDelta: BN;           // The amount of liquidity to remove in Q64 format
  tokenAAmountThreshold: BN;     // Minimum acceptable token A amount (slippage protection)
  tokenBAmountThreshold: BN;     // Minimum acceptable token B amount (slippage protection)
  tokenAMint: PublicKey;         // The mint of token A
  tokenBMint: PublicKey;         // The mint of token B
  tokenAVault: PublicKey;        // The pool's token A vault
  tokenBVault: PublicKey;        // The pool's token B vault
  tokenAProgram: PublicKey;      // Token program for token A
  tokenBProgram: PublicKey;      // Token program for token B
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const poolState = await cpAmm.fetchPoolState(poolAddress);
const positionState = await cpAmm.fetchPositionState(positionAddress);

// Get withdraw quote for half of the liquidity
const liquidityToRemove = positionState.unlockedLiquidity.div(new BN(2));
const withdrawQuote = await cpAmm.getWithdrawQuote({
  liquidityDelta: liquidityToRemove,
  sqrtPrice: poolState.sqrtPrice,
  maxSqrtPrice: MAX_SQRT_PRICE,
  minSqrtPrice: MIN_SQRT_PRICE
});

const removeLiquidityTx = await cpAmm.removeLiquidity({
  owner: wallet.publicKey,
  pool: poolAddress,
  position: positionAddress,
  positionNftAccount: positionNftAccount,
  liquidityDelta: liquidityToRemove,
  tokenAAmountThreshold: withdrawQuote.outAmountA.mul(new BN(95)).div(new BN(100)), // 5% slippage
  tokenBAmountThreshold: withdrawQuote.outAmountB.mul(new BN(95)).div(new BN(100)), // 5% slippage
  tokenAMint: poolState.tokenAMint,
  tokenBMint: poolState.tokenBMint,
  tokenAVault: poolState.tokenAVault,
  tokenBVault: poolState.tokenBVault,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});

const tx = await removeLiquidityTx.transaction();
const result = await wallet.sendTransaction(tx, connection);
```

#### Notes
- You can only remove unlocked liquidity
- The SDK handles wrapping/unwrapping of SOL automatically
- Token accounts are created automatically if they don't exist
- Set appropriate thresholds to protect against slippage
- Removing all liquidity doesn't close the position

---

### removeAllLiquidity

Removes all available liquidity from a position.

#### Function
```typescript
async removeAllLiquidity(params: RemoveAllLiquidityParams): TxBuilder
```

#### Parameters
```typescript
interface RemoveAllLiquidityParams {
  owner: PublicKey;              // The owner of the position
  pool: PublicKey;               // The pool address
  position: PublicKey;           // The position address
  positionNftAccount: PublicKey; // The position NFT account
  tokenAAmountThreshold: BN;     // Minimum acceptable token A amount (slippage protection)
  tokenBAmountThreshold: BN;     // Minimum acceptable token B amount (slippage protection)
  tokenAMint: PublicKey;         // The mint of token A
  tokenBMint: PublicKey;         // The mint of token B
  tokenAVault: PublicKey;        // The pool's token A vault
  tokenBVault: PublicKey;        // The pool's token B vault
  tokenAProgram: PublicKey;      // Token program for token A
  tokenBProgram: PublicKey;      // Token program for token B
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const poolState = await cpAmm.fetchPoolState(poolAddress);
const positionState = await cpAmm.fetchPositionState(positionAddress);

// Get withdraw quote for all unlocked liquidity
const withdrawQuote = await cpAmm.getWithdrawQuote({
  liquidityDelta: positionState.unlockedLiquidity,
  sqrtPrice: poolState.sqrtPrice,
  maxSqrtPrice: MAX_SQRT_PRICE,
  minSqrtPrice: MIN_SQRT_PRICE
});

const removeAllLiquidityTx = await cpAmm.removeAllLiquidity({
  owner: wallet.publicKey,
  pool: poolAddress,
  position: positionAddress,
  positionNftAccount: positionNftAccount,
  tokenAAmountThreshold: withdrawQuote.outAmountA.mul(new BN(95)).div(new BN(100)), // 5% slippage
  tokenBAmountThreshold: withdrawQuote.outAmountB.mul(new BN(95)).div(new BN(100)), // 5% slippage
  tokenAMint: poolState.tokenAMint,
  tokenBMint: poolState.tokenBMint,
  tokenAVault: poolState.tokenAVault,
  tokenBVault: poolState.tokenBVault,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});

const tx = await removeAllLiquidityTx.transaction();
const result = await wallet.sendTransaction(tx, connection);
```

#### Notes
- This removes all unlocked liquidity in one transaction
- The position remains open after removing all liquidity
- You can't remove locked liquidity (use `refreshVesting` first if needed)
- The SDK handles wrapping/unwrapping of SOL automatically

---

### removeAllLiquidityAndClosePosition

Removes all liquidity from a position and closes it in a single transaction.

#### Function
```typescript
async removeAllLiquidityAndClosePosition(params: RemoveAllLiquidityAndClosePositionParams): TxBuilder
```

#### Parameters
```typescript
interface RemoveAllLiquidityAndClosePositionParams {
  owner: PublicKey;                // The owner of the position
  position: PublicKey;             // The position address
  positionNftAccount: PublicKey;   // The position NFT account
  positionState: PositionState;    // The current position state
  poolState: PoolState;            // The current pool state
  tokenAAmountThreshold: BN;       // Minimum acceptable token A amount (slippage protection)
  tokenBAmountThreshold: BN;       // Minimum acceptable token B amount (slippage protection)
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const poolState = await cpAmm.fetchPoolState(poolAddress);
const positionState = await cpAmm.fetchPositionState(positionAddress);

// Check if position is locked
if (cpAmm.isLockedPosition(positionState)) {
  console.error("Cannot close a locked position");
  return;
}

// Get withdraw quote
const withdrawQuote = await cpAmm.getWithdrawQuote({
  liquidityDelta: positionState.unlockedLiquidity,
  sqrtPrice: poolState.sqrtPrice,
  maxSqrtPrice: MAX_SQRT_PRICE,
  minSqrtPrice: MIN_SQRT_PRICE
});

// Build transaction to remove all liquidity and close position
const tx = await cpAmm.removeAllLiquidityAndClosePosition({
  owner: wallet.publicKey,
  position: positionAddress,
  positionNftAccount: positionNftAccount,
  positionState: positionState,
  poolState: poolState,
  tokenAAmountThreshold: withdrawQuote.outAmountA.mul(new BN(95)).div(new BN(100)), // 5% slippage
  tokenBAmountThreshold: withdrawQuote.outAmountB.mul(new BN(95)).div(new BN(100))  // 5% slippage
});

const result = await wallet.sendTransaction(tx, connection);
```

#### Notes
- This combines multiple operations in a single transaction:
  1. Claims any accumulated fees
  2. Removes all liquidity
  3. Closes the position and returns the rent
- The position must be completely unlocked
- The function will throw an error if the position has any locked liquidity
- This is more gas-efficient than doing these operations separately

---

### mergePosition

Merges liquidity from one position into another in a single transaction.

#### Function
```typescript
async mergePosition(params: MergePositionParams): TxBuilder
```

#### Parameters
```typescript
interface MergePositionParams {
  owner: PublicKey;                       // The owner of both positions
  positionA: PublicKey;                   // Target position to merge into
  positionB: PublicKey;                   // Source position to merge from
  positionBState: PositionState;          // State of the source position
  poolState: PoolState;                   // State of the pool
  positionANftAccount: PublicKey;         // NFT account of target position
  positionBNftAccount: PublicKey;         // NFT account of source position
  tokenAAmountAddLiquidityThreshold: BN;  // Minimum token A amount for add liquidity
  tokenBAmountAddLiquidityThreshold: BN;  // Minimum token B amount for add liquidity
  tokenAAmountRemoveLiquidityThreshold: BN; // Minimum token A amount for remove liquidity
  tokenBAmountRemoveLiquidityThreshold: BN; // Minimum token B amount for remove liquidity
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const poolState = await cpAmm.fetchPoolState(poolAddress);
const positionAState = await cpAmm.fetchPositionState(positionAAddress); // Target position
const positionBState = await cpAmm.fetchPositionState(positionBAddress); // Source position to merge from

// Check if position is locked
if (cpAmm.isLockedPosition(positionBState)) {
  console.error("Cannot merge a locked position");
  return;
}

// Build transaction to merge positions
const tx = await cpAmm.mergePosition({
  owner: wallet.publicKey,
  positionA: positionAAddress,
  positionB: positionBAddress,
  positionBState: positionBState,
  poolState: poolState,
  positionANftAccount: positionANftAccount,
  positionBNftAccount: positionBNftAccount,
  tokenAAmountAddLiquidityThreshold: new BN(0),
  tokenBAmountAddLiquidityThreshold: new BN(0),
  tokenAAmountRemoveLiquidityThreshold: new BN(0),
  tokenBAmountRemoveLiquidityThreshold: new BN(0)
});

const result = await wallet.sendTransaction(tx, connection);
```