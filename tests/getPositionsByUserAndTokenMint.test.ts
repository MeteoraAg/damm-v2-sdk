import { ProgramTestContext } from "solana-bankrun";
import { BanksClient } from "solana-bankrun";
import {
  executeTransaction,
  setupTestContext,
  startTest,
} from "./bankrun-utils/common";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createToken, DECIMALS, mintTo } from "./bankrun-utils";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  CreatePositionParams,
  derivePositionAddress,
  derivePositionNftAccount,
  getBaseFeeParams,
  InitializeCustomizeablePoolParams,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  PoolFeesParams,
  POOL_TOKEN_A_MINT_OFFSET,
  POOL_TOKEN_B_MINT_OFFSET,
} from "../src";
import { beforeEach, describe, expect, it } from "vitest";

function makeBankrunConnection(
  banksClient: BanksClient,
  positionNftMints: PublicKey[],
): Connection {
  return {
    getTokenAccountsByOwner: async () => {
      const value: Array<{ pubkey: PublicKey; account: { data: Buffer } }> = [];
      for (const nftMint of positionNftMints) {
        const nftAccount = derivePositionNftAccount(nftMint);
        const account = await banksClient.getAccount(nftAccount);
        if (!account) continue;
        value.push({
          pubkey: nftAccount,
          account: { data: Buffer.from(account.data) },
        });
      }
      return { value };
    },
    getMultipleAccountsInfoAndContext: async (publicKeys: PublicKey[]) => {
      const value = [];
      for (const publicKey of publicKeys) {
        const account = await banksClient.getAccount(publicKey);
        value.push(
          account
            ? {
                ...account,
                owner: new PublicKey(account.owner),
                data: Buffer.from(account.data),
                lamports: Number(account.lamports),
              }
            : null,
        );
      }
      return { context: { slot: 0 }, value };
    },
  } as unknown as Connection;
}

