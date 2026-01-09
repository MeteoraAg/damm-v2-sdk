import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  CpAmm,
  derivePoolAddress,
  derivePositionAddress,
  derivePositionNftAccount,
  getSqrtPriceFromPrice,
} from "../src";
import {
  AuthorityType,
  createSetAuthorityInstruction,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

(async () => {
  const CONFIG = {
    keypairPath: "~/.config/solana/id.json",
    rpcUrl: clusterApiUrl("devnet"),
    creator: new PublicKey("C7sHUEk9AhiuBZU3cCDaguBcW5PCichpEzqyRHTUY5WZ"),
    tokenAMint: new PublicKey("J2bs44Z5voXgD9SCimErU5KboaWXd9HPELEQgiW44vo9"),
    tokenBMint: NATIVE_MINT,
    config: new PublicKey("8CNy9goNQNLM4wtgRw528tUQGMKD3vSuFRZY2gLGLLvF"),
    tokenADecimals: 9,
    tokenBDecimals: 9,
    tokenAAmount: 1_000_000,
    tokenBAmount: 1, // SOL
    initialPrice: 1, // 1 base token = 1 quote token
  };

  const payer = Keypair.fromSecretKey(
    Uint8Array.from(Uint8Array.from(require(CONFIG.keypairPath))),
  );

  const connection = new Connection(CONFIG.rpcUrl);
  const cpAmm = new CpAmm(connection);

  const configState = await cpAmm.fetchConfigState(CONFIG.config);

  const initialPoolTokenAAmount = new BN(CONFIG.tokenAAmount).mul(
    new BN(10 ** CONFIG.tokenADecimals),
  );
  const initialPoolTokenBAmount = new BN(CONFIG.tokenBAmount).mul(
    new BN(10 ** CONFIG.tokenBDecimals),
  );
  const initSqrtPrice = getSqrtPriceFromPrice(
    CONFIG.initialPrice.toString(),
    CONFIG.tokenADecimals,
    CONFIG.tokenBDecimals,
  );
  const liquidityDelta = cpAmm.getLiquidityDelta({
    maxAmountTokenA: initialPoolTokenAAmount,
    maxAmountTokenB: initialPoolTokenBAmount,
    sqrtPrice: initSqrtPrice,
    sqrtMinPrice: configState.sqrtMinPrice,
    sqrtMaxPrice: configState.sqrtMaxPrice,
  });

  // create pool with payer is creator
  console.log("create pool");
  const positionNft = Keypair.generate();
  const initPoolTx = await cpAmm.createPool({
    payer: payer.publicKey,
    creator: payer.publicKey,
    config: CONFIG.config,
    positionNft: positionNft.publicKey,
    tokenAMint: CONFIG.tokenAMint,
    tokenBMint: CONFIG.tokenBMint,
    tokenAAmount: initialPoolTokenAAmount,
    tokenBAmount: initialPoolTokenBAmount,
    liquidityDelta: liquidityDelta,
    initSqrtPrice: initSqrtPrice,
    activationPoint: null,
    tokenAProgram: TOKEN_PROGRAM_ID,
    tokenBProgram: TOKEN_PROGRAM_ID,
    isLockLiquidity: true, // lock liquidity
  });

  const createPoolSig = await sendAndConfirmTransaction(
    connection,
    initPoolTx,
    [payer, positionNft],
    {
      commitment: "confirmed",
    },
  );

  // transfer locked nft position from payer to creator
  console.log("transfer position to creator");
  const positionNftAccount = derivePositionNftAccount(positionNft.publicKey);
  const setAuthorityIx = createSetAuthorityInstruction(
    positionNftAccount,
    payer.publicKey,
    AuthorityType.AccountOwner,
    CONFIG.creator,
    [],
    TOKEN_2022_PROGRAM_ID,
  );
  const assignOwnerTx = new Transaction().add(setAuthorityIx);
  const assignSig = await sendAndConfirmTransaction(
    connection,
    assignOwnerTx,
    [payer],
    {
      commitment: "confirmed",
    },
  );

  console.log({
    pool: derivePoolAddress(
      CONFIG.config,
      CONFIG.tokenAMint,
      CONFIG.tokenBMint,
    ).toString(),
    position: derivePositionAddress(positionNft.publicKey).toString(),
    positionNft: positionNft.publicKey.toString(),
    createPoolSig,
    assignSig,
  });
})();
