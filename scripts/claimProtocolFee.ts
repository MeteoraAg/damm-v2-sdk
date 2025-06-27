import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { CP_AMM_PROGRAM_ID, CpAmm } from "../src";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

const RPC = process.env.RPC;
const WALLET_PATH = process.env.WALLET_PATH;
const CONCURRENCY = process.env.CONCURRENCY || "10";
const TREASURY =
  process.env.TREASURY || "4EWqcx3aNZmMetCnxwLYwyNjan6XLGp3Ca2W316vrSjv";
const EXCLUDE_POOLS = process.env.EXCLUDE_POOLS || "";

async function getAllPoolAddresses(
  connection: Connection
): Promise<PublicKey[]> {
  console.log(">>> Getting all pool addresses");

  const cpAmm = new CpAmm(connection);
  const poolDisc = cpAmm._program.idl.accounts.find(
    (account) => account.name.toLocaleLowerCase() === "pool"
  ).discriminator;

  const poolAccounts = await connection.getProgramAccounts(CP_AMM_PROGRAM_ID, {
    dataSlice: {
      offset: 0,
      length: 0,
    },
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(poolDisc),
        },
      },
    ],
  });

  console.log(`>>> Found ${poolAccounts.length} pools`);
  return poolAccounts.map((account) => account.pubkey);
}

async function claimAndConfirm(
  instructions: TransactionInstruction[],
  connection: Connection,
  operator: Keypair
) {
  while (true) {
    try {
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      const transaction = new Transaction({
        blockhash,
        lastValidBlockHeight,
      }).add(...instructions);

      transaction.sign(operator);
      const tx = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature: tx,
      });
      return;
    } catch (error) {
      console.error(`Error: ${error}`);
      // Wait 12 seconds before retry
      await new Promise((res) => setTimeout(res, 1000 * 12));
    }
  }
}

async function claimAllProtocolFees(
  rpc: string,
  walletPath: string,
  treasury: PublicKey,
  concurrency: number,
  excludePoolAddresses: PublicKey[],
  claimPerTransaction = 2
) {
  const connection = new Connection(rpc);
  const wallet = Keypair.fromSecretKey(Uint8Array.from(require(walletPath)));

  console.log(`Connected using wallet ${wallet.publicKey.toBase58()}`);

  const poolAddresses = await getAllPoolAddresses(connection).then(
    (addresses) =>
      addresses.filter((address) => !excludePoolAddresses.includes(address))
  );

  const cpAmm = new CpAmm(connection);
  let promises = [];

  const poolAddressCount = poolAddresses.length;
  let claimedPoolAddressCount = 0;

  while (poolAddresses.length > 0) {
    if (promises.length >= concurrency) {
      console.log(`Waiting for ${promises.length} transactions to confirm`);
      await Promise.race(promises);
    }

    const instructions = await Promise.all(
      poolAddresses.splice(0, claimPerTransaction).map((pool) => {
        return cpAmm
          .claimProtocolFee({
            pool,
            treasury,
            operator: wallet.publicKey,
          })
          .then((res) => res.instructions);
      })
    ).then((res) => res.flat());

    const claimAdnConfirmPromise = claimAndConfirm(
      instructions,
      connection,
      wallet
    );

    claimAdnConfirmPromise.then(() => {
      promises = promises.filter(
        (promise) => promise !== claimAdnConfirmPromise
      );

      claimedPoolAddressCount += claimPerTransaction;
      console.log(
        `Claimed protocol fee for ${claimedPoolAddressCount}/${poolAddressCount} pools`
      );
    });

    promises.push(claimAdnConfirmPromise);
  }
}

const excludePoolAddresses =
  EXCLUDE_POOLS.length > 0
    ? EXCLUDE_POOLS.split(",").map((address) => new PublicKey(address))
    : [];

claimAllProtocolFees(
  RPC,
  WALLET_PATH,
  new PublicKey(TREASURY),
  Number.parseInt(CONCURRENCY),
  excludePoolAddresses
)
  .then(() => {
    console.log(">>> Claimed all protocol fees");
  })
  .catch(console.error);
