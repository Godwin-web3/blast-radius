import { isUnlimitedAllowance } from "./unlimited";
import { isSplKind, type OpenApproval } from "./types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function shortAddress(address: string, size = 4): string {
  const a = address.trim();
  if (a.length < 10) {
    return a;
  }
  if (a.startsWith("0x") || a.startsWith("0X")) {
    return `${a.slice(0, 2 + size)}…${a.slice(-size)}`;
  }
  return `${a.slice(0, size)}…${a.slice(-size)}`;
}

export function isZeroAddress(address: string): boolean {
  return address.toLowerCase() === ZERO_ADDRESS;
}

export function formatUnits(amount: bigint, decimals: number, maxFrac = 4): string {
  if (amount === 0n) {
    return "0";
  }
  const d = Math.max(0, Math.min(36, decimals));
  const neg = amount < 0n;
  const value = neg ? -amount : amount;
  const base = 10n ** BigInt(d);
  const whole = value / base;
  const frac = value % base;
  let fracStr = frac.toString().padStart(d, "0").slice(0, maxFrac);
  fracStr = fracStr.replace(/0+$/, "");
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = neg ? "-" : "";
  if (!fracStr) {
    return `${sign}${wholeStr}`;
  }
  return `${sign}${wholeStr}.${fracStr}`;
}

export function formatAllowance(allowance: bigint, decimals: number): string {
  if (isUnlimitedAllowance(allowance)) {
    return "UNLIMITED";
  }
  return formatUnits(allowance, decimals);
}

/** Poster/table tag: Solana shows amount or UNLIMITED, EVM shows UNLIMITED/LIMITED. */
export function exposureTag(approval: Pick<OpenApproval, "kind" | "unlimited" | "allowance" | "decimals">): string {
  if (approval.kind === "erc721-for-all" || approval.unlimited) {
    return "UNLIMITED";
  }
  if (isSplKind(approval.kind)) {
    return formatUnits(approval.allowance, approval.decimals);
  }
  return "LIMITED";
}

export function padTopicAddress(address: string): `0x${string}` {
  const hex = address.toLowerCase().replace(/^0x/, "");
  return `0x${hex.padStart(64, "0")}` as `0x${string}`;
}

export function topicToAddress(topic: string): `0x${string}` {
  const hex = topic.toLowerCase().replace(/^0x/, "");
  return `0x${hex.slice(-40)}` as `0x${string}`;
}

export function looksLikeEns(input: string): boolean {
  const s = input.trim().toLowerCase();
  return s.endsWith(".eth") && s.length > 4 && !s.includes(" ");
}

export function looksLikeAddress(input: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(input.trim());
}
