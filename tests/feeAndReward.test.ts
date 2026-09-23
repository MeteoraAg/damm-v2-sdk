import { describe, expect, it } from "vitest";
import BN from "bn.js";
import {
  ActivationType,
  BaseFeeMode,
  calculatePositionFeeOrReward,
  CollectFeeMode,
  DEAD_LIQUIDITY,
  getAvailableVestingLiquidity,
  getBaseFeeParams,
  getDeadLiquidityReward,
  getRewardInfo,
  getUnClaimLpFee,
  getUserRewardPending,
  InvalidCompoundingFeeBpsError,
  InvalidRewardIndexError,
  LIQUIDITY_SCALE,
  MathOverflowError,
  mulShr256WrappingU64,
  pendingPositionReward,
  positionLiquidity,
  readU256Le,
  saturatingAddU64,
  TOTAL_REWARD_SCALE,
  U128_MAX,
  U256_MODULUS,
  U64_MAX,
  U64_MODULUS,
  validatePoolFees,
  wrappingAddU256,
  wrappingSubU256,
  wrappingSubU64,
  type PoolFeesParams,
  type PoolState,
  type PositionState,
  type RewardInfo,
  type VestingState,
} from "../src";

const U256_MAX = U256_MODULUS.subn(1);

function leBytes(value: BN): number[] {
  return Array.from(value.toArrayLike(Buffer, "le", 32));
}

function staticFees(compoundingFeeBps: number): PoolFeesParams {
  return {
    baseFee: getBaseFeeParams({
      baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
      feeTimeSchedulerParam: {
        startingFeeBps: 2500,
        endingFeeBps: 2500,
        numberOfPeriod: 0,
        totalDuration: 0,
      },
    }),
    compoundingFeeBps,
    padding: 0,
    dynamicFee: null,
  };
}

function feePosition(
  liquidity: BN,
  feeACheckpoint: BN,
  feeAPending: BN = new BN(0),
): PositionState {
  return {
    unlockedLiquidity: liquidity,
    vestedLiquidity: new BN(0),
    permanentLockedLiquidity: new BN(0),
    feeAPerTokenCheckpoint: leBytes(feeACheckpoint),
    feeBPerTokenCheckpoint: leBytes(new BN(0)),
    feeAPending,
    feeBPending: new BN(0),
    rewardInfos: [],
  } as PositionState;
}

function feePool(feeAPerLiquidity: BN): PoolState {
  return {
    feeAPerLiquidity: leBytes(feeAPerLiquidity),
    feeBPerLiquidity: leBytes(new BN(0)),
  } as PoolState;
}

function pendingReward(params: {
  poolLiquidity: BN;
  positionLiquidity: BN;
  stored: BN;
  checkpoint: BN;
  rewardRate: BN;
  lastUpdateTime: BN;
  currentTime: BN;
  pending?: BN;
  emptySeconds?: BN;
}) {
  const poolState = {
    liquidity: params.poolLiquidity,
    rewardInfos: [
      {
        initialized: 1,
        rewardDurationEnd: params.currentTime.addn(10_000),
        lastUpdateTime: params.lastUpdateTime,
        rewardRate: params.rewardRate,
        rewardPerTokenStored: leBytes(params.stored),
        cumulativeSecondsWithEmptyLiquidityReward:
          params.emptySeconds ?? new BN(0),
        deadLiquidityRewardCheckpoint: new BN(0),
      } as RewardInfo,
    ],
  } as PoolState;

  const positionState = {
    unlockedLiquidity: params.positionLiquidity,
    vestedLiquidity: new BN(0),
    permanentLockedLiquidity: new BN(0),
    rewardInfos: [
      {
        rewardPerTokenCheckpoint: leBytes(params.checkpoint),
        rewardPendings: params.pending ?? new BN(0),
      },
    ],
  } as PositionState;

  return getUserRewardPending(
    poolState,
    positionState,
    0,
    params.currentTime,
    new BN(0),
  );
}

describe("compounding fee validation", () => {
  it("accepts compounding fee bps 0", () => {
    expect(() =>
      validatePoolFees(
        staticFees(0),
        CollectFeeMode.Compounding,
        ActivationType.Timestamp,
      ),
    ).not.toThrow();
  });

  it("accepts the max compounding fee", () => {
    expect(() =>
      validatePoolFees(
        staticFees(10_000),
        CollectFeeMode.Compounding,
        ActivationType.Timestamp,
      ),
    ).not.toThrow();
  });

  it("rejects a compounding fee above the max", () => {
    expect(() =>
      validatePoolFees(
        staticFees(10_001),
        CollectFeeMode.Compounding,
        ActivationType.Timestamp,
      ),
    ).toThrow(InvalidCompoundingFeeBpsError);
  });

  it("rejects a compounding fee on a non-compounding pool", () => {
    expect(() =>
      validatePoolFees(
        staticFees(1),
        CollectFeeMode.OnlyB,
        ActivationType.Timestamp,
      ),
    ).toThrow(InvalidCompoundingFeeBpsError);
  });
});

