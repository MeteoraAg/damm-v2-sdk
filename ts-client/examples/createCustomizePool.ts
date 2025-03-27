import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  BaseFee,
  CpAmm,
  InitializeCustomizeablePoolParams,
  PoolFeesParams,
} from "../src";
import { NATIVE_MINT } from "@solana/spl-token";
(async () => {
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(
      Uint8Array.from(require("/Users/minhdo/.config/solana/id.json"))
    )
  );

  const tokenA = new PublicKey("4eQ3PiW2n3bhKEopYDBe2pVxd66MjwowXzbFWYq95pZv");
  // const tokenX = new PublicKey("4eQ3PiW2n3bhKEopYDBe2pVxd66MjwowXzbFWYq95pZv");
  const tokenB = NATIVE_MINT;
  const connection = new Connection(clusterApiUrl("devnet"));
  const cpAmm = new CpAmm(connection);

  const baseFee: BaseFee = {
    cliffFeeNumerator: new BN(1_000_000), // 1%
    numberOfPeriod: 10,
    periodFrequency: new BN(10),
    reductionFactor: new BN(2),
    feeSchedulerMode: 0, // Linear
  };
  const poolFees: PoolFeesParams = {
    baseFee,
    protocolFeePercent: 20,
    partnerFeePercent: 0,
    referralFeePercent: 20,
    dynamicFee: null,
  };

  const positionNft = Keypair.generate();

  const params: InitializeCustomizeablePoolParams = {
    payer: wallet.publicKey,
    creator: wallet.publicKey,
    positionNft: positionNft.publicKey,
    tokenAMint: tokenA,
    tokenBMint: tokenB,
    tokenAAmount: new BN(1 * 10 ** 6),
    tokenBAmount: new BN(0.1 * 10 ** 9),
    tokenADecimal: 6,
    tokenBDecimal: 9,
    poolFees,
    hasAlphaVault: false,
    activationType: 1, // 0 slot, 1 timestamp
    collectFeeMode: 0,
    activationPoint: null,
  };

  const { tx: transaction } = await cpAmm.createCustomPool(params);
  const signature = await sendAndConfirmTransaction(connection, transaction, [
    wallet,
    positionNft,
  ]);
  console.log(signature);
})();
