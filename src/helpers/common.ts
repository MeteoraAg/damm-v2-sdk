import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { ActivationType, PoolStatus, PoolVersion } from "../types";
import { MAX_FEE_BPS_V0, MAX_FEE_BPS_V1 } from "../constants";

export function hasPartner(partner: PublicKey): boolean {
  return !partner.equals(PublicKey.default);
}

export async function getCurrentPoint(
  connection: Connection,
  activationType: ActivationType
): Promise<BN> {
  const currentSlot = await connection.getSlot();

  if (activationType === ActivationType.Slot) {
    return new BN(currentSlot);
  } else {
    const currentTime = await connection.getBlockTime(currentSlot);
    return new BN(currentTime);
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

export function getMaxFeeBps(poolVersion: PoolVersion): number {
  switch (poolVersion) {
    case PoolVersion.V0:
      return MAX_FEE_BPS_V0;
    case PoolVersion.V1:
      return MAX_FEE_BPS_V1;
    default:
      throw new Error("Invalid pool version");
  }
}

export function convertToFeeSchedulerSecondFactor(value: BN): number[] {
  return Array.from(value.toArrayLike(Buffer, "le", 8));
}

export function parseFeeSchedulerSecondFactor(secondFactor: number[]): BN {
  return new BN(Buffer.from(secondFactor), "le");
}

export function convertToRateLimiterSecondFactor(
  maxLimiterDuration: BN,
  maxFeeBps: BN
): number[] {
  const buffer1 = maxLimiterDuration.toArrayLike(Buffer, "le", 4); // maxLimiterDuration
  const buffer2 = maxFeeBps.toArrayLike(Buffer, "le", 4); // maxFeeBps
  const buffer = Buffer.concat([buffer1, buffer2]);
  return Array.from(buffer);
}

export function parseRateLimiterSecondFactor(secondFactor: number[]): {
  maxLimiterDuration: number;
  maxFeeBps: number;
} {
  const buffer = Buffer.from(secondFactor);
  return {
    maxLimiterDuration: buffer.readUInt32LE(0),
    maxFeeBps: buffer.readUInt32LE(4),
  };
}
