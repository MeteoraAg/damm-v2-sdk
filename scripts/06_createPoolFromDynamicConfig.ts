import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  CpAmm,
  FeeSchedulerMode,
  getAmountAFromLiquidityDelta,
  getAmountBFromLiquidityDelta,
  getBaseFeeParams,
  getDynamicFeeParams,
  getSqrtPriceFromPrice,
  InitializeCustomizeablePoolWithDynamicConfigParams,
  PoolFeesParams,
  Rounding,
} from "../src";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import fs from "fs";
import dammV2PoolConfig from "./config/dammv2ConcentratedPoolConfig.json";

(async () => {
  const wallet = Keypair.fromSecretKey(
    Uint8Array.from(require(dammV2PoolConfig.keypairFilePath))
  );

  const connection = new Connection(dammV2PoolConfig.rpcUrl);
  const cpAmm = new CpAmm(connection);

  const confgAccount = new PublicKey(dammV2PoolConfig.configAccount);

  const result = [];

  for (const poolConfig of dammV2PoolConfig.poolList) {
    const maxAmountTokenA = new BN(
      poolConfig.maxTokenAAmount * 10 ** poolConfig.tokenADecimal
    );
    const maxAmountTokenB = new BN(
      poolConfig.maxTokenBAmount * 10 ** poolConfig.tokenBDecimal
    );
    const sqrtPrice = getSqrtPriceFromPrice(
      poolConfig.initPrice.toString(),
      poolConfig.tokenADecimal,
      poolConfig.tokenBDecimal
    );
    const sqrtMinPrice = getSqrtPriceFromPrice(
      poolConfig.minPrice.toString(),
      poolConfig.tokenADecimal,
      poolConfig.tokenBDecimal
    );
    const sqrtMaxPrice = getSqrtPriceFromPrice(
      poolConfig.maxPrice.toString(),
      poolConfig.tokenADecimal,
      poolConfig.tokenBDecimal
    );

    const liquidityDelta = cpAmm.getLiquidityDelta({
      maxAmountTokenA,
      maxAmountTokenB,
      sqrtMaxPrice,
      sqrtMinPrice,
      sqrtPrice,
    });

    const baseFeeParams = getBaseFeeParams(
      poolConfig.baseFee,
      poolConfig.baseFee,
      FeeSchedulerMode.Linear,
      0,
      0
    );
    let dynamicFeeParams = null;
    if (poolConfig.dynamicFee) {
      dynamicFeeParams = getDynamicFeeParams(poolConfig.baseFee);
    }
    const tokenADepositToPool = getAmountAFromLiquidityDelta(
      liquidityDelta,
      sqrtPrice,
      sqrtMaxPrice,
      Rounding.Up
    ).toString();

    const tokenBDepositToPool = getAmountBFromLiquidityDelta(
      liquidityDelta,
      sqrtPrice,
      sqrtMinPrice,
      Rounding.Up
    );

    const poolFees: PoolFeesParams = {
      baseFee: baseFeeParams,
      protocolFeePercent: 20,
      partnerFeePercent: 0,
      referralFeePercent: 20,
      dynamicFee: dynamicFeeParams,
    };

    //
    const positionNft = Keypair.generate();
    const createPoolParams: InitializeCustomizeablePoolWithDynamicConfigParams =
      {
        creator: wallet.publicKey,
        payer: wallet.publicKey,
        config: confgAccount,
        poolCreatorAuthority: wallet.publicKey,
        positionNft: positionNft.publicKey,
        tokenAMint: new PublicKey(poolConfig.tokenAMint),
        tokenBMint: new PublicKey(poolConfig.tokenBMint),
        tokenAAmount: maxAmountTokenA,
        tokenBAmount: maxAmountTokenB,
        initSqrtPrice: sqrtPrice,
        poolFees,
        sqrtMinPrice,
        sqrtMaxPrice,
        liquidityDelta,
        activationType: 1, // 0 slot, 1 timestamp
        hasAlphaVault: false,
        collectFeeMode: poolConfig.feeCollectionMode,
        activationPoint: null,
        tokenAProgram: TOKEN_PROGRAM_ID,
        tokenBProgram: TOKEN_PROGRAM_ID,
      };

    const {
      tx: transaction,
      pool: poolAddress,
      position,
    } = await cpAmm.createCustomPoolWithDynamicConfig(createPoolParams);
    transaction.feePayer = wallet.publicKey;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    if (dammV2PoolConfig.dryRun) {
      console.log(await connection.simulateTransaction(transaction));
    } else {
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [wallet, positionNft],
        {
          commitment: "confirmed",
        }
      );
      console.log(`>> creating pool: ${poolConfig.pair}`, {
        signature,
        poolAddress: poolAddress.toString(),
        position: position.toString(),
      });
      result.push({
        pair: poolConfig.pair,
        poolAddress: poolAddress.toString(),
        position: position.toString(),
        tokenADepositToPool: tokenADepositToPool.toString(),
        tokenBDepositToPool: tokenBDepositToPool.toString(),
        maxAmountTokenA: maxAmountTokenA.toString(),
        maxAmountTokenB: maxAmountTokenB.toString(),
      });
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  fs.writeFileSync(
    `./scripts/create_pool_result_${Date.now()}.json`,
    JSON.stringify(result, null, 4)
  );
})();
