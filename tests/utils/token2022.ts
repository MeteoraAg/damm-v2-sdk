import {
  createInitializeMint2Instruction,
  createInitializeTransferFeeConfigInstruction,
  ExtensionType,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  createMintToInstruction,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { DECIMALS } from "./constants";
import { getOrCreateAssociatedTokenAccount } from "./token";

export async function createToken2022(
  connection: Connection,
  payer: Keypair,
  mintKeypair: Keypair,
  extensions: ExtensionType[],
) {
  const maxFee = BigInt(9 * Math.pow(10, DECIMALS));
  const feeBasisPoints = 100;
  const transferFeeConfigAuthority = Keypair.generate();
  const withdrawWithheldAuthority = Keypair.generate();

  const mintLen = getMintLen(extensions);
  const mintLamports =
    await connection.getMinimumBalanceForRentExemption(mintLen);

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeTransferFeeConfigInstruction(
      mintKeypair.publicKey,
      transferFeeConfigAuthority.publicKey,
      withdrawWithheldAuthority.publicKey,
      feeBasisPoints,
      maxFee,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeMint2Instruction(
      mintKeypair.publicKey,
      DECIMALS,
      payer.publicKey,
      null,
      TOKEN_2022_PROGRAM_ID,
    ),
  );

  await sendAndConfirmTransaction(connection, transaction, [
    payer,
    mintKeypair,
  ]);
}

export async function mintToToken2022(
  connection: Connection,
  payer: Keypair,
  mintAuthority: Keypair,
  mint: PublicKey,
  toWallet: PublicKey,
  amount: bigint,
) {
  const destination = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    toWallet,
    TOKEN_2022_PROGRAM_ID,
  );
  const mintIx = createMintToInstruction(
    mint,
    destination,
    mintAuthority.publicKey,
    amount,
    [],
    TOKEN_2022_PROGRAM_ID,
  );

  const transaction = new Transaction().add(mintIx);
  await sendAndConfirmTransaction(connection, transaction, [
    payer,
    mintAuthority,
  ]);
}
