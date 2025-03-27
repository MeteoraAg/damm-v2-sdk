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
  const position = new PublicKey(
    "Dt3hRn71LT6e3o1cMZizfwAeFdYpkFHyuUZj4VwDAT4v"
  );
  const connection = new Connection(clusterApiUrl("devnet"));
  const cpAmm = new CpAmm(connection);

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

  const transaction = await cpAmm.removeLiquidity({
    owner: wallet.publicKey,
    position,
    pool,
    positionNftMint: positionState.nftMint,
    liquidityDeltaQ64: positionState.unlockedLiquidity,
    maxAmountTokenA: new BN(100_000 * 10 ** 6),
    maxAmountTokenB: new BN(100_000 * 10 ** 9),
    tokenAAmountThreshold: new BN(0),
    tokenBAmountThreshold: new BN(0),
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
