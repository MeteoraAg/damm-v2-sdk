# Changelog

All notable changes to this project will be documented in this file.

## damm_v2_sdk [1.1.8] [PR #78](https://github.com/MeteoraAg/damm-v2-sdk/pull/78)

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
