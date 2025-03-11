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
    maxAmountX: new BN(100_000 * 10 ** 6),
    maxAmountY: new BN(100_000 * 10 ** 9),
    tokenX,
    tokenY,
    pool,
  });

  console.log(liquidityDelta.toString());
  const transaction = await cpAmm.addLiquidity({
    owner: wallet.publicKey,
    position,
    liquidityDeltaQ64: liquidityDelta,
    tokenAAmountThreshold: new BN(100000000735553),
    tokenBAmountThreshold: new BN(100000000735553),
  });
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    wallet,
  ]);
  console.log(signature);
})();
