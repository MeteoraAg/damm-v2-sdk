import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { CpAmm, derivePositionAddress, derivePositionNftAccount } from "../src";
import {
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

(async () => {
  const CONFIG = {
    keypairPath: "~/.config/solana/id.json",
    rpcUrl: clusterApiUrl("devnet"),
    pool: new PublicKey("AfSNTGm4nGoQz5ZiDoZRwdYkFZMUr9nudMST8cTQL8Vb"),
    tokenADecimals: 9,
    tokenBDecimals: 9,
    tokenAAmount: 1_000_000,
    tokenBAmount: 1, // SOL
  };

  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(Uint8Array.from(require(CONFIG.keypairPath))),
  );

  const connection = new Connection(CONFIG.rpcUrl);
  const cpAmm = new CpAmm(connection);

  const poolState = await cpAmm.fetchPoolState(CONFIG.pool);
  const tokenAAccountInfo = await connection.getAccountInfo(
    poolState.tokenAMint,
  );

  let tokenAProgram = TOKEN_PROGRAM_ID;
  let tokenAInfo = null;
  if (tokenAAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    tokenAProgram = tokenAAccountInfo.owner;
    const baseMint = await getMint(
      connection,
      poolState.tokenAMint,
      connection.commitment,
      tokenAProgram,
    );
    const epochInfo = await connection.getEpochInfo();
    tokenAInfo = {
      mint: baseMint,
      currentEpoch: epochInfo.epoch,
    };
  }

  const addLidTokenAAmount = new BN(CONFIG.tokenAAmount).mul(
    new BN(10 ** CONFIG.tokenADecimals),
  );
  const addLidTokenBAmount = new BN(CONFIG.tokenBAmount).mul(
    new BN(10 ** CONFIG.tokenBDecimals),
  );

  // create second position
  console.log("create second position and lock");

  const positionNft = Keypair.generate();
  const position = derivePositionAddress(positionNft.publicKey);

  const liquidityDelta = cpAmm.getLiquidityDelta({
    maxAmountTokenA: addLidTokenAAmount,
    maxAmountTokenB: addLidTokenBAmount,
    sqrtPrice: poolState.sqrtPrice,
    sqrtMinPrice: poolState.sqrtMinPrice,
    sqrtMaxPrice: poolState.sqrtMaxPrice,
    tokenAInfo,
  });

  const createSecondPositionTx = await cpAmm.createPositionAndAddLiquidity({
    owner: wallet.publicKey,
    pool: CONFIG.pool,
    positionNft: positionNft.publicKey,
    liquidityDelta,
    maxAmountTokenA: addLidTokenAAmount,
    maxAmountTokenB: addLidTokenBAmount,
    tokenAAmountThreshold: addLidTokenAAmount,
    tokenBAmountThreshold: addLidTokenBAmount,
    tokenAMint: poolState.tokenAMint,
    tokenBMint: poolState.tokenBMint,
    tokenAProgram,
    tokenBProgram: TOKEN_PROGRAM_ID,
  });

  const permanentLockSecondPositionIx = await cpAmm.permanentLockPosition({
    owner: wallet.publicKey,
    position,
    positionNftAccount: derivePositionNftAccount(positionNft.publicKey),
    pool: CONFIG.pool,
    unlockedLiquidity: liquidityDelta,
  });

  // create second position and permanent lock
  const transaction = new Transaction();
  transaction.add(...createSecondPositionTx.instructions);
  transaction.add(...permanentLockSecondPositionIx.instructions);

  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash()
  ).blockhash;
  transaction.sign(...[wallet, positionNft]);

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [wallet, positionNft],
    { commitment: "confirmed" },
  );

  console.log({
    position: derivePositionAddress(positionNft.publicKey).toString(),
    positionNft: positionNft.publicKey.toString(),
    signature,
  });
})();
