import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { CpAmm, getTokenProgram, CP_AMM_PROGRAM_ID } from "../src";
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
  const maxAmountTokenA = new BN(1000 * 10 ** 6);
  const maxAmountTokenB = new BN(0.1 * 10 ** 9);
  const liquidityDelta = await cpAmm.getLiquidityDelta({
    maxAmountTokenA,
    maxAmountTokenB,
    tokenAMint,
    tokenBMint,
    sqrtMaxPrice,
    sqrtMinPrice,
    sqrtPrice,
  });

  console.log("liquidityDelta: ", liquidityDelta.toString());
  console.log("sqrtPrice: ", sqrtPrice.toString());

  const transaction = await cpAmm.addLiquidity({
    owner: wallet.publicKey,
    position,
    pool,
    positionNftMint: positionState.nftMint,
    liquidityDeltaQ64: liquidityDelta,
    maxAmountTokenA,
    maxAmountTokenB,
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
