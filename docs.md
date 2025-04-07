# Dynamic CP-AMM SDK: Function Documentation

## Table of Contents
- [Core Functions](#core-functions)
  - [createPool](#createpool)
  - [createCustomPool](#createcustompool)
  - [createPosition](#createposition)
  - [getQuote](#getquote)
  - [getLiquidityDelta](#getliquiditydelta)
  - [swap](#swap)
  - [addLiquidity](#addliquidity)
  - [removeLiquidity](#removeliquidity)
  - [lockPosition](#lockposition)
  - [permanentLockPosition](#permanentlockposition)
  - [refreshVesting](#refreshvesting)
  - [claimPositionFee](#claimpositionfee)
  - [claimPartnerFee](#claimpartnerfee)
  - [claimReward](#claimreward)
- [State Functions](#state-functions)
  - [fetchConfigState](#fetchconfigstate)
  - [fetchPoolState](#fetchpoolstate)
  - [fetchPositionState](#fetchpositionstate)
  - [getAllConfigs](#getallconfigs)
  - [getAllPools](#getallpools)
  - [getAllPositions](#getallpositions)
  - [getUserPositionByPool](#getuserpositionbypool)
  - [getPositionsByUser](#getpositionsbyuser)
- [Reward Management Functions](#reward-management-functions)
  - [updateRewardDuration](#updaterewardduration)
  - [updateRewardFunder](#updaterewardfunder)
  - [fundReward](#fundreward)
  - [withdrawIneligibleReward](#withdrawineligiblereward)

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
  activationPoint: BN;           // 0: slot, 1: timestamp
  tokenAAmount: BN;              // Initial amount of token A to deposit
  tokenBAmount: BN;              // Initial amount of token B to deposit
  minSqrtPrice: BN;              // Minimum sqrt price (typically MIN_SQRT_PRICE)
  maxSqrtPrice: BN;              // Maximum sqrt price (typically MAX_SQRT_PRICE)
  tokenADecimal: number;         // Decimal places for token A
  tokenBDecimal: number;         // Decimal places for token B
  tokenAProgram: PublicKey;      // Token program for token A
  tokenBProgram: PublicKey;      // Token program for token B
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const createPoolTx = await cpAmm.createPool({
  payer: wallet.publicKey,
  creator: wallet.publicKey,
  config: configAddress,
  positionNft: positionNftMint,
  tokenAMint: usdcMint,
  tokenBMint: solMint,
  activationPoint: new BN(Date.now()),
  tokenAAmount: new BN(1_000_000_000), // 1,000 USDC with 6 decimals
  tokenBAmount: new BN(5_000_000_000), // 5 SOL with 9 decimals
  minSqrtPrice: MIN_SQRT_PRICE,
  maxSqrtPrice: MAX_SQRT_PRICE,
  tokenADecimal: 6,
  tokenBDecimal: 9,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});

const tx = await createPoolTx.transaction();
const Function = await wallet.sendTransaction(tx, connection);
```

#### Notes
- Both token amounts must be greater than zero
- If using native SOL, it will be automatically wrapped to wSOL
- The `config` parameter should be a valid configuration account
- Pool creation automatically creates an initial position

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
  minSqrtPrice: BN;              // Minimum sqrt price
  maxSqrtPrice: BN;              // Maximum sqrt price
  tokenADecimal: number;         // Decimal places for token A
  tokenBDecimal: number;         // Decimal places for token B
  poolFees: PoolFees;            // Fee configuration
  hasAlphaVault: boolean;        // Whether the pool has an alpha vault
  collectFeeMode: number;        // How fees are collected (0: normal, 1: alpha)
  activationPoint: BN;           // The slot or timestamp for activation
  activationType: number;        // 0: slot, 1: timestamp
  tokenAProgram: PublicKey;      // Token program for token A
  tokenBProgram: PublicKey;      // Token program for token B
}

interface PoolFees {
  baseFee: {
    feeSchedulerMode: number;  // 0: Linear, 1: Exponential
    cliffFeeNumerator: number; 
    numberOfPeriod: number;   
    reductionFactor: number; 
    periodFrequency: number;  
  };
  partnerFee?: {                
    partnerAddress: PublicKey;  
    partnerFeeNumerator: number;
  };
  dynamicFee?: {              
    initialized: boolean;     
    volatilityAccumulator?: number; 
    binStep?: number;        
    variableFeeControl?: {    
      maxFeeNumerator: number;
      minFeeNumerator: number;
      volatilityThreshold: number;
      feeDamper: number;   
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
  minSqrtPrice: MIN_SQRT_PRICE,
  maxSqrtPrice: MAX_SQRT_PRICE,
  tokenADecimal: 6,
  tokenBDecimal: 8,
  poolFees,
  hasAlphaVault: false,
  collectFeeMode: 0, // 0: BothToken, 1: onlyB
  activationPoint: new BN(Date.now()),
  activationType: 1, // 0: slot, 1: timestamp
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});

const Function = await wallet.sendTransaction(tx, connection);
```

#### Notes
- Use this function instead of `createPool` when you need custom fee structures
- Dynamic fees can adjust based on market volatility
- Partner fees allow a portion of trading fees to be directed to a specific account
- Alpha vault is an advanced feature for protocol-owned liquidity

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
const Function = await wallet.sendTransaction(tx, connection);
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
}
```

#### Returns
An object containing:
- `swapInAmount`: The input amount
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
  poolState
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

---

### getLiquidityDelta

Calculates the liquidity delta based on the provided token amounts and price ranges.

#### Function
```typescript
async getLiquidityDelta(params: LiquidityDeltaParams): Promise<BN>
```

#### Parameters
```typescript
interface LiquidityDeltaParams {
  maxAmountTokenA: BN;          // Maximum amount of token A to use
  maxAmountTokenB: BN;          // Maximum amount of token B to use
  sqrtMaxPrice: BN;             // Maximum sqrt price for the range
  sqrtMinPrice: BN;             // Minimum sqrt price for the range
  sqrtPrice: BN;                // Current sqrt price
}
```

#### Returns
A BN representing the liquidity delta in Q64 format.

#### Example
```typescript
const poolState = await cpAmm.fetchPoolState(poolAddress);

const liquidityDelta = await cpAmm.getLiquidityDelta({
  maxAmountTokenA: new BN(1_000_000_000), // 1,000 USDC
  maxAmountTokenB: new BN(5_000_000_000), // 5 SOL
  sqrtPrice: poolState.sqrtPrice,
  sqrtMinPrice: MIN_SQRT_PRICE,
  sqrtMaxPrice: MAX_SQRT_PRICE
});

console.log(`Liquidity delta: ${liquidityDelta.toString()}`);
```

#### Notes
- This function is used before adding liquidity to calculate the appropriate liquidity delta
- The function returns the minimum liquidity that can be added based on both token amounts
- The result is in Q64 fixed-point notation

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
  poolState
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
const Function = await wallet.sendTransaction(tx, connection);
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
  positionNftMint: PublicKey;    // The position NFT mint
  liquidityDeltaQ64: BN;         // The amount of liquidity to add in Q64 format
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
// Calculate liquidity delta first
const liquidityDelta = await cpAmm.getLiquidityDelta({
  maxAmountTokenA: new BN(1_000_000_000), // 1,000 USDC
  maxAmountTokenB: new BN(5_000_000_000), // 5 SOL
  sqrtPrice: poolState.sqrtPrice,
  sqrtMinPrice: MIN_SQRT_PRICE,
  sqrtMaxPrice: MAX_SQRT_PRICE
});

// Add liquidity
const addLiquidityTx = await cpAmm.addLiquidity({
  owner: wallet.publicKey,
  pool: poolAddress,
  position: positionAddress,
  positionNftMint: positionNftMint,
  liquidityDeltaQ64: liquidityDelta,
  maxAmountTokenA: new BN(1_000_000_000),
  maxAmountTokenB: new BN(5_000_000_000),
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
const Function = await wallet.sendTransaction(tx, connection);
```

#### Notes
- Calculate the liquidity delta first using `getLiquidityDelta`
- The SDK handles wrapping/unwrapping of SOL automatically
- Token accounts are created automatically if they don't exist
- Set appropriate thresholds to protect against slippage

---

### removeLiquidity

Removes liquidity from an existing position.

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
  positionNftMint: PublicKey;    // The position NFT mint
  liquidityDeltaQ64: BN;         // The amount of liquidity to remove in Q64 format
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
// Get position state to determine available liquidity
const positionState = await cpAmm.fetchPositionState(positionAddress);

// Remove half of the available liquidity
const liquidityToRemove = positionState.liquidity.div(new BN(2));

const removeLiquidityTx = await cpAmm.removeLiquidity({
  owner: wallet.publicKey,
  pool: poolAddress,
  position: positionAddress,
  positionNftMint: positionNftMint,
  liquidityDeltaQ64: liquidityToRemove,
  tokenAAmountThreshold: new BN(0), // Set appropriate thresholds for slippage protection
  tokenBAmountThreshold: new BN(0),
  tokenAMint: poolState.tokenAMint,
  tokenBMint: poolState.tokenBMint,
  tokenAVault: poolState.tokenAVault,
  tokenBVault: poolState.tokenBVault,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});

const tx = await removeLiquidityTx.transaction();
const Function = await wallet.sendTransaction(tx, connection);
```

#### Notes
- You can only remove unlocked liquidity
- The SDK handles wrapping/unwrapping of SOL automatically
- Token accounts are created automatically if they don't exist
- Set appropriate thresholds to protect against slippage
- Removing all liquidity doesn't close the position

---

### lockPosition

Locks a position with a vesting schedule for gradual unlocking over time.

#### Function
```typescript
async lockPosition(params: LockPositionParams): TxBuilder
```

#### Parameters
```typescript
interface LockPositionParams {
  owner: PublicKey;              // The owner of the position
  pool: PublicKey;               // The pool address
  payer: PublicKey;              // The payer for the transaction
  vestingAccount: PublicKey;     // The vesting account to create
  position: PublicKey;           // The position address
  positionNftMint: PublicKey;    // The position NFT mint
  cliffPoint: BN;                // The slot or timestamp for the cliff
  periodFrequency: BN;           // Frequency of unlock periods
  cliffUnlockLiquidity: BN;      // Liquidity to unlock at cliff
  liquidityPerPeriod: BN;        // Liquidity to unlock per period
  numberOfPeriod: number;        // Number of unlock periods
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const lockPositionTx = await cpAmm.lockPosition({
  owner: wallet.publicKey,
  pool: poolAddress,
  payer: wallet.publicKey,
  vestingAccount: vestingAccountAddress, // Generated keypair
  position: positionAddress,
  positionNftMint: positionNftMint,
  cliffPoint: new BN(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days cliff
  periodFrequency: new BN(7 * 24 * 60 * 60), // 7 days per period
  cliffUnlockLiquidity: new BN(0), // No liquidity at cliff
  liquidityPerPeriod: new BN("1000000000000000"), // Amount in Q64 format
  numberOfPeriod: 52 // 52 periods (1 year with weekly unlocks)
});

const tx = await lockPositionTx.transaction();
const Function = await wallet.sendTransaction(tx, connection);
```

#### Notes
- The vesting schedule is enforced on-chain
- Locked liquidity cannot be removed until it's unlocked according to the schedule
- The `vestingAccount` should be a new keypair
- The `cliffPoint` and `periodFrequency` are in the same units as the pool's activation type

---

### permanentLockPosition

Permanently locks a portion of a position's liquidity (cannot be unlocked).

#### Function
```typescript
async permanentLockPosition(params: PermanentLockParams): TxBuilder
```

#### Parameters
```typescript
interface PermanentLockParams {
  owner: PublicKey;              // The owner of the position
  position: PublicKey;           // The position address
  positionNftMint: PublicKey;    // The position NFT mint
  pool: PublicKey;               // The pool address
  unlockedLiquidity: BN;         // Amount of liquidity to permanently lock
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const positionState = await cpAmm.fetchPositionState(positionAddress);

// Lock 20% of the position's liquidity permanently
const liquidityToLock = positionState.liquidity.mul(new BN(20)).div(new BN(100));

const permLockTx = await cpAmm.permanentLockPosition({
  owner: wallet.publicKey,
  position: positionAddress,
  positionNftMint: positionNftMint,
  pool: poolAddress,
  unlockedLiquidity: liquidityToLock
});

const tx = await permLockTx.transaction();
const Function = await wallet.sendTransaction(tx, connection);
```

#### Notes
- Permanently locked liquidity can never be withdrawn
- You can only permanently lock liquidity that is currently unlocked
- This is useful for governance or long-term incentive mechanisms

---

### refreshVesting

Updates the vesting status of a position to reflect elapsed time and unlock available liquidity.

#### Function
```typescript
async refreshVesting(params: RefreshVestingParams): TxBuilder
```

#### Parameters
```typescript
interface RefreshVestingParams {
  owner: PublicKey;              // The owner of the position
  position: PublicKey;           // The position address
  positionNftMint: PublicKey;    // The position NFT mint
  pool: PublicKey;               // The pool address
  vestings: PublicKey[];         // Array of vesting accounts to refresh
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const refreshVestingTx = await cpAmm.refreshVesting({
  owner: wallet.publicKey,
  position: positionAddress,
  positionNftMint: positionNftMint,
  pool: poolAddress,
  vestings: [vestingAccountAddress1, vestingAccountAddress2]
});

const tx = await refreshVestingTx.transaction();
const Function = await wallet.sendTransaction(tx, connection);
```

#### Notes
- This function should be called periodically to update the unlocked liquidity amount
- It doesn't automatically withdraw the unlocked liquidity
- After refreshing, you can use `removeLiquidity` to withdraw the newly unlocked liquidity
- You can refresh multiple vesting schedules in a single transaction

---

### claimPositionFee

Claims accumulated swap fees for a liquidity position.

#### Function
```typescript
async claimPositionFee(params: ClaimPositionFeeParams): TxBuilder
```

#### Parameters
```typescript
interface ClaimPositionFeeParams {
  owner: PublicKey;              // The owner of the position
  pool: PublicKey;               // The pool address
  position: PublicKey;           // The position address
  nftPositionMint: PublicKey;    // The position NFT mint
  tokenAVault: PublicKey;        // The pool's token A vault
  tokenBVault: PublicKey;        // The pool's token B vault
  tokenAMint: PublicKey;         // The mint of token A
  tokenBMint: PublicKey;         // The mint of token B
  tokenAProgram: PublicKey;      // Token program for token A
  tokenBProgram: PublicKey;      // Token program for token B
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const claimFeeTx = await cpAmm.claimPositionFee({
  owner: wallet.publicKey,
  pool: poolAddress,
  position: positionAddress,
  nftPositionMint: positionNftMint,
  tokenAVault: poolState.tokenAVault,
  tokenBVault: poolState.tokenBVault,
  tokenAMint: poolState.tokenAMint,
  tokenBMint: poolState.tokenBMint,
  tokenAProgram: TOKEN_PROGRAM_ID,
  tokenBProgram: TOKEN_PROGRAM_ID
});

const tx = await claimFeeTx.transaction();
const Function = await wallet.sendTransaction(tx, connection);
```

#### Notes
- Fees are accumulated in both token A and token B
- The SDK handles wrapping/unwrapping of SOL automatically
- Token accounts are created automatically if they don't exist
- Fees can be claimed regardless of whether liquidity is locked

---

### claimPartnerFee

Claims partner fees from a pool (if the pool has partner fees configured).

#### Function
```typescript
async claimPartnerFee(params: ClaimPartnerFeeParams): TxBuilder
```

#### Parameters
```typescript
interface ClaimPartnerFeeParams {
  partner: PublicKey;            // The partner address
  pool: PublicKey;               // The pool address
  maxAmountA: BN;                // Maximum amount of token A to claim
  maxAmountB: BN;                // Maximum amount of token B to claim
}
```

#### Returns
A transaction builder (`TxBuilder`) that can be used to build, sign, and send the transaction.

#### Example
```typescript
const claimPartnerFeeTx = await cpAmm.claimPartnerFee({
  partner: partnerWallet.publicKey,
  pool: poolAddress,
  maxAmountA: new B
