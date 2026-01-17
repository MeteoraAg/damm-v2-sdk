# Changelog

All notable changes to this project will be documented in this file.

## damm_v2_sdk [1.3.0]

### Changed

- Fixed `initializeReward` function to parse in `remainingAccounts`

## damm_v2_sdk [1.2.10]

### Changed

- Fixed `fundReward` function to use params instead of `tokenProgram`


## damm_v2_sdk [1.2.8] [PR #93](https://github.com/MeteoraAg/damm-v2-sdk/pull/93)

### Added

- Optional `receiver` parameter to `swap` and `swap2` endpoints to allow specifying the receiver of the input and output tokens

## damm_v2_sdk [1.2.8]

### Changed

- Cleaned up unused parameters in `getBaseFeeHandler`, `getTotalTradingFeeFromIncludedFeeAmount` and `getTotalTradingFeeFromExcludedFeeAmount` functions
- Cleaned up unused parameters in `getQuote2` function
- Cleaned up unused parameters in `swapQuoteExactInput`, `swapQuoteExactOutput`, `swapQuotePartialInput` functions
- Created a type `DecodedPoolFees` to store the decoded pool fees from Pod Aligned format

## damm_v2_sdk [1.2.7] [PR #85](https://github.com/MeteoraAg/damm-v2-sdk/pull/85)

### Added

- Added `fetchPoolFees` state function to fetch and decode the pool fees from Pod Aligned format
- Added 2 new base fee modes: `FeeMarketCapSchedulerLinear` and `FeeMarketCapSchedulerExponential`
- Added encode and decode functions for Fee Time Scheduler, Fee Market Cap Scheduler and Fee Rate Limiter to encode and decode the base fee parameters between Borsh format and Pod Aligned formats

### Changed

- Added `feeMarketCapSchedulerParam` parameters to `getBaseFeeParams` function
- Changed `feeSchedulerParam` to `feeTimeSchedulerParam` in `getBaseFeeParams` function
- Improved validation for pool fee parameters
- Changed `getBaseFeeHandler` interface
- Bumped Pool Version from V0 (Max fee 50%) to V1 (Max fee 99%)

## damm_v2_sdk [1.2.6]

### Changed

- Moved `getCurrentPoint` in `if` statement to reduce unnecessary RPC calls

## damm_v2_sdk [1.2.5] [PR #84](https://github.com/MeteoraAg/damm-v2-sdk/pull/84)

### Added

- Added an `if` statement to check if the `baseFeeMode` is `RateLimiter` in `swap` and `swap2` endpoints

## damm_v2_sdk [1.2.4] [PR #81](https://github.com/MeteoraAg/damm-v2-sdk/pull/81)

### Added

- Added `fetchPoolStatesByTokenAMint` endpoint to fetch all Pool states by tokenAMint

## damm_v2_sdk [1.2.3] [PR #80](https://github.com/MeteoraAg/damm-v2-sdk/pull/80)

### Added

- Added `initializeReward` endpoint to initialize a reward for a pool
- Added `initializeAndFundReward` endpoint to initialize and fund a reward for a pool

### Changed

- Changed `getUnclaimReward` helper function name to `getUnClaimLpFee`
- Included `funder`, `creator` and `rewardMintProgram` parameters to `InitializeRewardParams`
- Changed from `admin` to `signer` in `updateRewardDuration` and `updateRewardFunder` endpoints
- Included `rewardMint`, `rewardVault` and `rewardMintProgram` parameters to `fundReward` endpoint
- Changed from `skipReward` to `isSkipReward` in `withdrawIneligbleReward` endpoint

## damm_v2_sdk [1.2.2]

### Fixed

- Added `tokenProgram` parameter to `getTokenDecimals`

## damm_v2_sdk [1.2.1]

### Fixed

- Fixed rate limiter parameters in `getBaseFeeParams`

## damm_v2_sdk [1.2.0] [PR #79](https://github.com/MeteoraAg/damm-v2-sdk/pull/79)

### Changed

- Changed the IDL export type

## damm_v2_sdk [1.1.9] [PR #78](https://github.com/MeteoraAg/damm-v2-sdk/pull/78)

### Fixed

- Fixed fee scheduler validation for `getMinBaseFeeNumerator`
- Added checks for Alpha Vault fee in `getBaseFeeNumerator`

## damm_v2_sdk [1.1.8] [PR #77](https://github.com/MeteoraAg/damm-v2-sdk/pull/77)

### Added

- Added `poolState` to `SwapParams` and `Swap2Params` to allow passing in the pool state to atomically fetch the pool state

## damm_v2_sdk [1.1.7] [PR #76](https://github.com/MeteoraAg/damm-v2-sdk/pull/76)

### Changed

- Updated the order of liqudiity delta and sqrt prices in `getAmountAFromLiquidityDelta` and `getAmountBFromLiquidityDelta`

## damm_v2_sdk [1.1.6] [PR #74](https://github.com/MeteoraAg/damm-v2-sdk/pull/74)

### Added

- Add new `swap2` endpoint to allow swap with 3 different swap modes: ExactIn, ExactOut, PartialFill
- Add new `getQuote2` endpoint to allow getting swap quotes for different swap modes: ExactIn, ExactOut, PartialFill
- Add `rateLimiter` fee calculation in swap and get quote endpoints
- Added `SYSVAR_INSTRUCTIONS_PUBKEY` to remaining accounts if rate limiter is applied for `swap` and `swap2` endpoints

### Changed

- Updated `getBaseFeeParams` to include rate limiter parameters
- Refactored `getFeeSchedulerParams` to be compatible with different pool versions
- Added `getRateLimiterParams` to prepare rate limiter parameters
- Changed `getQuote` quote calculation with `getSwapResultFromExactInput`

## damm_v2_sdk [1.1.5] [PR #68](https://github.com/MeteoraAg/damm-v2-sdk/pull/68)

### Added

- Add new function `splitPosition2` to allow split position via numerator

## damm_v2_sdk [1.1.0] [PR #59](https://github.com/MeteoraAg/damm-v2-sdk/pull/59)

### Added

- Add new function `splitPosition` to allow split position which splits the position's unlocked liquidity, locked liquidity, fee and reward

### Changed

- `ClaimRewardParams` now has new field `skipReward` to allow skip reward transfer.
- Removed `protocolFeePercent`, `partnerFeePercent` and `referralFeePercent` from `PoolFeesParams` and replaced with `padding[]` field.

## damm_v2_sdk [1.0.9] [PR #54](https://github.com/MeteoraAg/damm-v2-sdk/pull/54)

### Added

- Add new function `claimPositionFee2` to allow claim position fee
