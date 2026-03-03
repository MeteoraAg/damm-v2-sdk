import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";

/**
 * Parsed result of an EvtSwap2 on-chain event (DAMM v2 program v0.2.0+).
 *
 * Breaking change vs v0.1.x:
 *  - `partner_fee` removed
 *  - `claimingFee` added
 *  - `compoundingFee` added
 *  - `tokenAReserveAmount` added (only populated on V1 layout pools)
 *  - `tokenBReserveAmount` added (only populated on V1 layout pools)
 */
export type ParsedEvtSwap2 = {
  pool: PublicKey;
  inAmount: BN;
  outAmount: BN;
  tradingFee: BN;
  protocolFee: BN;
  /** Fee distributed to LP claimers */
  claimingFee: BN;
  /** Fee compounded back into pool reserves (0 for BothToken / OnlyB pools) */
  compoundingFee: BN;
  referralFee: BN;
  /** Token A vault balance post-swap; only valid on V1 layout pools */
  tokenAReserveAmount: BN;
  /** Token B vault balance post-swap; only valid on V1 layout pools */
  tokenBReserveAmount: BN;
};

/**
 * Parses a raw EvtSwap2 event emitted by the DAMM v2 on-chain program v0.2.0+.
 *
 * @param event - Raw event object from program.addEventListener or log parsing
 * @returns Strongly-typed ParsedEvtSwap2
 *
 * @example
 * program.addEventListener("EvtSwap2", (event) => {
 *   const parsed = parseEvtSwap2(event);
 *   console.log("claimingFee:", parsed.claimingFee.toString());
 *   console.log("compoundingFee:", parsed.compoundingFee.toString());
 * });
 */
export function parseEvtSwap2(event: any): ParsedEvtSwap2 {
  const sr = event.swapResult;
  return {
    pool: new PublicKey(event.pool),
    inAmount: new BN(sr.inAmount),
    outAmount: new BN(sr.outAmount),
    tradingFee: new BN(sr.tradingFee),
    protocolFee: new BN(sr.protocolFee),
    claimingFee: new BN(sr.claimingFee),
    compoundingFee: new BN(sr.compoundingFee),
    referralFee: new BN(sr.referralFee ?? 0),
    tokenAReserveAmount: new BN(sr.tokenAReserveAmount ?? 0),
    tokenBReserveAmount: new BN(sr.tokenBReserveAmount ?? 0),
  };
}

/**
 * Subscribe to EvtSwap2 events on a specific pool.
 * Returns an unsubscribe function.
 *
 * @example
 * const unsub = subscribeToSwapEvents(program, poolAddress, (evt) => {
 *   console.log("Swap compoundingFee:", evt.compoundingFee.toString());
 * });
 * // Later:
 * unsub();
 */
export function subscribeToSwapEvents(
  program: any,
  poolFilter: PublicKey | null,
  callback: (evt: ParsedEvtSwap2) => void,
): () => void {
  const listenerId = program.addEventListener("EvtSwap2", (event: any) => {
    const parsed = parseEvtSwap2(event);
    if (poolFilter && !parsed.pool.equals(poolFilter)) return;
    callback(parsed);
  });

  return () => program.removeEventListener(listenerId);
}
