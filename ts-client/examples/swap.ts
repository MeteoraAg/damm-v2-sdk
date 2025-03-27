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
  const pool = new PublicKey("8soa1QkfAXNVhB65t9tcDiHNGfw9yQo6QBXYmxGBCUnn");
  const connection = new Connection(clusterApiUrl("devnet"));
  const cpAmm = new CpAmm(connection);
  const poolState = await cpAmm.fetchPoolState(pool);
  const {
    tokenAMint,
    tokenBMint,
    tokenAVault,
    tokenBVault,
    tokenAFlag,
    tokenBFlag,
  } = poolState;

  const slippage = 5; // 5%
  const quotes = await cpAmm.getQuote({
    inAmount: new BN(1000 * 10 ** 6),
    inputTokenMint: tokenAMint,
    slippage,
    poolState,
  });

  console.log("quote: ", quotes);

  const transaction = await cpAmm.swap({
    payer: wallet.publicKey,
    pool,
    inputTokenMint: tokenAMint,
    outputTokenMint: tokenBMint,
    amountIn: new BN(1000 * 10 ** 6),
    minimumAmountOut: new BN(10),
    tokenAMint,
    tokenBMint,
    tokenAVault,
    tokenBVault,
    tokenAProgram: getTokenProgram(tokenAFlag),
    tokenBProgram: getTokenProgram(tokenBFlag),
    referralTokenAccount: null,
  });
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    wallet,
  ]);
  console.log(signature);
})();
