import { GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";

/**
 * Filters for the position by pool
 * @param pool - The pool address
 * @returns The filter for the position by pool
 */
export const positionByPoolFilter = (
  pool: PublicKey
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
  position: PublicKey
): GetProgramAccountsFilter => {
  return {
    memcmp: {
      bytes: position.toBase58(),
      offset: 8,
    },
  };
};
