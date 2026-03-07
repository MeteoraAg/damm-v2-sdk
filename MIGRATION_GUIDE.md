# Migration Guide — SDK v1.x → v2.0.0

This guide covers breaking changes introduced in `@meteora-ag/cp-amm-sdk`
v2.0.0, which targets **DAMM v2 on-chain program v0.2.0**.

---

## 1. Rename `partnerFee` → `claimingFee` + `compoundingFee`

All occurrences of the old `partnerFee` field must be updated.

### SwapResult2 / Quote2Result

```diff
- const totalFee = swapResult.tradingFee
-   .add(swapResult.protocolFee)
-   .add(swapResult.partnerFee)
-   .add(swapResult.referralFee);
+ const totalFee = swapResult.tradingFee
+   .add(swapResult.protocolFee)
+   .add(swapResult.claimingFee)
+   .add(swapResult.compoundingFee)
+   .add(swapResult.referralFee);
```

### FeeOnAmountResult / SplitFees

```diff
- result.partnerFee
+ result.claimingFee   // fee sent to LP position claimers
+ result.compoundingFee // fee reinvested into pool (0 unless Compounding mode)
```

---

## 2. `splitFees()` / `getFeeOnAmount()` signature change

The 4th argument changed from `hasPartner: boolean` to `collectFeeMode: CollectFeeMode`.

```diff
- splitFees(poolFees, feeAmount, hasReferral, hasPartner(poolState));
+ splitFees(poolFees, feeAmount, hasReferral, poolState.collectFeeMode as CollectFeeMode);
```

```diff
- getFeeOnAmount(poolFees, amount, tradeFeeNumerator, hasReferral, hasPartner(poolState));
+ getFeeOnAmount(poolFees, amount, tradeFeeNumerator, hasReferral, poolState.collectFeeMode as CollectFeeMode);
```

---

## 3. Remove calls to `claimPartnerFee()`

The `claimPartnerFee` instruction no longer exists on-chain.

```diff
- const tx = await cpAmm.claimPartnerFee({
-   partner,
-   pool,
-   maxAmountA,
-   maxAmountB,
- });
```

If your integration relied on partner fee accumulation, fees now accumulate as
`claimingFee` within LP positions. Use `claimPositionFee()` instead.

---

## 4. Remove `hasPartner()` usage

```diff
- import { hasPartner } from "@meteora-ag/cp-amm-sdk";
- if (hasPartner(poolState)) { ... }
+ import { isCompoundingPool } from "@meteora-ag/cp-amm-sdk";
+ if (isCompoundingPool(poolState)) { ... }
```

---

## 5. Handle V0 pools that don't track reserves

Pools created before program v0.2.0 have `layoutVersion === 0` and do NOT
expose `tokenAAmount` / `tokenBAmount` on-chain.

**Option A — Migrate the pool (recommended):**

```typescript
import { PoolLayoutVersion } from "@meteora-ag/cp-amm-sdk";

const poolState = await cpAmm.fetchPoolState(poolKey);

if ((poolState as any).layoutVersion === PoolLayoutVersion.V0) {
  const tx = await cpAmm.fixPoolLayoutVersion(poolKey, ownerPublicKey);
  await sendAndConfirmTransaction(connection, tx, [ownerKeypair]);
}

// Now tokenAAmount / tokenBAmount are available on-chain.
```

**Option B — Use the helper that returns null for V0:**

```typescript
import { getPoolReserves } from "@meteora-ag/cp-amm-sdk";

const reserves = getPoolReserves(poolState);
if (reserves === null) {
  // Legacy pool, derive reserves off-chain from vault balances
} else {
  const { tokenAAmount, tokenBAmount } = reserves;
}
```

---

## 6. Update event consumers for EvtSwap2

The on-chain event `EvtSwap2` no longer contains `partner_fee`. Use the new
helper to parse events:

```typescript
import { subscribeToSwapEvents } from "@meteora-ag/cp-amm-sdk";

const unsub = subscribeToSwapEvents(program, poolKey, (evt) => {
  console.log("claimingFee:",    evt.claimingFee.toString());
  console.log("compoundingFee:", evt.compoundingFee.toString());
  console.log("tokenAReserve:",  evt.tokenAReserveAmount.toString());
});

// Cleanup when done:
unsub();
```

---

## 7. Creating Compounding pools

To create a pool with fee auto-compounding, pass `collectFeeMode: CollectFeeMode.Compounding`
and `compoundingFeeBps` (the percentage of LP fees to reinvest, in basis points):

```typescript
import { CollectFeeMode } from "@meteora-ag/cp-amm-sdk";

const { tx, pool } = await cpAmm.createCustomPool({
  // ... other params ...
  collectFeeMode: CollectFeeMode.Compounding,
  compoundingFeeBps: new BN(2000), // 20% of LP fee reinvested
});
```

The remaining 80% of LP fee continues to accumulate in positions and is
claimable via `claimPositionFee()`.

---

## Quick Checklist

- [ ] Replace `swapResult.partnerFee` with `claimingFee` + `compoundingFee`
- [ ] Update `splitFees()` / `getFeeOnAmount()` calls
- [ ] Remove `claimPartnerFee()` calls
- [ ] Replace `hasPartner()` with `isCompoundingPool()` where appropriate
- [ ] Add null-guard for `getPoolReserves()` on V0 layout pools
- [ ] Update `EvtSwap2` event consumers