describe("unclaimed fee", () => {
  it("credits one raw token per unit of liquidity", () => {
    const onePerLiquidity = new BN(1).shln(LIQUIDITY_SCALE);
    const position = feePosition(new BN(1_000_000), new BN(0));
    const fee = getUnClaimLpFee(feePool(onePerLiquidity), position);
    const expected = saturatingAddU64(
      position.feeAPending,
      calculatePositionFeeOrReward(
        positionLiquidity(position),
        wrappingSubU256(
          onePerLiquidity,
          readU256Le(position.feeAPerTokenCheckpoint),
        ),
        LIQUIDITY_SCALE,
      ),
    );

    expect(fee.feeTokenA.toString()).toBe("1000000");
    expect(fee.feeTokenA.eq(expected)).toBe(true);
  });

  it("rounds down a delta that is one short of a whole token", () => {
    const justUnder = new BN(1).shln(LIQUIDITY_SCALE).subn(1);
    const fee = getUnClaimLpFee(
      feePool(justUnder),
      feePosition(new BN(1), new BN(0)),
    );

    expect(fee.feeTokenA.toString()).toBe("0");
  });

  it("reads a fee delta across an accumulator wrap", () => {
    const growth = new BN(1).shln(LIQUIDITY_SCALE);
    const start = U256_MAX.sub(growth.shrn(1));
    const wrapped = wrappingAddU256(start, growth);

    const wrappedFee = getUnClaimLpFee(
      feePool(wrapped),
      feePosition(new BN(1), start),
    );
    const unwrappedFee = getUnClaimLpFee(
      feePool(growth),
      feePosition(new BN(1), new BN(0)),
    );

    expect(wrappedFee.feeTokenA.toString()).toBe("1");
    expect(wrappedFee.feeTokenA.toString()).toBe(
      unwrappedFee.feeTokenA.toString(),
    );
  });

  it("clamps a fee above u64::MAX and saturates the pending balance", () => {
    const onePerLiquidity = new BN(1).shln(LIQUIDITY_SCALE);
    const clamped = getUnClaimLpFee(
      feePool(onePerLiquidity),
      feePosition(new BN(1).shln(64), new BN(0)),
    );
    expect(clamped.feeTokenA.toString()).toBe(U64_MAX.toString());

    const saturated = getUnClaimLpFee(
      feePool(onePerLiquidity),
      feePosition(new BN(1), new BN(0), U64_MAX),
    );
    expect(saturated.feeTokenA.toString()).toBe(U64_MAX.toString());
  });
});

