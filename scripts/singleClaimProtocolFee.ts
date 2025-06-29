import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { CpAmm } from "../src";

const RPC = process.env.RPC;
const WALLET_PATH = process.env.WALLET_PATH;
const TREASURY =
  process.env.TREASURY || "4EWqcx3aNZmMetCnxwLYwyNjan6XLGp3Ca2W316vrSjv";
const POOL = process.env.POOL || "";

async function claimPoolProtocolFee(
  rpc: string,
  walletPath: string,
  treasury: PublicKey,
  pool: string
) {
  const poolAddress = new PublicKey(pool);
  const connection = new Connection(rpc);
  const wallet = Keypair.fromSecretKey(Uint8Array.from(require(walletPath)));

  console.log(`Connected using wallet ${wallet.publicKey.toBase58()}`);

  const cpAmm = new CpAmm(connection);
  const claimTx = await cpAmm.claimProtocolFee({
    operator: wallet.publicKey,
    treasury,
    pool: poolAddress,
  });

  const latestBlockhash = await connection.getLatestBlockhash();
  const transaction = new Transaction({ ...latestBlockhash }).add(
    ...claimTx.instructions
  );
  transaction.sign(wallet);

  const signature = await connection.sendRawTransaction(
    transaction.serialize()
  );
  await connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  });
}

claimPoolProtocolFee(RPC, WALLET_PATH, new PublicKey(TREASURY), POOL)
  .then(() => {
    console.log(">>> Claimed all protocol fees");
  })
  .catch(console.error);
