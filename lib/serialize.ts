import type { OpenApproval, ScanResult } from "./types";

export type SerializedApproval = Omit<
  OpenApproval,
  "allowance" | "balance" | "movable"
> & {
  allowance: string;
  balance: string;
  movable: string;
};

export type SerializedScan = Omit<ScanResult, "approvals"> & {
  approvals: SerializedApproval[];
};

export function serializeScan(result: ScanResult): SerializedScan {
  return {
    ...result,
    approvals: result.approvals.map((a) => ({
      ...a,
      allowance: a.allowance.toString(),
      balance: a.balance.toString(),
      movable: a.movable.toString(),
    })),
  };
}

export function deserializeScan(raw: SerializedScan): ScanResult {
  return {
    ...raw,
    approvals: raw.approvals.map((a) => ({
      ...a,
      allowance: BigInt(a.allowance),
      balance: BigInt(a.balance),
      movable: BigInt(a.movable),
    })),
  };
}
