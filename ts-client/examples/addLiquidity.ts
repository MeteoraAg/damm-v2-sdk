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
  const pool = new PublicKey("9KQiTEY9Y83389L5pzRrTXBR5AGs7CrPdSbJxXurCeKD");
  const position = new PublicKey(
    "AaAFrPQhvaNbCPg8Wz1fkpyK6CKrC68fhCjGfEkaWHJL"
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
    positionNftMint: positionState.nftMint,
    liquidityDeltaQ64: liquidityDelta,
    maxAmountTokenA,
    maxAmountTokenB,
    tokenAAmountThreshold: new BN(100000000735553),
    tokenBAmountThreshold: new BN(100000000735553),
    tokenAMint,
    tokenBMint,
    tokenAProgram: getTokenProgram(tokenAFlag),
    tokenBProgram: getTokenProgram(tokenBFlag),
  });

  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;
  const s = await connection.simulateTransaction(transaction);
  console.log(s);
  console.log(s.value.err);
  // const signature = await sendAndConfirmTransaction(connection, transaction, [
  //   wallet,
  // ]);
  // console.log(signature);
})();
