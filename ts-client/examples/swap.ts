import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { CpAmm, getTokenProgram } from "../src";
(async () => {
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(require("/Users/minhdo/.config/solana/id.json"))
  );
  const pool = new PublicKey("BCDEQYNFwom957PXchRdMsoavGNwoGKdUDMUwo6jLzER");
  const connection = new Connection(clusterApiUrl("devnet"));
  const cpAmm = new CpAmm(connection);
  const poolState = await cpAmm.fetchPoolState(pool);
  const { tokenAMint, tokenBMint, tokenAFlag, tokenBFlag } = poolState;

  const slippage = 5; // 5%
  const { swapInAmount, swapOutAmount } = await cpAmm.getQuote({
    inAmount: new BN(0.001 * 10 ** 9),
    inputTokenMint: tokenAMint,
    slippage,
    poolState,
  });

  console.log("quote: ", {
    swapInAmount: swapInAmount.toString(),
    swapOutAmount: swapOutAmount.toString(),
  });

  const transaction = await cpAmm.swap({
    payer: wallet.publicKey,
    pool,
    inputTokenMint: tokenAMint,
    outputTokenMint: tokenBMint,
    amountIn: new BN(0.001 * 10 ** 9),
    minimumAmountOut: new BN(10),
    tokenAMint,
    tokenBMint,
    tokenAProgram: getTokenProgram(tokenAFlag),
    tokenBProgram: getTokenProgram(tokenBFlag),
    referralTokenAccount: null,
  });

  const signature = await sendAndConfirmTransaction(connection, transaction, [
    wallet,
  ]);
  console.log(signature);
})();
