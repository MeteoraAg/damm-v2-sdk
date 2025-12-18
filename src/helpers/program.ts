import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Commitment, Connection } from "@solana/web3.js";
import { CpAmm } from "../idl/cp_amm";
import CpAmmIDL from "../idl/cp_amm.json";

/**
 * Create a DAMM V2 program instance
 * @param connection - The connection to the network
 * @param commitment - The commitment level
 * @returns The DAMM V2 program instance
 */
export function createDammV2Program(
  connection: Connection,
  commitment: Commitment = "confirmed"
): Program<CpAmm> {
  const provider = new AnchorProvider(connection, null as unknown as Wallet, {
    commitment,
  });

  const program = new Program<CpAmm>(CpAmmIDL, provider);
  return program;
}
