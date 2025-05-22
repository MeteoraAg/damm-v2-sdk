import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  CpAmm,
  derivePoolAddress,
  derivePositionAddress,
  getSqrtPriceFromPrice,
} from "../src";
import {
  getMint,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

(async () => {
  const CONFIG = {
    keypairPath: "~/.config/solana/id.json",
    rpcUrl: clusterApiUrl("devnet"),
    tokenAMint: new PublicKey("9EpFqwBgu9JkxZYEaG1suWzVeA4YR14bkci2gJHU896y"),
    tokenBMint: NATIVE_MINT,
    config: new PublicKey("8CNy9goNQNLM4wtgRw528tUQGMKD3vSuFRZY2gLGLLvF"),
    tokenADecimals: 9,
    tokenBDecimals: 9,
    tokenAAmount: 1_000_000,
    tokenBAmount: 1, // SOL
    initialPrice: 1, // 1 base token = 1 quote token
  };

  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(Uint8Array.from(require(CONFIG.keypairPath)))
  );

  const connection = new Connection(CONFIG.rpcUrl);
  const cpAmm = new CpAmm(connection);

  const configState = await cpAmm.fetchConfigState(CONFIG.config);
  const tokenAAccountInfo = await connection.getAccountInfo(CONFIG.tokenAMint);

  let tokenAProgram = TOKEN_PROGRAM_ID;
  let tokenAInfo = null;
  if (tokenAAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    tokenAProgram = tokenAAccountInfo.owner;
    const baseMint = await getMint(
      connection,
      CONFIG.tokenAMint,
      connection.commitment,
      tokenAProgram
    );
    const epochInfo = await connection.getEpochInfo();
    tokenAInfo = {
      mint: baseMint,
      currentEpoch: epochInfo.epoch,
    };
  }

  const initialPoolTokenAAmount = new BN(CONFIG.tokenAAmount).mul(
    new BN(10 ** CONFIG.tokenADecimals)
  );
  const initialPoolTokenBAmount = new BN(CONFIG.tokenBAmount).mul(
    new BN(10 ** CONFIG.tokenBDecimals)
  );
  const initSqrtPrice = getSqrtPriceFromPrice(
    CONFIG.initialPrice.toString(),
    CONFIG.tokenADecimals,
    CONFIG.tokenBDecimals
  );
  const liquidityDelta = cpAmm.getLiquidityDelta({
    maxAmountTokenA: initialPoolTokenAAmount,
    maxAmountTokenB: initialPoolTokenBAmount,
    sqrtPrice: initSqrtPrice,
    sqrtMinPrice: configState.sqrtMinPrice,
    sqrtMaxPrice: configState.sqrtMaxPrice,
    tokenAInfo,
  });

  // create pool (included create first position)
  console.log("create pool");
  const firstPositionNft = Keypair.generate();
  const initPoolTx = await cpAmm.createPool({
    payer: wallet.publicKey,
    creator: wallet.publicKey,
    config: CONFIG.config,
    positionNft: firstPositionNft.publicKey,
    tokenAMint: CONFIG.tokenAMint,
    tokenBMint: CONFIG.tokenBMint,
    tokenAAmount: initialPoolTokenAAmount,
    tokenBAmount: initialPoolTokenBAmount,
    liquidityDelta: liquidityDelta,
    initSqrtPrice: initSqrtPrice,
    activationPoint: null,
    tokenAProgram,
    tokenBProgram: TOKEN_PROGRAM_ID,
    isLockLiquidity: true,
  });

  const signature = await sendAndConfirmTransaction(
    connection,
    initPoolTx,
    [wallet, firstPositionNft],
    {
      commitment: "confirmed",
    }
  );

  console.log({
    pool: derivePoolAddress(
      CONFIG.config,
      CONFIG.tokenAMint,
      CONFIG.tokenBMint
    ).toString(),
    position: derivePositionAddress(firstPositionNft.publicKey).toString(),
    positionNft: firstPositionNft.publicKey.toString(),
    signature,
  });
})();
