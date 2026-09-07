import BN from "bn.js";
import { ConfigPermission, PositionDelegatePermission } from "../types";

export function encodeDelegatePermissions(
  permissions: PositionDelegatePermission[],
) {
  return permissions.reduce((acc, p) => acc | (1 << (p as number)), 0);
}

export function isConfigPermissionAllow(
  permission: BN,
  flag: ConfigPermission,
): boolean {
  return !permission.and(new BN(1).shln(flag)).isZero();
}
