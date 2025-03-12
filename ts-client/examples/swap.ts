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
    Uint8Array.from(
      require("../../localnet/admin-bossj3JvwiNK7pvjr149DqdtJxf2gdygbcmEPTkb2F1.json")
    )
  );

  const programId = new PublicKey(
    "LGtRTwBRwmJ1wD9QeJNdAZjLR94uyefRXna1W6dfQj7"
  );
  const pool = new PublicKey("4FV22NV8p2csvRaut7Z3RWQxUmKfxPNKHxT8cE8fCexc");
  const connection = new Connection(clusterApiUrl("devnet"));
  const cpAmm = new CpAmm(connection, programId);
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

  console.log({
    swapInAmount: quotes.swapInAmount.toString(),
    swapOutAmount: quotes.swapOutAmount.toString(),
    minSwapOutAmount: quotes.minSwapOutAmount.toString(),
    priceImpact: quotes.priceImpact,
    lpFee: quotes.totalFee.toString(),
  });

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
