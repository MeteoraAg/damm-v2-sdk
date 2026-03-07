## Summary

This PR adds SDK support for **DAMM v2 on-chain program v0.2.0**, which introduces:

1. **Compounding fee mode** — a new `CollectFeeMode` where a configurable portion of LP fees is automatically reinvested back into pool reserves instead of accumulating in positions.
2. **Pool layout versioning** — V1 layout pools track `tokenAAmount` / `tokenBAmount` on-chain. A new `fixPoolLayoutVersion()` instruction migrates legacy V0 pools.
3. **Partner fee removal** — `claimPartnerFee` instruction removed; fee terminology updated to `claimingFee` (LP claimers) + `compoundingFee` (auto-reinvested).

---

## Breaking Changes

### `partnerFee` → `claimingFee` + `compoundingFee`

All swap result objects, fee split interfaces, and fee math functions have been updated:

| Old | New |
|-----|-----|
| `SwapResult2.partnerFee` | `SwapResult2.claimingFee` + `SwapResult2.compoundingFee` |
| `FeeOnAmountResult.partnerFee` | `FeeOnAmountResult.claimingFee` + `FeeOnAmountResult.compoundingFee` |
| `SplitFees.partnerFee` | `SplitFees.claimingFee` + `SplitFees.compoundingFee` |
| `splitFees(..., hasPartner: boolean)` | `splitFees(..., collectFeeMode: CollectFeeMode)` |
| `getFeeOnAmount(..., hasPartner: boolean)` | `getFeeOnAmount(..., collectFeeMode: CollectFeeMode)` |

### `claimPartnerFee()` removed

The method is removed from `CpAmm`. The corresponding on-chain instruction was dropped in program v0.2.0.

### `hasPartner()` removed

Replaced by `isCompoundingPool(pool: PoolState): boolean`.

---

## New Features

### `CollectFeeMode.Compounding`

```typescript
export enum CollectFeeMode {
  BothToken   = 0,
  OnlyB       = 1,
  Compounding = 2, // NEW
}
```

Create a compounding pool by passing `CollectFeeMode.Compounding` + `compoundingFeeBps` at init.

### `PoolLayoutVersion` + `fixPoolLayoutVersion()`

```typescript
export enum PoolLayoutVersion { V0 = 0, V1 = 1 }

// Migrates a V0 pool to V1 (one-way, owner/operator must sign)
await cpAmm.fixPoolLayoutVersion(poolKey, ownerKey);
```

### `getPoolReserves(pool)` / `isCompoundingPool(pool)`

```typescript
const reserves = getPoolReserves(poolState); // null for V0 pools
const isComp   = isCompoundingPool(poolState);
```

### `parseEvtSwap2()` / `subscribeToSwapEvents()`

New helpers in `src/helpers/events.ts` for consuming the updated on-chain event.

---

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Version 1.3.6 → 2.0.0 |
| `src/types.ts` | CollectFeeMode.Compounding, PoolLayoutVersion, SwapResult2 (manual type), FeeOnAmountResult, SplitFees, CreateConfigParams, remove ClaimPartnerFeeParams |
| `src/constants.ts` | PROGRAM_VERSION, MIN_RESERVE_TRACKING_LAYOUT_VERSION |
| `src/math/feeMath.ts` | splitFees() + getFeeOnAmount() signatures, CollectFeeMode.Compounding fee split logic |
| `src/math/quote.ts` | Replace partnerFee with claimingFee/compoundingFee throughout |
| `src/helpers/common.ts` | Remove hasPartner() |
| `src/helpers/utils.ts` | Add getPoolReserves(), isCompoundingPool() |
| `src/helpers/events.ts` | New file — ParsedEvtSwap2, parseEvtSwap2(), subscribeToSwapEvents() |
| `src/helpers/index.ts` | Export events.ts |
| `src/CpAmm.ts` | Remove claimPartnerFee(), add fixPoolLayoutVersion(), fix totalFee calc |
| `tests/collectFeeMode.test.ts` | New — CollectFeeMode/PoolLayoutVersion unit tests |
| `tests/feeSplit.test.ts` | New — splitFees() unit tests for all 3 modes |
| `tests/eventDeserialization.test.ts` | New — parseEvtSwap2() unit tests |
| `CHANGELOG.md` | Full v2.0.0 changelog |
| `MIGRATION_GUIDE.md` | New — step-by-step migration from v1.x |
| `docs.md` | Add v2.0.0 banner, replace claimPartnerFee with fixPoolLayoutVersion |

---

## IDL Note

The on-chain IDL (`src/idl/cp_amm.json`) must be regenerated once program v0.2.0 is deployed:
- `SwapResult2`: replace `partner_fee` with `claiming_fee` + `compounding_fee`
- `PoolFeesStruct`: add `compounding_fee_bps` field
- `Pool` account: add `layout_version` (u8), `token_a_amount` (u64), `token_b_amount` (u64)
- New instruction: `fix_pool_layout_version`
- Remove instruction: `claim_partner_fee`

Until then, `SwapResult2` is typed manually in `src/types.ts` and `fixPoolLayoutVersion()` uses a cast to `any`.

---

## Migration

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for full before/after diffs.

## Testing

```bash
pnpm test # runs vitest — new unit tests pass without bankrun
```

TypeScript: `pnpm check-types` — clean, 0 errors.
