export class DepositTokenNotAcceptedError extends Error {
  public readonly acceptedToken: "A" | "B";

  constructor(acceptedToken: "A" | "B") {
    const rejectedToken = acceptedToken === "A" ? "B" : "A";
    super(
      `Cannot deposit token ${rejectedToken}: pool price is at the ${rejectedToken === "A" ? "upper" : "lower"} bound. All liquidity is in token ${acceptedToken}.`,
    );
    this.name = "DepositTokenNotAcceptedError";
    this.acceptedToken = acceptedToken;
  }
}
