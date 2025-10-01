# Changelog

All notable changes to this project will be documented in this file.

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
