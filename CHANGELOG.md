# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

### Breaking Changes

## damm_v2_sdk [1.1.0] [PR #59](https://github.com/MeteoraAg/damm-v2-sdk/pull/59)

### Added

- Add new function `splitPosition` to allow split position which splits the position's unlocked liquidity, locked liquidity, fee and reward

### Changed

- `ClaimRewardParams` now has new field `skipReward` to allow skip reward transfer.
- Removed `protocolFeePercent`, `partnerFeePercent` and `referralFeePercent` from `PoolFeesParams` and replaced with `padding[]` field.

## damm_v2_sdk [1.0.9] [PR #54](https://github.com/MeteoraAg/damm-v2-sdk/pull/54)

### Added

- Add new function `claimPositionFee2` to allow claim position fee
