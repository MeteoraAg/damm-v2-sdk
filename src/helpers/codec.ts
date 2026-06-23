import { PositionDelegatePermission } from "../types";

export function encodeDelegatePermissions(
  permissions: PositionDelegatePermission[],
) {
  return permissions.reduce((acc, p) => acc | (1 << (p as number)), 0);
}
