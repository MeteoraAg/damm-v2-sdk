import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  AccountLayout,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";
import {
  Connection,
  GetProgramAccountsFilter,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";

/**
 * Gets the token program
 * @param flag - The flag
 * @returns The token program
 */
export function getTokenProgram(flag: number): PublicKey {
  return flag == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
}

/**
 * Gets the token decimals
 * @param connection - The connection
 * @param mint - The mint
 * @returns The token decimals
 */
export const getTokenDecimals = async (
  connection: Connection,
  mint: PublicKey
): Promise<number> => {
  return (await getMint(connection, mint)).decimals;
};

/**
 * Gets the or creates the ATA instruction
 * @param connection - The connection
 * @param tokenMint - The token mint
 * @param owner - The owner
 * @param payer - The payer
 * @param allowOwnerOffCurve - The allow owner off curve
 * @param tokenProgram - The token program
 * @returns The ATA instruction
 */
export const getOrCreateATAInstruction = async (
  connection: Connection,
  tokenMint: PublicKey,
  owner: PublicKey,
  payer: PublicKey = owner,
  allowOwnerOffCurve = true,
  tokenProgram: PublicKey
): Promise<{ ataPubkey: PublicKey; ix?: TransactionInstruction }> => {
  const toAccount = getAssociatedTokenAddressSync(
    tokenMint,
    owner,
    allowOwnerOffCurve,
    tokenProgram
  );

  try {
    await getAccount(connection, toAccount);
    return { ataPubkey: toAccount, ix: undefined };
  } catch (e) {
    if (
      e instanceof TokenAccountNotFoundError ||
      e instanceof TokenInvalidAccountOwnerError
    ) {
      const ix = createAssociatedTokenAccountIdempotentInstruction(
        payer,
        toAccount,
        owner,
        tokenMint,
        tokenProgram
      );

      return { ataPubkey: toAccount, ix };
    } else {
      /* handle error */
      console.error("Error::getOrCreateATAInstruction", e);
      throw e;
    }
  }
};

/**
 * Gets the wrap SOL instruction
 * @param from - The from
 * @param to - The to
 * @param amount - The amount
 * @returns The wrap SOL instruction
 */
export const wrapSOLInstruction = (
  from: PublicKey,
  to: PublicKey,
  amount: bigint
): TransactionInstruction[] => {
  return [
    SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: amount,
    }),
    new TransactionInstruction({
      keys: [
        {
          pubkey: to,
          isSigner: false,
          isWritable: true,
        },
      ],
      data: Buffer.from(new Uint8Array([17])),
      programId: TOKEN_PROGRAM_ID,
    }),
  ];
};

/**
 * Gets the unwrap SOL instruction
 * @param owner - The owner
 * @param receiver - The receiver
 * @param allowOwnerOffCurve - The allow owner off curve
 * @returns The unwrap SOL instruction
 */
export const unwrapSOLInstruction = async (
  owner: PublicKey,
  receiver: PublicKey = owner,
  allowOwnerOffCurve = true
) => {
  const wSolATAAccount = getAssociatedTokenAddressSync(
    NATIVE_MINT,
    owner,
    allowOwnerOffCurve
  );
  if (wSolATAAccount) {
    const closedWrappedSolInstruction = createCloseAccountInstruction(
      wSolATAAccount,
      receiver,
      owner,
      [],
      TOKEN_PROGRAM_ID
    );
    return closedWrappedSolInstruction;
  }
  return null;
};

/**
 * Gets all the user position NFT accounts
 * @param connection - The connection
 * @param user - The user
 * @returns The user position NFT accounts
 */
export async function getAllUserPositionNftAccount(
  connection: Connection,
  user: PublicKey
): Promise<
  Array<{
    positionNft: PublicKey;
    positionNftAccount: PublicKey;
  }>
> {
  const filters: GetProgramAccountsFilter[] = [
    {
      memcmp: {
        offset: 32,
        bytes: user.toBase58(),
      },
    },
    {
      memcmp: {
        offset: 64,
        bytes: bs58.encode(Buffer.from([1, 0, 0, 0, 0, 0, 0, 0])), // 1
      },
    },
  ];

  const tokenAccountsRaw = await connection.getProgramAccounts(
    TOKEN_2022_PROGRAM_ID,
    {
      filters,
    }
  );

  const userPositionNftAccount: Array<{
    positionNft: PublicKey;
    positionNftAccount: PublicKey;
  }> = [];
  for (const { account, pubkey } of tokenAccountsRaw) {
    const tokenAccountData = AccountLayout.decode(account.data);
    userPositionNftAccount.push({
      positionNft: tokenAccountData.mint,
      positionNftAccount: pubkey,
    });
  }

  return userPositionNftAccount;
}

/**
 * Gets all the position NFT accounts by owner
 * @param connection - The connection
 * @param user - The user
 * @returns The position NFT accounts by owner
 */
export async function getAllPositionNftAccountByOwner(
  connection: Connection,
  user: PublicKey
): Promise<
  Array<{
    positionNft: PublicKey;
    positionNftAccount: PublicKey;
  }>
> {
  const tokenAccounts = await connection.getTokenAccountsByOwner(user, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  const userPositionNftAccount: Array<{
    positionNft: PublicKey;
    positionNftAccount: PublicKey;
  }> = [];
  for (const { account, pubkey } of tokenAccounts.value) {
    const tokenAccountData = AccountLayout.decode(account.data);
    if (tokenAccountData.amount.toString() === "1") {
      userPositionNftAccount.push({
        positionNft: tokenAccountData.mint,
        positionNftAccount: pubkey,
      });
    }
  }

  return userPositionNftAccount;
}
