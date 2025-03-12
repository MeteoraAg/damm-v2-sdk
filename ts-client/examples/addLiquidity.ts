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
  const position = new PublicKey(
    "FDQS2RqhQkxvgLGRsYy3YuiBKwxkRzZskM8U9v6GcZoa"
  );
  const connection = new Connection(clusterApiUrl("devnet"));
  const cpAmm = new CpAmm(connection, programId);
  const positionState = await cpAmm.fetchPositionState(position);
  const poolState = await cpAmm.fetchPoolState(pool);
  const {
    sqrtPrice,
    sqrtMaxPrice,
    sqrtMinPrice,
    tokenAMint,
    tokenBMint,
    tokenAVault,
    tokenBVault,
    tokenAFlag,
    tokenBFlag,
  } = poolState;

  const liquidityDelta = await cpAmm.getLiquidityDelta({
    maxAmountTokenA: new BN(100_000 * 10 ** 6),
    maxAmountTokenB: new BN(100_000 * 10 ** 9),
    tokenAMint,
    tokenBMint,
    sqrtMaxPrice,
    sqrtMinPrice,
    sqrtPrice,
  });

  const transaction = await cpAmm.addLiquidity({
    owner: wallet.publicKey,
    position,
    pool,
    positionNftMint: positionState.nftMint,
    liquidityDeltaQ64: liquidityDelta,
    tokenAAmountThreshold: new BN(100000000735553),
    tokenBAmountThreshold: new BN(100000000735553),
    tokenAMint,
    tokenBMint,
    tokenAVault,
    tokenBVault,
    tokenAProgram: getTokenProgram(tokenAFlag),
    tokenBProgram: getTokenProgram(tokenBFlag),
  });
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    wallet,
  ]);
  console.log(signature);
})();
