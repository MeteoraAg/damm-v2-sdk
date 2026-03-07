# Changelog

All notable changes to `@meteora-ag/cp-amm-sdk` are documented here.

## [2.0.0] — 2025-Q2 (Unreleased)

Supports **DAMM v2 on-chain program v0.2.0**.

### ⚠️ Breaking Changes

#### Fee model: `partnerFee` → `claimingFee` + `compoundingFee`

The concept of a "partner fee" has been removed from the on-chain program. Fee
splits are now:

| Field            | Description |
|------------------|-------------|
| `tradingFee`     | LP fee (unchanged) |
| `protocolFee`    | Protocol cut (unchanged) |
| `referralFee`    | Referral cut (unchanged) |
| **`claimingFee`**    | Portion distributed to LP position claimers (replaces `partnerFee`) |
| **`compoundingFee`** | Portion auto-compounded back into pool reserves (new; always 0 for BothToken/OnlyB modes) |

**Affected types and functions:**

- `SwapResult2` — `partnerFee` → `claimingFee` + `compoundingFee`
- `FeeOnAmountResult` — same rename
- `SplitFees` — same rename
- `splitFees(poolFees, feeAmount, hasReferral, collectFeeMode)` —
  4th parameter changed from `hasPartner: boolean` to `collectFeeMode: CollectFeeMode`
- `getFeeOnAmount(…, collectFeeMode)` — same

#### `CollectFeeMode.Compounding` added

```typescript
export enum CollectFeeMode {
  BothToken = 0,
  OnlyB     = 1,
  Compounding = 2, // NEW — fee auto-compounded back into pool reserves
}
```

When a pool uses `Compounding` mode, part of the LP fee is reinvested into
pool reserves rather than being claimable by positions. The split is configured
at pool creation via `compoundingFeeBps`.

#### `claimPartnerFee()` removed

The `claimPartnerFee` method and `ClaimPartnerFeeParams` type are removed.
The corresponding on-chain instruction no longer exists.

#### `hasPartner()` removed

The `hasPartner(poolState)` helper function is removed. Check
`isCompoundingPool(poolState)` instead.

#### `PoolLayoutVersion` enum added

```typescript
export enum PoolLayoutVersion {
  V0 = 0, // Legacy — no on-chain reserve tracking
  V1 = 1, // New — tracks tokenAAmount + tokenBAmount on-chain
}
```

Older pools have `layoutVersion === 0` and do NOT expose reserve amounts.
Call `fixPoolLayoutVersion(pool, ownerOrOperator)` to migrate them to V1.

---

### New Features

#### `CollectFeeMode.Compounding` pool creation

Pass `compoundingFeeBps` in `InitializeCustomizeablePoolParams` (or
`CreateConfigParams`) to create a pool where a fraction of LP fees is
automatically reinvested.

#### `fixPoolLayoutVersion(poolAddress, ownerOrOperator)`

New CpAmm method. Migrates a V0 pool to V1 layout, enabling on-chain reserve
tracking. One-way migration; requires pool owner or operator to sign.

```typescript
const tx = await cpAmm.fixPoolLayoutVersion(poolKey, ownerKey);
await sendAndConfirmTransaction(connection, tx, [ownerKeypair]);
```

#### `getPoolReserves(pool)` helper

Returns `{ tokenAAmount, tokenBAmount }` for V1 layout pools, or `null` for
legacy V0 pools.

#### `isCompoundingPool(pool)` helper

Returns `true` when `pool.collectFeeMode === CollectFeeMode.Compounding`.

#### `parseEvtSwap2(event)` / `subscribeToSwapEvents()` (new `src/helpers/events.ts`)

Utilities for consuming the updated `EvtSwap2` on-chain event, which now
includes `claimingFee`, `compoundingFee`, and reserve snapshot fields.

---

### Constants

- `PROGRAM_VERSION = "0.2.0"` — on-chain program version this SDK targets
- `MIN_RESERVE_TRACKING_LAYOUT_VERSION = PoolLayoutVersion.V1`

---

## [1.3.6] — (Previous stable)

Legacy release. Supports DAMM v2 on-chain program v0.1.x.
