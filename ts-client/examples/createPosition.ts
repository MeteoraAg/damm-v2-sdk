import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { CpAmm, CreatePositionParams } from "../src";
(async () => {
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(
      require("../../localnet/admin-bossj3JvwiNK7pvjr149DqdtJxf2gdygbcmEPTkb2F1.json")
    )
  );

  const pool = new PublicKey("4FV22NV8p2csvRaut7Z3RWQxUmKfxPNKHxT8cE8fCexc");
  const connection = new Connection(clusterApiUrl("devnet"));
  const cpAmm = new CpAmm(connection);
  const positionNft = Keypair.generate();
  const createPositionParams: CreatePositionParams = {
    owner: wallet.publicKey,
    payer: wallet.publicKey,
    pool: pool,
    positionNft: positionNft.publicKey,
  };
  const transaction = await cpAmm.createPosition(createPositionParams);
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    wallet,
  ]);
  console.log(signature);
})();