describe("pending reward", () => {
  it("reads a reward delta across an accumulator wrap", () => {
    const growth = new BN(1).shln(TOTAL_REWARD_SCALE);
    const start = U256_MAX.sub(growth.shrn(1));
    const wrapped = wrappingAddU256(start, growth);
    const position = {
      unlockedLiquidity: new BN(1),
      vestedLiquidity: new BN(0),
      permanentLockedLiquidity: new BN(0),
      rewardInfos: [
        {
          rewardPerTokenCheckpoint: leBytes(start),
          rewardPendings: new BN(0),
        },
      ],
    } as PositionState;

    const fromStoredWrap = pendingReward({
      poolLiquidity: new BN(1),
      positionLiquidity: new BN(1),
      stored: wrapped,
      checkpoint: start,
      rewardRate: new BN(0),
      lastUpdateTime: new BN(0),
      currentTime: new BN(0),
    });
    const fromElapsedWrap = pendingReward({
      poolLiquidity: new BN(1),
      positionLiquidity: new BN(1),
      stored: start,
      checkpoint: start,
      rewardRate: new BN(1).shln(64),
      lastUpdateTime: new BN(0),
      currentTime: new BN(1),
    });

    expect(fromStoredWrap.userPendingReward.toString()).toBe("1");
    expect(
      fromStoredWrap.userPendingReward.eq(
        pendingPositionReward(position, 0, wrapped),
      ),
    ).toBe(true);
    expect(fromElapsedWrap.userPendingReward.toString()).toBe("1");
  });

  it("clamps a reward above u64::MAX and saturates the pending balance", () => {
    const clamped = pendingReward({
      poolLiquidity: new BN(1),
      positionLiquidity: new BN(1).shln(64),
      stored: new BN(1).shln(TOTAL_REWARD_SCALE),
      checkpoint: new BN(0),
      rewardRate: new BN(0),
      lastUpdateTime: new BN(0),
      currentTime: new BN(0),
    });
    expect(clamped.userPendingReward.toString()).toBe(U64_MAX.toString());

    const saturated = pendingReward({
      poolLiquidity: new BN(1),
      positionLiquidity: new BN(1),
      stored: new BN(1).shln(TOTAL_REWARD_SCALE),
      checkpoint: new BN(0),
      rewardRate: new BN(0),
      lastUpdateTime: new BN(0),
      currentTime: new BN(0),
      pending: U64_MAX,
    });
    expect(saturated.userPendingReward.toString()).toBe(U64_MAX.toString());
  });

  it("keeps the checkpoint delta when pool liquidity is zero", () => {
    const stored = new BN(1).shln(TOTAL_REWARD_SCALE);
    const pending = pendingReward({
      poolLiquidity: new BN(0),
      positionLiquidity: new BN(1),
      stored,
      checkpoint: new BN(0),
      rewardRate: new BN(1).shln(64),
      lastUpdateTime: new BN(0),
      currentTime: new BN(10),
      pending: new BN(5),
    });

    expect(pending.userPendingReward.toString()).toBe("6");
    expect(pending.userRewardPerPeriod.toString()).toBe("0");
  });

  it("throws when a reward step does not fit in a u128", () => {
    expect(() =>
      pendingReward({
        poolLiquidity: new BN(1),
        positionLiquidity: new BN(1),
        stored: new BN(0),
        checkpoint: new BN(0),
        rewardRate: U128_MAX,
        lastUpdateTime: new BN(0),
        currentTime: new BN(2),
      }),
    ).toThrow(MathOverflowError);
  });

  it("throws when empty-liquidity reward time does not fit in a u64", () => {
    expect(() =>
      pendingReward({
        poolLiquidity: new BN(0),
        positionLiquidity: new BN(1),
        stored: new BN(0),
        checkpoint: new BN(0),
        rewardRate: new BN(0),
        lastUpdateTime: new BN(0),
        currentTime: new BN(1),
        emptySeconds: U64_MAX,
      }),
    ).toThrow(MathOverflowError);
  });

  it("throws when the reward clock moves backwards", () => {
    expect(() =>
      pendingReward({
        poolLiquidity: new BN(1),
        positionLiquidity: new BN(1),
        stored: new BN(0),
        checkpoint: new BN(0),
        rewardRate: new BN(0),
        lastUpdateTime: new BN(5),
        currentTime: new BN(1),
      }),
    ).toThrow(MathOverflowError);
  });
});

describe("unclaimed reward", () => {
  function rewardPool(params: {
    liquidity: BN;
    stored: BN;
    rewardRate: BN;
    lastUpdateTime: BN;
    rewardDurationEnd: BN;
    initialized?: number;
  }): PoolState {
    return {
      liquidity: params.liquidity,
      feeAPerLiquidity: leBytes(new BN(0)),
      feeBPerLiquidity: leBytes(new BN(0)),
      rewardInfos: [
        {
          initialized: params.initialized ?? 1,
          rewardDurationEnd: params.rewardDurationEnd,
          lastUpdateTime: params.lastUpdateTime,
          rewardRate: params.rewardRate,
          rewardPerTokenStored: leBytes(params.stored),
          cumulativeSecondsWithEmptyLiquidityReward: new BN(0),
        } as RewardInfo,
      ],
    } as PoolState;
  }

  function rewardPosition(
    liquidity: BN,
    checkpoint: BN,
    pending: BN,
  ): PositionState {
    return {
      unlockedLiquidity: liquidity,
      vestedLiquidity: new BN(0),
      permanentLockedLiquidity: new BN(0),
      feeAPerTokenCheckpoint: leBytes(new BN(0)),
      feeBPerTokenCheckpoint: leBytes(new BN(0)),
      feeAPending: new BN(0),
      feeBPending: new BN(0),
      rewardInfos: [
        {
          rewardPerTokenCheckpoint: leBytes(checkpoint),
          rewardPendings: pending,
        },
      ],
    } as PositionState;
  }

  it("projects emissions when currentTime is passed", () => {
    const pool = rewardPool({
      liquidity: new BN(1),
      stored: new BN(0),
      rewardRate: new BN(1).shln(64),
      lastUpdateTime: new BN(0),
      rewardDurationEnd: new BN(100),
    });
    const position = rewardPosition(new BN(1), new BN(0), new BN(0));

    const storedOnly = getUnClaimLpFee(pool, position);
    const projected = getUnClaimLpFee(pool, position, new BN(1));

    expect(storedOnly.rewards[0].toString()).toBe("0");
    expect(projected.rewards[0].toString()).toBe("1");
  });

  it("leaves an uninitialized reward slot at its pending balance", () => {
    const pool = rewardPool({
      liquidity: new BN(1),
      stored: new BN(1).shln(TOTAL_REWARD_SCALE),
      rewardRate: new BN(0),
      lastUpdateTime: new BN(0),
      rewardDurationEnd: new BN(100),
      initialized: 0,
    });
    const fee = getUnClaimLpFee(
      pool,
      rewardPosition(new BN(1), new BN(0), new BN(7)),
      new BN(1),
    );

    expect(fee.rewards[0].toString()).toBe("7");

    const pending = getUserRewardPending(
      pool,
      rewardPosition(new BN(1), new BN(0), new BN(7)),
      0,
      new BN(1),
      new BN(1),
    );
    expect(pending.userPendingReward.toString()).toBe("7");
    expect(pending.userRewardPerPeriod.toString()).toBe("0");
  });

  it("reports the raw reward emission when pool liquidity is zero", () => {
    const info = getRewardInfo(
      rewardPool({
        liquidity: new BN(0),
        stored: new BN(1).shln(TOTAL_REWARD_SCALE),
        rewardRate: new BN(1).shln(64),
        lastUpdateTime: new BN(0),
        rewardDurationEnd: new BN(100),
      }),
      0,
      new BN(1),
      new BN(0),
    );

    expect(info.rewardPerPeriod.toString()).toBe("1");
    expect(info.rewardBalance.toString()).toBe("100");
    expect(info.totalRewardDistributed.toString()).toBe("0");
  });
});

