import { BN } from "@coral-xyz/anchor";
import {
  calculateFee,
  getEpochFee,
  getTransferFeeConfig,
  MAX_FEE_BASIS_POINTS,
  Mint,
  TransferFee,
  TOKEN_2022_PROGRAM_ID,
  unpackMint,
} from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";

interface TransferFeeIncludedAmount {
  amount: BN;
  transferFee: BN;
}

/**
 * Calculates the pre fee amount
 * @param transferFee - The transfer fee
 * @param postFeeAmount - The post fee amount
 * @returns The pre fee amount
 */
function calculatePreFeeAmount(transferFee: TransferFee, postFeeAmount: BN) {
  if (postFeeAmount.isZero()) {
    return new BN(0);
  }

  if (transferFee.transferFeeBasisPoints === 0) {
    return postFeeAmount;
  }

  const maximumFee = new BN(transferFee.maximumFee.toString());

  if (transferFee.transferFeeBasisPoints === MAX_FEE_BASIS_POINTS) {
    return postFeeAmount.add(maximumFee);
  }

  const ONE_IN_BASIS_POINTS = new BN(MAX_FEE_BASIS_POINTS);
  const numerator = postFeeAmount.mul(ONE_IN_BASIS_POINTS);
  const denominator = ONE_IN_BASIS_POINTS.sub(
    new BN(transferFee.transferFeeBasisPoints)
  );

  const rawPreFeeAmount = numerator
    .add(denominator)
    .sub(new BN(1))
    .div(denominator);

  if (rawPreFeeAmount.sub(postFeeAmount).gte(maximumFee)) {
    return postFeeAmount.add(maximumFee);
  }

  return rawPreFeeAmount;
}

/**
 * Calculates the inverse fee
 * @param transferFee - The transfer fee
 * @param postFeeAmount - The post fee amount
 * @returns The inverse fee
 */
function calculateInverseFee(transferFee: TransferFee, postFeeAmount: BN) {
  const preFeeAmount = calculatePreFeeAmount(transferFee, postFeeAmount);
  return new BN(
    calculateFee(transferFee, BigInt(preFeeAmount.toString())).toString()
  );
}

/**
 * Calculates the transfer fee included amount
 * @param transferFeeExcludedAmount - The transfer fee excluded amount
 * @param mint - The mint
 * @param currentEpoch - The current epoch
 * @returns The transfer fee included amount
 */
export function calculateTransferFeeIncludedAmount(
  transferFeeExcludedAmount: BN,
  mint: Mint,
  currentEpoch: number
): TransferFeeIncludedAmount {
  if (transferFeeExcludedAmount.isZero()) {
    return {
      amount: new BN(0),
      transferFee: new BN(0),
    };
  }

  const transferFeeConfig = getTransferFeeConfig(mint);

  if (transferFeeConfig === null) {
    return {
      amount: transferFeeExcludedAmount,
      transferFee: new BN(0),
    };
  }

  const epochFee = getEpochFee(transferFeeConfig, BigInt(currentEpoch));

  const transferFee =
    epochFee.transferFeeBasisPoints == MAX_FEE_BASIS_POINTS
      ? new BN(epochFee.maximumFee.toString())
      : calculateInverseFee(epochFee, transferFeeExcludedAmount);

  const transferFeeIncludedAmount = transferFeeExcludedAmount.add(transferFee);

  return {
    amount: transferFeeIncludedAmount,
    transferFee,
  };
}

interface TransferFeeExcludedAmount {
  amount: BN;
  transferFee: BN;
}

/**
 * Calculates the transfer fee excluded amount
 * @param transferFeeIncludedAmount - The transfer fee included amount
 * @param mint - The mint
 * @param currentEpoch - The current epoch
 * @returns The transfer fee excluded amount
 */