describe("getPositionsByUserAndTokenMint", () => {
  let context: ProgramTestContext;
  let payer: Keypair;
  let user: Keypair;
  let creator: Keypair;
  let tokenX: PublicKey;
  let tokenY: PublicKey;
  let tokenZ: PublicKey;
  let ammInstance: CpAmm;
  let poolXY: PublicKey;
  let poolZY: PublicKey;
  let positionXY: PublicKey;
  let positionZY: PublicKey;
  let userPositionNfts: PublicKey[];

  const createPoolAndUserPosition = async (
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
  ): Promise<{ pool: PublicKey; position: PublicKey; nftMint: PublicKey }> => {
    const baseFee = getBaseFeeParams({
      baseFeeMode: BaseFeeMode.FeeTimeSchedulerExponential,
      feeTimeSchedulerParam: {
        startingFeeBps: 5000,
        endingFeeBps: 100,
        numberOfPeriod: 180,
        totalDuration: 180,
      },
    });

    const poolFees: PoolFeesParams = {
      baseFee,
      compoundingFeeBps: 0,
      padding: 0,
      dynamicFee: null,
    };

    const tokenAAmount = new BN(1000 * 10 ** DECIMALS);
    const tokenBAmount = new BN(1000 * 10 ** DECIMALS);
    const { liquidityDelta, initSqrtPrice } =
      ammInstance.preparePoolCreationParams({
        tokenAAmount,
        tokenBAmount,
        minSqrtPrice: MIN_SQRT_PRICE,
        maxSqrtPrice: MAX_SQRT_PRICE,
        collectFeeMode: CollectFeeMode.BothToken,
      });

    const poolPositionNft = Keypair.generate();
    const params: InitializeCustomizeablePoolParams = {
      payer: payer.publicKey,
      creator: creator.publicKey,
      positionNft: poolPositionNft.publicKey,
      tokenAMint,
      tokenBMint,
      tokenAAmount,
      tokenBAmount,
      sqrtMinPrice: MIN_SQRT_PRICE,
      sqrtMaxPrice: MAX_SQRT_PRICE,
      liquidityDelta,
      initSqrtPrice,
      poolFees,
      hasAlphaVault: false,
      activationType: ActivationType.Timestamp,
      collectFeeMode: CollectFeeMode.BothToken,
      activationPoint: null,
      tokenAProgram: TOKEN_PROGRAM_ID,
      tokenBProgram: TOKEN_PROGRAM_ID,
    };

    const { tx, pool } = await ammInstance.createCustomPool(params);
    await executeTransaction(context.banksClient, tx, [payer, poolPositionNft]);

    const userPositionNft = Keypair.generate();
    const createPositionParams: CreatePositionParams = {
      owner: user.publicKey,
      payer: user.publicKey,
      pool,
      positionNft: userPositionNft.publicKey,
    };
    const createPositionTx =
      await ammInstance.createPosition(createPositionParams);
    await executeTransaction(context.banksClient, createPositionTx, [
      user,
      userPositionNft,
    ]);

    return {
      pool,
      position: derivePositionAddress(userPositionNft.publicKey),
      nftMint: userPositionNft.publicKey,
    };
  };

  beforeEach(async () => {
    context = await startTest();

    const prepareContext = await setupTestContext(
      context.banksClient,
      context.payer,
      false,
    );
    payer = prepareContext.payer;
    creator = prepareContext.poolCreator;
    user = prepareContext.user;
    tokenX = prepareContext.tokenAMint;
    tokenY = prepareContext.tokenBMint;

    // a third mint so the user has positions in a pool that does NOT contain tokenX
    const tokenZKeypair = Keypair.generate();
    await createToken(
      context.banksClient,
      context.payer,
      tokenZKeypair,
      context.payer.publicKey,
    );
    tokenZ = tokenZKeypair.publicKey;
    await mintTo(
      context.banksClient,
      context.payer,
      tokenZ,
      context.payer,
      payer.publicKey,
      BigInt(100_000_000 * 10 ** DECIMALS),
    );

    ammInstance = new CpAmm(new Connection(clusterApiUrl("devnet")));

    const xy = await createPoolAndUserPosition(tokenX, tokenY);
    const zy = await createPoolAndUserPosition(tokenZ, tokenY);
    poolXY = xy.pool;
    poolZY = zy.pool;
    positionXY = xy.position;
    positionZY = zy.position;
    userPositionNfts = [xy.nftMint, zy.nftMint];
  });

  it("stores token mints at the offsets used by the pool memcmp filters", async () => {
    for (const [pool, tokenAMint, tokenBMint] of [
      [poolXY, tokenX, tokenY],
      [poolZY, tokenZ, tokenY],
    ] as const) {
      const account = await context.banksClient.getAccount(pool);
      expect(account).not.toBeNull();

      const data = Buffer.from(account.data);
      const tokenAMintOnChain = new PublicKey(
        data.subarray(POOL_TOKEN_A_MINT_OFFSET, POOL_TOKEN_A_MINT_OFFSET + 32),
      );
      const tokenBMintOnChain = new PublicKey(
        data.subarray(POOL_TOKEN_B_MINT_OFFSET, POOL_TOKEN_B_MINT_OFFSET + 32),
      );

      expect(tokenAMintOnChain.toBase58()).toBe(tokenAMint.toBase58());
      expect(tokenBMintOnChain.toBase58()).toBe(tokenBMint.toBase58());
    }
  });

  it("returns only the user's positions in pools containing the mint", async () => {
    const bankrunAmm = new CpAmm(
      makeBankrunConnection(context.banksClient, userPositionNfts),
    );

    // tokenX is only in pool XY
    const byTokenX = await bankrunAmm.getPositionsByUserAndTokenMint(
      user.publicKey,
      tokenX,
    );
    expect(byTokenX.map((p) => p.position.toBase58())).toEqual([
      positionXY.toBase58(),
    ]);
    expect(byTokenX[0].pool.toBase58()).toBe(poolXY.toBase58());
    expect(byTokenX[0].poolState.tokenAMint.toBase58()).toBe(tokenX.toBase58());
    expect(byTokenX[0].positionState.pool.toBase58()).toBe(poolXY.toBase58());

    // tokenZ is only in pool ZY
    const byTokenZ = await bankrunAmm.getPositionsByUserAndTokenMint(
      user.publicKey,
      tokenZ,
    );
    expect(byTokenZ.map((p) => p.position.toBase58())).toEqual([
      positionZY.toBase58(),
    ]);

    // tokenY is on the B side of both pools
    const byTokenY = await bankrunAmm.getPositionsByUserAndTokenMint(
      user.publicKey,
      tokenY,
    );
    expect(byTokenY.map((p) => p.position.toBase58()).sort()).toEqual(
      [positionXY.toBase58(), positionZY.toBase58()].sort(),
    );
    for (const position of byTokenY) {
      expect(position.poolState.tokenBMint.toBase58()).toBe(tokenY.toBase58());
    }

    // an unrelated mint matches nothing
    const byRandomMint = await bankrunAmm.getPositionsByUserAndTokenMint(
      user.publicKey,
      Keypair.generate().publicKey,
    );
    expect(byRandomMint).toEqual([]);
  });
});