describe("dead liquidity quotes", () => {
  it("reads the compounding dead-liquidity reward, including a u64 wrap", () => {
    const stored = new BN(1).shln(64).addn(9).shln(128).divn(100);
    const pool = {
      collectFeeMode: CollectFeeMode.Compounding,
      liquidity: new BN(1),
      feeAPerLiquidity: leBytes(new BN(0)),
      feeBPerLiquidity: leBytes(new BN(0)),
      rewardInfos: [
        {
          initialized: 1,
          rewardDurationEnd: new BN(0),
          lastUpdateTime: new BN(0),
          rewardRate: new BN(0),
          rewardPerTokenStored: leBytes(stored),
          cumulativeSecondsWithEmptyLiquidityReward: new BN(0),
          deadLiquidityRewardCheckpoint: new BN(50),
        } as RewardInfo,
      ],
    } as PoolState;

    const reward = getDeadLiquidityReward(pool, 0, new BN(0));
    const checkpoint = mulShr256WrappingU64(
      DEAD_LIQUIDITY,
      stored,
      TOTAL_REWARD_SCALE,
    );

    expect(checkpoint.toString()).toBe(
      new BN(1).shln(64).addn(9).umod(U64_MODULUS).toString(),
    );
    expect(reward.toString()).toBe(
      wrappingSubU64(checkpoint, new BN(50)).toString(),
    );
  });

  it("returns zero for a non-compounding pool and rejects a bad index", () => {
    const pool = {
      collectFeeMode: CollectFeeMode.OnlyB,
      liquidity: new BN(1),
      rewardInfos: [
        {
          initialized: 1,
          rewardDurationEnd: new BN(0),
          lastUpdateTime: new BN(0),
          rewardRate: new BN(0),
          rewardPerTokenStored: leBytes(new BN(1).shln(128)),
          cumulativeSecondsWithEmptyLiquidityReward: new BN(0),
          deadLiquidityRewardCheckpoint: new BN(0),
        } as RewardInfo,
      ],
    } as PoolState;

    expect(getDeadLiquidityReward(pool, 0, new BN(0)).toString()).toBe("0");
    expect(() => getDeadLiquidityReward(pool, 2, new BN(0))).toThrow(
      InvalidRewardIndexError,
    );
  });
});

describe("vesting release", () => {
  function vesting(params: {
    cliffPoint: BN;
    periodFrequency: BN;
    cliffUnlockLiquidity: BN;
    liquidityPerPeriod: BN;
    numberOfPeriod: number;
    totalReleasedLiquidity: BN;
  }): VestingState {
    return { innerVesting: params } as VestingState;
  }

  it("subtracts released liquidity when the schedule has no further periods", () => {
    const available = getAvailableVestingLiquidity(
      vesting({
        cliffPoint: new BN(10),
        periodFrequency: new BN(0),
        cliffUnlockLiquidity: new BN(100),
        liquidityPerPeriod: new BN(0),
        numberOfPeriod: 0,
        totalReleasedLiquidity: new BN(40),
      }),
      new BN(10),
    );

    expect(available.toString()).toBe("60");
  });

  it("returns zero before the cliff", () => {
    const available = getAvailableVestingLiquidity(
      vesting({
        cliffPoint: new BN(10),
        periodFrequency: new BN(0),
        cliffUnlockLiquidity: new BN(100),
        liquidityPerPeriod: new BN(1),
        numberOfPeriod: 0,
        totalReleasedLiquidity: new BN(0),
      }),
      new BN(9),
    );

    expect(available.toString()).toBe("0");
  });
});
