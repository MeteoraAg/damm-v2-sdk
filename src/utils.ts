import { getMint } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

export async function getTokenDecimals(
  connection: Connection,
  mint: PublicKey
): Promise<number> {
  return (await getMint(connection, mint)).decimals;
}
