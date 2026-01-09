import { GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";

/**
 * Filters for the position by pool
 * @param pool - The pool address
 * @returns The filter for the position by pool
 */
export const positionByPoolFilter = (
  pool: PublicKey,
): GetProgramAccountsFilter => {
  return {
    memcmp: {
      bytes: pool.toBase58(),
      offset: 8,
    },
  };
};

/**
 * Filters for the vesting by position
 * @param position - The position address
 * @returns The filter for the vesting by position
 */
export const vestingByPositionFilter = (
  position: PublicKey,
): GetProgramAccountsFilter => {
  return {
    memcmp: {
      bytes: position.toBase58(),
      offset: 8,
    },
  };
};

/**
 * Create a memcmp filter for offset-based filtering
 * @param value - The value to filter by
 * @param offset - The offset where the value field is located in the account data
 * @returns A GetProgramAccountsFilter array with the value filter
 */
export function offsetBasedFilter(
  value: PublicKey | string,
  offset: number,
): GetProgramAccountsFilter[] {
  const valueKey = typeof value === "string" ? new PublicKey(value) : value;
  return [
    {
      memcmp: {
        offset,
        bytes: valueKey.toBase58(),
        encoding: "base58",
      },
    },
  ];
}
