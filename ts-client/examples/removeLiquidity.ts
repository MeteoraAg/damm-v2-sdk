import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { CpAmm } from "../src";
(async () => {
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(require("/Users/minhdo/.config/solana/id.json"))
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

  const liquidityDelta = await cpAmm.getLiquidityDelta({
    maxAmountX: new BN(1000 * 10 ** 6),
    maxAmountY: new BN(1000 * 10 ** 9),
    tokenX,
    tokenY,
    pool,
  });

  console.log(liquidityDelta.toString());
  const transaction = await cpAmm.removeLiquidity({
    owner: wallet.publicKey,
    position,
    liquidityDeltaQ64: liquidityDelta,
    tokenAAmountThreshold: new BN(0),
    tokenBAmountThreshold: new BN(0),
  });
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    wallet,
  ]);
  console.log(signature);
})();
