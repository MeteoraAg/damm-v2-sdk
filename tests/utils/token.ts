import {
  AccountLayout,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  MintLayout,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { DECIMALS } from "./constants";

export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey,
  tokenProgram = TOKEN_PROGRAM_ID,
) {
  const ataKey = getAssociatedTokenAddressSync(mint, owner, true, tokenProgram);

  const account = await connection.getAccountInfo(ataKey);
  if (account === null) {
    const createAtaIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ataKey,
      owner,
      mint,
      tokenProgram,
    );
    const transaction = new Transaction().add(createAtaIx);
    await sendAndConfirmTransaction(connection, transaction, [payer]);
  }

  return ataKey;
}

export async function createToken(
  connection: Connection,
  payer: Keypair,
  mintKeypair: Keypair,
) {
  const mintLamports =
    await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: mintLamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(
      mintKeypair.publicKey,
      DECIMALS,
      payer.publicKey,
      null,
    ),
  );

  await sendAndConfirmTransaction(connection, transaction, [
    payer,
    mintKeypair,
  ]);
  return mintKeypair.publicKey;
}

export async function mintTo(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  authority: Keypair,
  destination: PublicKey,
  amount: BN,
) {
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    destination,
  );
  const transaction = new Transaction().add(
    createMintToInstruction(
      mint,
      ata,
      authority.publicKey,
      BigInt(amount.toString()),
    ),
  );
  await sendAndConfirmTransaction(connection, transaction, [payer, authority]);
}

export async function createNativeAccount(
  connection: Connection,
  payer: Keypair,
  owner: PublicKey,
  amount: BN,
) {
  const nativeAccount = getAssociatedTokenAddressSync(NATIVE_MINT, owner, true);
  const lamports = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: nativeAccount,
      space: AccountLayout.span,
      lamports: lamports + amount.toNumber(),
      programId: TOKEN_PROGRAM_ID,
    }),
    createSyncNativeInstruction(nativeAccount),
  );
  await sendAndConfirmTransaction(connection, transaction, [payer]);
  return nativeAccount;
}
