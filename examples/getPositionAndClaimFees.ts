import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { CpAmm, getTokenProgram } from "../src";

(async () => {
  const CONFIG = {
    keypairPath: "~/.config/solana/id.json",
    rpcUrl: clusterApiUrl("mainnet-beta"),
    poolAddress: new PublicKey("E1SHKcwAcjQjaWyCpCJHK24XWvGKdooCrhKhyG6uUzJ9"),
    userAddress: new PublicKey("4JTYKJAyS7eAXQRSxvMbmqgf6ajf3LR9JrAXpVEcww2q"),
  };

  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(Uint8Array.from(require(CONFIG.keypairPath))),
  );

  const connection = new Connection(CONFIG.rpcUrl);
  const cpAmm = new CpAmm(connection);

  const userPositions = await cpAmm.getUserPositionByPool(
    CONFIG.poolAddress,
    CONFIG.userAddress,
  );
  // get position with largest liquidity
  const position = userPositions[0];
  const poolState = await cpAmm.fetchPoolState(CONFIG.poolAddress);

  const claimPositionFeesTx = await cpAmm.claimPositionFee({
    receiver: wallet.publicKey,
    owner: wallet.publicKey,
    pool: CONFIG.poolAddress,
    position: position.position,
    positionNftAccount: position.positionNftAccount,
    tokenAVault: poolState.tokenAVault,
    tokenBVault: poolState.tokenBVault,
    tokenAMint: poolState.tokenAMint,
    tokenBMint: poolState.tokenBMint,
    tokenAProgram: getTokenProgram(poolState.tokenAFlag),
    tokenBProgram: getTokenProgram(poolState.tokenBFlag),
  });

  claimPositionFeesTx.feePayer = wallet.publicKey;

  claimPositionFeesTx.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;

  console.log(await connection.simulateTransaction(claimPositionFeesTx));

  const signature = await sendAndConfirmTransaction(
    connection,
    claimPositionFeesTx,
    [wallet],
    {
      commitment: "confirmed",
    },
  );

  console.log("Claimed position fees: ", {
    position: position.position.toString(),
    signature,
  });
})();
