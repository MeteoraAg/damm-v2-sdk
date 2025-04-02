import { GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";

export const positionByOwnerFilter = (
  owner: PublicKey
): GetProgramAccountsFilter => {
  return {
    memcmp: {
      bytes: owner.toBase58(),
      offset: 8 + 32,
    },
  };
};

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

export const poolFilter = (): GetProgramAccountsFilter => {
  return {
    memcmp: {
      bytes: "0",
      offset: 8 + 32,
    },
  };
};
