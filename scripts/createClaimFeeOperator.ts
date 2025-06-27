import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { CpAmm } from "../src";

async function createClaimFeeOperator(
  rpc: string,
  walletPath: string,
  operator: PublicKey
) {
  const connection = new Connection(rpc);
  const wallet = Keypair.fromSecretKey(Uint8Array.from(require(walletPath)));

  console.log(`Connected using wallet ${wallet.publicKey.toBase58()}`);

  const cpAmm = new CpAmm(connection);

  const claimTx = await cpAmm.createClaimFeeOperator({
    operator,
    admin: wallet.publicKey,
  });
  const { lastValidBlockHeight, blockhash } =
    await connection.getLatestBlockhash();

  const tx = new Transaction({
    lastValidBlockHeight,
    blockhash,
  }).add(...claimTx.instructions);

  tx.sign(wallet);

  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction({
    lastValidBlockHeight,
    blockhash,
    signature,
  });
}

const RPC = process.env.RPC;
const WALLET_PATH = process.env.WALLET_PATH;
const operator = new PublicKey("36ee5URvL3rnzN9yvvsfd9whKinYNUHnJGa3oGwYKdY7");

createClaimFeeOperator(RPC, WALLET_PATH, operator)
  .then(() => {
    console.log(">>> Created claim fee operator");
  })
  .catch(console.error);
