import { ProgramTestContext } from "solana-bankrun";
import {
  attachBanksClient,
  createDynamicConfig,
  createOperator,
  createPool,
  encodePermissions,
  LOCAL_ADMIN_KEYPAIR,
  OperatorPermission,
  setupTestContext,
  startTest,
} from "./bankrun-utils/common";
import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { CpAmm } from "../src";
import { beforeEach, describe, expect, it } from "vitest";

describe("getMultipleConfigs / getMultiplePools / getMultiplePositions", () => {
  let context: ProgramTestContext;
  let ammInstance: CpAmm;
  let configs: PublicKey[];
  let pools: PublicKey[];
  let positions: PublicKey[];
  let tokenAMints: PublicKey[];

  beforeEach(async () => {
    context = await startTest();
    const prepareContext = await setupTestContext(
      context.banksClient,
      context.payer,
      false,
    );

    const connection = new Connection(clusterApiUrl("devnet"));
    ammInstance = new CpAmm(connection);
    attachBanksClient(ammInstance._program, context.banksClient);

    await createOperator(context.banksClient, ammInstance._program, {
      admin: LOCAL_ADMIN_KEYPAIR,
      whitelistAddress: LOCAL_ADMIN_KEYPAIR.publicKey,
      permission: encodePermissions([OperatorPermission.CreateConfigKey]),
    });
    configs = [];
    for (const index of [1, 2]) {
      configs.push(
        await createDynamicConfig(
          context.banksClient,
          ammInstance._program,
          LOCAL_ADMIN_KEYPAIR,
          new BN(index),
          prepareContext.poolCreator.publicKey,
        ),
      );
    }

    // user holds both rewardMint and tokenBMint, so it can fund a second pool
    tokenAMints = [prepareContext.tokenAMint, prepareContext.rewardMint];
    const first = await createPool(
      context.banksClient,
      ammInstance,
      prepareContext.payer,
      prepareContext.poolCreator,
      tokenAMints[0],
      prepareContext.tokenBMint,
    );
    const second = await createPool(
      context.banksClient,
      ammInstance,
      prepareContext.user,
      prepareContext.poolCreator,
      tokenAMints[1],
      prepareContext.tokenBMint,
    );
    pools = [first.pool, second.pool];
    positions = [first.position, second.position];
  });

  it("returns configs in input order", async () => {
    const states = await ammInstance.getMultipleConfigs([
      configs[1],
      configs[0],
    ]);

    expect(states.map((state) => state.index.toNumber())).toEqual([2, 1]);
    expect(states[0]).toEqual(await ammInstance.fetchConfigState(configs[1]));
  });

  it("returns pools in input order", async () => {
    const states = await ammInstance.getMultiplePools([pools[1], pools[0]]);

    expect(states.map((state) => state.tokenAMint.toBase58())).toEqual([
      tokenAMints[1].toBase58(),
      tokenAMints[0].toBase58(),
    ]);
    expect(states[0]).toEqual(await ammInstance.fetchPoolState(pools[1]));
  });

  it("returns positions in input order", async () => {
    const states = await ammInstance.getMultiplePositions([
      positions[1],
      positions[0],
    ]);

    expect(states.map((state) => state.pool.toBase58())).toEqual([
      pools[1].toBase58(),
      pools[0].toBase58(),
    ]);
    expect(states[0]).toEqual(
      await ammInstance.fetchPositionState(positions[1]),
    );
  });

  it("throws on a missing account", async () => {
    const missing = Keypair.generate().publicKey;

    await expect(
      ammInstance.getMultipleConfigs([configs[0], missing]),
    ).rejects.toThrow(`Config account: ${missing.toBase58()} not found`);
    await expect(
      ammInstance.getMultiplePools([pools[0], missing]),
    ).rejects.toThrow(`Pool account: ${missing.toBase58()} not found`);
    await expect(
      ammInstance.getMultiplePositions([positions[0], missing]),
    ).rejects.toThrow(`Position account: ${missing.toBase58()} not found`);
  });

  it("returns an empty array for empty input", async () => {
    expect(await ammInstance.getMultipleConfigs([])).toEqual([]);
    expect(await ammInstance.getMultiplePools([])).toEqual([]);
    expect(await ammInstance.getMultiplePositions([])).toEqual([]);
  });
});
