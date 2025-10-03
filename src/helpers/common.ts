import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { ActivationType, PoolStatus } from "../types";

export function hasPartner(partner: PublicKey): boolean {
  return !partner.equals(PublicKey.default);
}

export function getCurrentPoint(
  activationType: number,
  currentSlot: BN,
  currentTimestamp: BN
): BN {
  if (
    activationType !== ActivationType.Slot &&
    activationType !== ActivationType.Timestamp
  ) {
    throw new Error("invalid activation type");
  }

  if (activationType === ActivationType.Slot) {
    return currentSlot;
  } else {
    return currentTimestamp;
  }
}

export function isSwapEnable(
  pool: { poolStatus: PoolStatus; activationPoint: BN },
  currentPoint: BN
): boolean {
  if (typeof pool.poolStatus !== "number") {
    throw new Error("invalid pool status");
  }

  return (
    pool.poolStatus === PoolStatus.Enable &&
    currentPoint.gte(pool.activationPoint)
  );
}
