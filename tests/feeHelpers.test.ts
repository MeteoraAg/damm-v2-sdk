import BN from "bn.js";
import {
  ActivationType,
  BaseFeeMode,
  bpsToFeeNumerator,
  getBaseFeeNumerator,
  getBaseFeeParams,
  getDynamicFeeNumerator,
  getDynamicFeeParams,
  parseFeeSchedulerSecondFactor,
} from "../src";
import { expect } from "chai";

describe("fee helpers function", () => {
  it("get base fee params with Linear Fee Scheduler", async () => {
    const maxBaseFee = 4000; // 40%
    const minBaseFee = 100; // 1%
    const tokenBDecimal = 9;
    const activationType = ActivationType.Timestamp;
    const baseFeeParams = getBaseFeeParams(
      {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: maxBaseFee,
          endingFeeBps: minBaseFee,
          numberOfPeriod: 120,
          totalDuration: 60,
        },
      },
      tokenBDecimal,
      activationType
    );
    const cliffFeeNumerator = bpsToFeeNumerator(maxBaseFee);
    const baseFeeNumerator = getBaseFeeNumerator(
      cliffFeeNumerator,
      baseFeeParams.firstFactor,
      parseFeeSchedulerSecondFactor(baseFeeParams.secondFactor),
      new BN(baseFeeParams.thirdFactor),
      baseFeeParams.baseFeeMode,
      new BN(120), // currentPoint
      new BN(120) // activationPoint
    );
    const minBaseFeeNumerator = bpsToFeeNumerator(minBaseFee);
    expect(minBaseFeeNumerator.toNumber()).equal(baseFeeNumerator.toNumber());
  });
  it("get base fee params with Exponential Fee Scheduler", async () => {
    const maxBaseFee = 4000; // 40%
    const minBaseFee = 100; // 1%
    const tokenBDecimal = 9;
    const activationType = ActivationType.Timestamp;
    const baseFeeParams = getBaseFeeParams(
      {
        baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
        feeSchedulerParam: {
          startingFeeBps: maxBaseFee,
          endingFeeBps: minBaseFee,
          numberOfPeriod: 120,
          totalDuration: 60,
        },
      },
      tokenBDecimal,
      activationType
    );
    const cliffFeeNumerator = bpsToFeeNumerator(maxBaseFee);
    const baseFeeNumerator = getBaseFeeNumerator(
      cliffFeeNumerator,
      baseFeeParams.firstFactor,
      parseFeeSchedulerSecondFactor(baseFeeParams.secondFactor),
      new BN(baseFeeParams.thirdFactor),
      baseFeeParams.baseFeeMode,
      new BN(120), // currentPoint
      new BN(120) // activationPoint
    );
    const minBaseFeeNumerator = bpsToFeeNumerator(minBaseFee).toNumber();
    const diff = Math.abs(minBaseFeeNumerator - baseFeeNumerator.toNumber());
    const percentDifference = (diff / minBaseFeeNumerator) * 100;
    // less than 1%.
    expect(percentDifference < 1);
  });
  it("get dynamic fee params", async () => {
    const baseFeeBps = 400; // 4%
    const dynamicFeeParams = getDynamicFeeParams(baseFeeBps);

    const maxDynamicFeeNumerator = getDynamicFeeNumerator(
      new BN(dynamicFeeParams.maxVolatilityAccumulator),
      new BN(dynamicFeeParams.binStep),
      new BN(dynamicFeeParams.variableFeeControl)
    ).toNumber();

    const expectDynamicFeeNumberator = bpsToFeeNumerator(baseFeeBps)
      .muln(20)
      .divn(100)
      .toNumber(); // 20% base fee

    const diff = expectDynamicFeeNumberator - maxDynamicFeeNumerator;
    const percentDifference = (diff / expectDynamicFeeNumberator) * 100;

    // less than 1%. Approximate by rounding
    expect(percentDifference < 0.1);
  });

  it("get dynamic fee params with price change = 10%", async () => {
    const baseFeeBps = 400; // 4%
    const dynamicFeeParams = getDynamicFeeParams(baseFeeBps, 1000);

    const maxDynamicFeeNumerator = getDynamicFeeNumerator(
      new BN(dynamicFeeParams.maxVolatilityAccumulator),
      new BN(dynamicFeeParams.binStep),
      new BN(dynamicFeeParams.variableFeeControl)
    ).toNumber();

    const expectDynamicFeeNumberator = bpsToFeeNumerator(baseFeeBps)
      .muln(20)
      .divn(100)
      .toNumber(); // 20% base fee

    const diff = expectDynamicFeeNumberator - maxDynamicFeeNumerator;
    const percentDifference = (diff / expectDynamicFeeNumberator) * 100;

    // less than 0.1%. Approximate by rounding
    expect(percentDifference < 0.1);
  });
});
