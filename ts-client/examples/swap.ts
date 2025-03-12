import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  BaseFee,
  CpAmm,
  InitializeCustomizeablePoolParams,
  LiquidityDeltaParams,
  PoolFeesParams,
} from "../src";
(async () => {
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(
      require("../../localnet/admin-bossj3JvwiNK7pvjr149DqdtJxf2gdygbcmEPTkb2F1.json")
    )
  );

  const tokenX = new PublicKey("AxVHFc6ighQCmm2xDhQx2FAWkM9xZxDw212mcP5mY2d4");
  const tokenY = new PublicKey("4eQ3PiW2n3bhKEopYDBe2pVxd66MjwowXzbFWYq95pZv");
  const programId = new PublicKey(
    "LGtRTwBRwmJ1wD9QeJNdAZjLR94uyefRXna1W6dfQj7"
  );
  const pool = new PublicKey("4FV22NV8p2csvRaut7Z3RWQxUmKfxPNKHxT8cE8fCexc");
  const position = new PublicKey(
    "FDQS2RqhQkxvgLGRsYy3YuiBKwxkRzZskM8U9v6GcZoa"
  );
  const connection = new Connection(clusterApiUrl("devnet"));
  const cpAmm = new CpAmm(connection, programId);
  const slippage = 5; // 5%
  const quotes = await cpAmm.getQuote({
    pool,
    inAmount: new BN(1000 * 10 ** 6),
    inputTokenMint: tokenX,
    slippage,
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
    inputTokenMint: tokenX,
    outputTokenMint: tokenY,
    amountIn: new BN(1000 * 10 ** 6),
    minimumAmountOut: new BN(10),
    referralTokenAccount: null,
  });
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    wallet,
  ]);
  console.log(signature);
})();
