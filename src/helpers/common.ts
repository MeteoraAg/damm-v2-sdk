import { Connection } from "@solana/web3.js";
import { ActivationType } from "../types";
import BN from "bn.js";

/**
 * Gets the current point
 * @param connection - The connection to the Solana cluster
 * @param activationType - The activation type
 * @returns The current point
 */
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

/**
 * Converts the value to a fee scheduler second factor
 * @param value - The value to convert
 * @returns The fee scheduler second factor
 */
export function convertToFeeSchedulerSecondFactor(value: BN): number[] {
  return Array.from(value.toArrayLike(Buffer, "le", 8));
}

/**
 * Parses the fee scheduler second factor
 * @param secondFactor - The fee scheduler second factor
 * @returns The fee scheduler second factor
 */
export function parseFeeSchedulerSecondFactor(secondFactor: number[]): BN {
  return new BN(Buffer.from(secondFactor), "le");
}

/**
 * Converts the value to a rate limiter second factor
 * @param maxLimiterDuration - The max limiter duration
 * @param maxFeeBps - The max fee in basis points
 * @returns The rate limiter second factor
 */
export function convertToRateLimiterSecondFactor(
  maxLimiterDuration: BN,
  maxFeeBps: BN
): number[] {
  const buffer1 = maxLimiterDuration.toArrayLike(Buffer, "le", 4); // maxLimiterDuration
  const buffer2 = maxFeeBps.toArrayLike(Buffer, "le", 4); // maxFeeBps
  const buffer = Buffer.concat([buffer1, buffer2]);
  return Array.from(buffer);
}

/**
 * Parses the rate limiter second factor
 * @param secondFactor - The rate limiter second factor
 * @returns The rate limiter second factor
 */
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