export function calculateTransferFeeExcludedAmount(
  transferFeeIncludedAmount: BN,
  mint: Mint,
  currentEpoch: number
): TransferFeeExcludedAmount {
  const transferFeeConfig = getTransferFeeConfig(mint);
  if (transferFeeConfig === null) {
    return {
      amount: transferFeeIncludedAmount,
      transferFee: new BN(0),
    };
  }

  const transferFeeIncludedAmountN = BigInt(
    transferFeeIncludedAmount.toString()
  );

  const transferFee = calculateFee(
    getEpochFee(transferFeeConfig, BigInt(currentEpoch)),
    transferFeeIncludedAmountN
  );

  const transferFeeExcludedAmount = new BN(
    (transferFeeIncludedAmountN - transferFee).toString()
  );

  return {
    amount: transferFeeExcludedAmount,
    transferFee: new BN(transferFee.toString()),
  };
}

/**
 * Interface for transfer hook extension state
 */
export interface TransferHookState {
  authority: string;
  programId: string;
}

/**
 * Checks if a Token 2022 mint has a transfer hook extension
 * Transfer hooks prevent permissionless pool creation as they require
 * the hook program to approve transfers, which pool creation cannot satisfy.
 * 
 * @param connection - The connection to the Solana cluster
 * @param mint - The mint address to check
 * @returns Object containing whether transfer hook exists and its state if found
 */
export async function hasTransferHookExtension(
  connection: Connection,
  mint: PublicKey
): Promise<{
  hasTransferHook: boolean;
  transferHookState?: TransferHookState;
}> {
  try {
    // First check if it's a Token 2022 mint
    const mintAccountInfo = await connection.getAccountInfo(mint);
    if (!mintAccountInfo) {
      return { hasTransferHook: false };
    }

    const isToken2022 = mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);
    if (!isToken2022) {
      return { hasTransferHook: false };
    }

    // Try to get parsed account info which includes extensions
    const parsedInfo = await connection.getParsedAccountInfo(mint);
    if (parsedInfo.value && 'parsed' in parsedInfo.value.data) {
      const parsedData = parsedInfo.value.data.parsed;
      if (parsedData && parsedData.info && parsedData.info.extensions) {
        const extensions = parsedData.info.extensions;
        
        // Check if transferHook extension exists
        const transferHookExtension = extensions.find(
          (ext: any) => ext.extension === 'transferHook'
        );
        
        if (transferHookExtension && transferHookExtension.state) {
          return {
            hasTransferHook: true,
            transferHookState: {
              authority: transferHookExtension.state.authority,
              programId: transferHookExtension.state.programId,
            },
          };
        }
      }
    }

    return { hasTransferHook: false };
  } catch (error) {
    // If we can't determine, assume no transfer hook to avoid false positives
    // The actual pool creation will fail with error 3007 if transfer hook exists
    return { hasTransferHook: false };
  }
}

/**
 * Validates that tokens don't have transfer hook extensions before pool creation
 * Throws an error if either token has a transfer hook extension
 * 
 * @param connection - The connection to the Solana cluster
 * @param tokenAMint - The first token mint address
 * @param tokenBMint - The second token mint address
 * @throws Error if either token has a transfer hook extension
 */
export async function validateNoTransferHook(
  connection: Connection,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey 
): Promise<void> {
  const [tokenACheck, tokenBCheck] = await Promise.all([
    hasTransferHookExtension(connection, tokenAMint),
    hasTransferHookExtension(connection, tokenBMint),
  ]);

  if (tokenACheck.hasTransferHook) {
    throw new Error(
      `Token A (${tokenAMint.toBase58()}) has a transfer hook extension. ` +
      `Transfer hook might prevent permissionless pool creation. ` +
      `Transfer hook program: ${tokenACheck.transferHookState?.programId}`
    );
  }

  if (tokenBCheck.hasTransferHook) {
    throw new Error(
      `Token B (${tokenBMint.toBase58()}) has a transfer hook extension. ` +
      `Transfer hook might prevent permissionless pool creation. ` +
      `Transfer hook program: ${tokenBCheck.transferHookState?.programId}`
    );
  }
}
