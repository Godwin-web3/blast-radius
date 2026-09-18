import { isAddress, getAddress, type Address } from "viem";
import { normalize } from "viem/ens";
import { looksLikeEns } from "./format";
import type { ChainClient } from "./client";

export type ResolvedWallet = {
  query: string;
  address: Address;
  ens: string | null;
};

export class ResolveError extends Error {
  readonly code: "invalid" | "unresolved";
  constructor(code: "invalid" | "unresolved", message: string) {
    super(message);
    this.code = code;
    this.name = "ResolveError";
  }
}

export async function resolveWallet(
  client: ChainClient,
  raw: string,
): Promise<ResolvedWallet> {
  const query = raw.trim();
  if (!query) {
    throw new ResolveError("invalid", "Paste a 0x address or ENS name.");
  }

  if (isAddress(query)) {
    const address = getAddress(query);
    let ens: string | null = null;
    try {
      ens = (await client.getEnsName({ address })) ?? null;
    } catch {
      ens = null;
    }
    return { query, address, ens };
  }

  if (looksLikeEns(query)) {
    let name: string;
    try {
      name = normalize(query);
    } catch {
      throw new ResolveError("invalid", `Not a valid ENS name: ${query}`);
    }
    let address: Address | null = null;
    try {
      address = await client.getEnsAddress({ name });
    } catch {
      address = null;
    }
    if (!address) {
      throw new ResolveError("unresolved", `Could not resolve ${name}`);
    }
    return { query, address: getAddress(address), ens: name };
  }

  throw new ResolveError(
    "invalid",
    "Use a 0x Ethereum address or a .eth name.",
  );
}
