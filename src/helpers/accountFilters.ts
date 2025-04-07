import { GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";

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
