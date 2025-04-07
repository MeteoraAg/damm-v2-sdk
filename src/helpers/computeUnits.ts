import {
  AddressLookupTableAccount,
  Commitment,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { MAX_CU_BUFFER, MIN_CU_BUFFER } from "../constants";

export const getSimulationComputeUnits = async (
  connection: Connection,
  instructions: Array<TransactionInstruction>,
  payer: PublicKey,
  lookupTables: Array<AddressLookupTableAccount> | [],
  commitment: Commitment = "confirmed"
): Promise<number | null> => {
  const testInstructions = [
    // Set an arbitrarily high number in simulation
    // so we can be sure the transaction will succeed
    // and get the real compute units used
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ...instructions,
  ];

  const testTransaction = new VersionedTransaction(
    new TransactionMessage({
      instructions: testInstructions,
      payerKey: payer,
      // RecentBlockhash can by any public key during simulation
      // since 'replaceRecentBlockhash' is set to 'true' below
      recentBlockhash: PublicKey.default.toString(),
    }).compileToV0Message(lookupTables)
  );

  const rpcResponse = await connection.simulateTransaction(testTransaction, {
    replaceRecentBlockhash: true,
    sigVerify: false,
    commitment,
  });

  if (rpcResponse?.value?.err) {
    const logs = rpcResponse.value.logs?.join("\n  • ") || "No logs available";
    throw new Error(
      `Transaction simulation failed:\n  •${logs}` +
        JSON.stringify(rpcResponse?.value?.err)
    );
  }

  return rpcResponse.value.unitsConsumed || null;
};

/**
 * Gets the estimated compute unit usage with a buffer.
 * @param connection A Solana connection object.
 * @param instructions The instructions of the transaction to simulate.
 * @param feePayer The public key of the fee payer.
 * @param buffer The buffer to add to the estimated compute unit usage. Max value is 1. Default value is 0.1 if not provided, and will be capped between 50k - 200k.
 * @returns The estimated compute unit usage with the buffer.
 */
export const getEstimatedComputeUnitUsageWithBuffer = async (
  connection: Connection,
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  buffer?: number
) => {
  if (!buffer) {
    buffer = 0.1;
  }
  // Avoid negative value
  buffer = Math.max(0, buffer);
  // Limit buffer to 1
  buffer = Math.min(1, buffer);

  const estimatedComputeUnitUsage = await getSimulationComputeUnits(
    connection,
    instructions,
    feePayer,
    []
  );

  if (!estimatedComputeUnitUsage) {
    return 0;
  }

  let extraComputeUnitBuffer = estimatedComputeUnitUsage * buffer;
  if (extraComputeUnitBuffer > MAX_CU_BUFFER) {
    extraComputeUnitBuffer = MAX_CU_BUFFER;
  } else if (extraComputeUnitBuffer < MIN_CU_BUFFER) {
    extraComputeUnitBuffer = MIN_CU_BUFFER;
  }

  return estimatedComputeUnitUsage + extraComputeUnitBuffer;
};

/**
 * Gets the estimated compute unit usage with a buffer and converts it to a SetComputeUnitLimit instruction.
 * If the estimated compute unit usage cannot be retrieved, returns a SetComputeUnitLimit instruction with the fallback unit.
 * @param connection A Solana connection object.
 * @param instructions The instructions of the transaction to simulate.
 * @param feePayer The public key of the fee payer.
 * @param buffer The buffer to add to the estimated compute unit usage. Max value is 1. Default value is 0.1 if not provided, and will be capped between 50k - 200k.
 * @returns A SetComputeUnitLimit instruction with the estimated compute unit usage.
 */
export const getEstimatedComputeUnitIxWithBuffer = async (
  connection: Connection,
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  buffer?: number
) => {
  const units = await getEstimatedComputeUnitUsageWithBuffer(
    connection,
    instructions,
    feePayer,
    buffer
  ).catch((error) => {
    console.error("Error::getEstimatedComputeUnitUsageWithBuffer", error);
    return 1_400_000;
  });

  return ComputeBudgetProgram.setComputeUnitLimit({ units });
};
