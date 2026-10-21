import { getAddress, parseAbi, type Address, type Hex } from "viem";
import type { EvmChain } from "./chains";
import { ETHERSCAN_V2, type ChainClient } from "./client";
import { isZeroAddress } from "./format";
import { PERMIT2 } from "./known";
import { withTimeout } from "./timeout";

/**
 * Spender control profile.
 *
 * The question Blast Radius actually cares about is not "how big is the
 * allowance" but "how easily can the thing holding it turn hostile?".
 * A max approval to an immutable, ownerless router is a very different
 * risk from the same approval to an upgradeable proxy whose admin is a
 * single EOA with no delay.
 *
 * Everything here is read live from chain state (EIP-1967 / EIP-1822 /
 * EIP-1167 / EIP-7702 patterns, owner(), Safe getThreshold(), Timelock
 * getMinDelay()). Nothing is guessed: when a read fails the profile says
 * "unknown", never "safe".
 */

export type ControllerKind = "eoa" | "safe" | "timelock" | "contract" | "unknown";

export type Controller = {
  address: Address;
  kind: ControllerKind;
  /** Safe: signatures required. */
  threshold?: number;
  /** Safe: number of owners. */
  owners?: number;
  /** Timelock: minimum delay in seconds. */
  minDelaySec?: number;
  /** When the direct controller was a ProxyAdmin-style contract, its owner. */
  via?: Address;
};

export type ControlGrade = "A" | "B" | "C" | "D" | "F" | "?";

export type SpenderControl = {
  address: Address;
  /** "eoa" spender, "eoa-7702" delegated EOA, or contract shapes. */
  shape: "eoa" | "eoa-7702" | "immutable" | "upgradeable" | "clone" | "unknown";
  implementation: Address | null;
  /** Who can change code (upgradeable) or call privileged functions (owned). */
  controller: Controller | null;
  controllerRole: "upgrade" | "owner" | "key" | null;
  /** Etherscan-verified source. null when no key / lookup failed. */
  verified: boolean | null;
  /** 0 (fixed, ownerless code) .. 1 (one private key away from draining). */
  hostility: number;
  grade: ControlGrade;
  /** One line a human can read: "One EOA can swap the code, no delay". */
  summary: string;
  flags: string[];
};

const IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as Hex;
const ADMIN_SLOT =
  "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103" as Hex;
const BEACON_SLOT =
  "0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50" as Hex;
/** Legacy ZeppelinOS slots (USDC's FiatTokenProxy and other 2018-era proxies). */
const ZOS_IMPL_SLOT =
  "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3" as Hex;
const ZOS_ADMIN_SLOT =
  "0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b" as Hex;
/** EIP-1822 (UUPS, pre-1967) proxiable slot: keccak256("PROXIABLE"). */
const PROXIABLE_SLOT =
  "0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7" as Hex;

const OWNABLE_ABI = parseAbi(["function owner() view returns (address)"]);
const ADMIN_ABI = parseAbi(["function admin() view returns (address)"]);
const BEACON_ABI = parseAbi(["function implementation() view returns (address)"]);
const SAFE_ABI = parseAbi([
  "function getThreshold() view returns (uint256)",
  "function getOwners() view returns (address[])",
]);
const OZ_TIMELOCK_ABI = parseAbi(["function getMinDelay() view returns (uint256)"]);
const COMPOUND_TIMELOCK_ABI = parseAbi(["function delay() view returns (uint256)"]);

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: SpenderControl }>();

function cacheKey(chain: EvmChain, address: Address): string {
  return `${chain.slug}:${address.toLowerCase()}`;
}

/** Extract an address from a 32-byte storage word, or null when empty. */
export function slotToAddress(word: Hex | undefined | null): Address | null {
  if (!word || word === "0x") {
    return null;
  }
  const hex = word.replace(/^0x/, "").padStart(64, "0");
  const tail = `0x${hex.slice(24)}` as Address;
  if (/^0x0{40}$/i.test(tail)) {
    return null;
  }
  try {
    return getAddress(tail);
  } catch {
    return null;
  }
}

/** EIP-7702 delegation designator: 0xef0100 || address. */
export function parse7702(code: Hex | undefined): Address | null {
  if (!code) {
    return null;
  }
  const c = code.toLowerCase();
  if (c.startsWith("0xef0100") && c.length === 2 + 46) {
    try {
      return getAddress(`0x${c.slice(8)}`);
    } catch {
      return null;
    }
  }
  return null;
}

/** EIP-1167 minimal proxy: 363d3d373d3d3d363d73 <impl> 5af43d82803e903d91602b57fd5bf3 */
export function parse1167(code: Hex | undefined): Address | null {
  if (!code) {
    return null;
  }
  const c = code.toLowerCase().replace(/^0x/, "");
  const prefix = "363d3d373d3d3d363d73";
  const suffix = "5af43d82803e903d91602b57fd5bf3";
  if (c.startsWith(prefix) && c.length === prefix.length + 40 + suffix.length && c.endsWith(suffix)) {
    try {
      return getAddress(`0x${c.slice(prefix.length, prefix.length + 40)}`);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Heuristic: a small runtime (< 600 bytes) containing a DELEGATECALL opcode
 * is almost always a forwarding proxy. Walks opcodes so PUSH data is skipped.
 */
export function looksLikeCustomProxy(code: Hex): boolean {
  const hex = code.replace(/^0x/, "");
  const bytes = hex.length / 2;
  if (bytes === 0 || bytes > 600) return false;
  for (let i = 0; i < bytes; i++) {
    const op = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (op === 0xf4) return true;
    if (op >= 0x60 && op <= 0x7f) i += op - 0x5f;
  }
  return false;
}

async function safeRead<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await withTimeout(fn(), 4_000, "control read");
  } catch {
    return null;
  }
}

async function readAddress(
  client: ChainClient,
  address: Address,
  abi: typeof OWNABLE_ABI | typeof ADMIN_ABI | typeof BEACON_ABI,
  functionName: "owner" | "admin" | "implementation",
): Promise<Address | null> {
  const v = await safeRead(() =>
    client.readContract({ address, abi, functionName } as never) as Promise<Address>,
  );
  if (!v || isZeroAddress(v)) {
    return null;
  }
  try {
    return getAddress(v);
  } catch {
    return null;
  }
}

async function getCode(client: ChainClient, address: Address): Promise<Hex | null | undefined> {
  // undefined = read failed, null/"0x" = no code
  try {
    const code = await withTimeout(client.getCode({ address }), 4_000, "getCode");
    return code ?? null;
  } catch {
    return undefined;
  }
}

async function classifyController(
  client: ChainClient,
  address: Address,
  depth = 0,
): Promise<Controller> {
  const code = await getCode(client, address);
  if (code === undefined) {
    return { address, kind: "unknown" };
  }
  if (!code || code === "0x" || parse7702(code)) {
    return { address, kind: "eoa" };
  }

  const [threshold, owners] = await Promise.all([
    safeRead(() =>
      client.readContract({ address, abi: SAFE_ABI, functionName: "getThreshold" }),
    ),
    safeRead(() =>
      client.readContract({ address, abi: SAFE_ABI, functionName: "getOwners" }),
    ),
  ]);
  if (threshold != null && Array.isArray(owners) && owners.length > 0) {
    return {
      address,
      kind: "safe",
      threshold: Number(threshold),
      owners: owners.length,
    };
  }

  const ozDelay = await safeRead(() =>
    client.readContract({ address, abi: OZ_TIMELOCK_ABI, functionName: "getMinDelay" }),
  );
  const delay =
    ozDelay ??
    (await safeRead(() =>
      client.readContract({ address, abi: COMPOUND_TIMELOCK_ABI, functionName: "delay" }),
    ));
  if (delay != null) {
    return { address, kind: "timelock", minDelaySec: Number(delay) };
  }

  // ProxyAdmin-style contract: follow its owner one hop.
  if (depth === 0) {
    const owner = await readAddress(client, address, OWNABLE_ABI, "owner");
    if (owner) {
      const inner = await classifyController(client, owner, depth + 1);
      return { ...inner, via: address };
    }
  }
  return { address, kind: "contract" };
}

function fmtDelay(sec: number): string {
  if (sec <= 0) return "no delay";
  if (sec < 3600) return `${Math.round(sec / 60)} min delay`;
  if (sec < 86_400) return `${Math.round(sec / 3600)} h delay`;
  return `${Math.round(sec / 86_400)} day delay`;
}

/** How dangerous is it that `controller` holds this power? 0..1 */
export function controllerHostility(c: Controller | null, role: "upgrade" | "owner"): number {
  const upgrade = role === "upgrade";
  if (!c) {
    return upgrade ? 0.7 : 0.1;
  }
  switch (c.kind) {
    case "eoa":
      return upgrade ? 0.95 : 0.45;
    case "safe": {
      const t = c.threshold ?? 1;
      if (t <= 1) return upgrade ? 0.9 : 0.4;
      if (t === 2) return upgrade ? 0.6 : 0.3;
      return upgrade ? 0.45 : 0.2;
    }
    case "timelock": {
      const d = c.minDelaySec ?? 0;
      if (d < 86_400) return upgrade ? 0.5 : 0.25;
      if (d < 7 * 86_400) return upgrade ? 0.3 : 0.15;
      return upgrade ? 0.2 : 0.1;
    }
    case "contract":
      return upgrade ? 0.6 : 0.3;
    default:
      return upgrade ? 0.7 : 0.35;
  }
}

export function gradeFor(hostility: number, known: boolean): ControlGrade {
  if (!known) return "?";
  if (hostility >= 0.85) return "F";
  if (hostility >= 0.55) return "D";
  if (hostility >= 0.35) return "C";
  if (hostility >= 0.2) return "B";
  return "A";
}

function describeController(c: Controller): string {
  const via = c.via ? " (via ProxyAdmin)" : "";
  switch (c.kind) {
    case "eoa":
      return `one EOA${via}`;
    case "safe":
      return `a ${c.threshold}-of-${c.owners} Safe${via}`;
    case "timelock":
      return `a timelock, ${fmtDelay(c.minDelaySec ?? 0)}${via}`;
    case "contract":
      return `an unrecognised contract${via}`;
    default:
      return `an unreadable controller${via}`;
  }
}

/** Pure assembly of a profile from already-read facts. Exported for tests. */
export function buildProfile(input: {
  address: Address;
  shape: SpenderControl["shape"];
  implementation: Address | null;
  controller: Controller | null;
  controllerRole: SpenderControl["controllerRole"];
  verified: boolean | null;
  isPermit2?: boolean;
  /** Small contract that DELEGATECALLs but matched no known proxy slot. */
  customProxy?: boolean;
}): SpenderControl {
  const flags: string[] = [];
  let hostility: number;
  let summary: string;
  let known = true;

  switch (input.shape) {
    case "eoa":
      hostility = 1;
      summary = "Plain wallet. One private key can move everything approved.";
      flags.push("eoa-spender");
      break;
    case "eoa-7702":
      hostility = 1;
      summary = "EIP-7702 delegated wallet. Its key can re-point the code at will.";
      flags.push("eoa-spender", "7702");
      break;
    case "upgradeable": {
      hostility = controllerHostility(input.controller, "upgrade");
      summary = input.controller
        ? `Upgradeable. ${cap(describeController(input.controller))} can swap the code.`
        : "Upgradeable, but the upgrade admin could not be read.";
      flags.push("upgradeable");
      if (!input.controller || input.controller.kind === "unknown") known = false;
      break;
    }
    case "clone":
      hostility = input.controller
        ? controllerHostility(input.controller, input.controllerRole === "upgrade" ? "upgrade" : "owner")
        : 0.15;
      summary = input.controller
        ? `Minimal clone; ${describeController(input.controller)} holds ${input.controllerRole === "upgrade" ? "upgrade" : "owner"} rights.`
        : "Minimal clone of fixed code, no owner found.";
      flags.push("clone");
      break;
    case "immutable":
      if (input.controller) {
        hostility = controllerHostility(input.controller, "owner");
        summary = `No standard upgrade path, but ${describeController(input.controller)} owns its admin functions.`;
        flags.push("owned");
      } else {
        hostility = 0.08;
        summary = "No standard upgrade path and no owner() found.";
      }
      break;
    default:
      hostility = 0.6;
      summary = "Could not read this spender's code.";
      known = false;
  }

  if (input.customProxy && input.shape === "immutable") {
    hostility = Math.max(hostility, 0.6);
    known = false;
    flags.push("custom-proxy");
    summary = "Delegates its logic through a non-standard proxy; who can upgrade it could not be read.";
  }

  if (input.verified === false && input.shape !== "eoa" && input.shape !== "eoa-7702") {
    hostility = Math.min(1, hostility + 0.15);
    flags.push("unverified");
    summary += " Source is not verified.";
  }

  if (input.isPermit2) {
    flags.push("permit2");
    summary +=
      " Permit2 itself is ownerless, but anyone you sign a permit for can pull through it (sub-approvals listed separately).";
  }

  return {
    address: input.address,
    shape: input.shape,
    implementation: input.implementation,
    controller: input.controller,
    controllerRole: input.controllerRole,
    verified: input.verified,
    hostility: round2(hostility),
    grade: gradeFor(hostility, known),
    summary,
    flags,
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function etherscanVerified(chain: EvmChain, address: Address): Promise<boolean | null> {
  const key = process.env.ETHERSCAN_API_KEY?.trim();
  if (!key) {
    return null;
  }
  try {
    const url = new URL(ETHERSCAN_V2);
    url.searchParams.set("chainid", chain.etherscanChainId);
    url.searchParams.set("module", "contract");
    url.searchParams.set("action", "getsourcecode");
    url.searchParams.set("address", address);
    url.searchParams.set("apikey", key);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: Array<{ SourceCode?: string }> };
    const row = Array.isArray(json.result) ? json.result[0] : undefined;
    if (!row) return null;
    return Boolean(row.SourceCode && row.SourceCode.length > 0);
  } catch {
    return null;
  }
}

export async function profileSpender(
  client: ChainClient,
  chain: EvmChain,
  spender: Address,
): Promise<SpenderControl> {
  const key = cacheKey(chain, spender);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.value;
  }

  const isPermit2 = spender.toLowerCase() === PERMIT2.toLowerCase();
  const code = await getCode(client, spender);
  let profile: SpenderControl;

  if (code === undefined) {
    profile = buildProfile({
      address: spender,
      shape: "unknown",
      implementation: null,
      controller: null,
      controllerRole: null,
      verified: null,
    });
  } else if (!code || code === "0x") {
    profile = buildProfile({
      address: spender,
      shape: "eoa",
      implementation: null,
      controller: { address: spender, kind: "eoa" },
      controllerRole: "key",
      verified: null,
    });
  } else if (parse7702(code)) {
    profile = buildProfile({
      address: spender,
      shape: "eoa-7702",
      implementation: parse7702(code),
      controller: { address: spender, kind: "eoa" },
      controllerRole: "key",
      verified: null,
    });
  } else {
    const cloneImpl = parse1167(code);
    const read = (slot: Hex) => safeRead(() => client.getStorageAt({ address: spender, slot }));
    const [implWord, adminWord, beaconWord, proxiableWord, zosImplWord, zosAdminWord, verified] =
      await Promise.all([
        read(IMPL_SLOT),
        read(ADMIN_SLOT),
        read(BEACON_SLOT),
        read(PROXIABLE_SLOT),
        read(ZOS_IMPL_SLOT),
        read(ZOS_ADMIN_SLOT),
        etherscanVerified(chain, spender),
      ]);
    const impl =
      slotToAddress(implWord) ?? slotToAddress(proxiableWord) ?? slotToAddress(zosImplWord);
    const admin = slotToAddress(adminWord) ?? slotToAddress(zosAdminWord);
    const beacon = slotToAddress(beaconWord);

    if (impl || beacon) {
      // Transparent proxy: admin slot. UUPS: owner() on the proxy.
      // Beacon: owner() on the beacon.
      let controllerAddr: Address | null = admin;
      let implementation = impl;
      if (!controllerAddr && beacon) {
        controllerAddr = await readAddress(client, beacon, OWNABLE_ABI, "owner");
        implementation =
          implementation ?? (await readAddress(client, beacon, BEACON_ABI, "implementation"));
      }
      if (!controllerAddr) {
        controllerAddr =
          (await readAddress(client, spender, OWNABLE_ABI, "owner")) ??
          (await readAddress(client, spender, ADMIN_ABI, "admin"));
      }
      const controller = controllerAddr ? await classifyController(client, controllerAddr) : null;
      profile = buildProfile({
        address: spender,
        shape: "upgradeable",
        implementation,
        controller,
        controllerRole: "upgrade",
        verified,
        isPermit2,
      });
      if (beacon) profile.flags.push("beacon");
    } else {
      const owner = await readAddress(client, spender, OWNABLE_ABI, "owner");
      const controller = owner ? await classifyController(client, owner) : null;
      profile = buildProfile({
        address: spender,
        shape: cloneImpl ? "clone" : "immutable",
        implementation: cloneImpl,
        controller,
        controllerRole: controller ? "owner" : null,
        verified,
        isPermit2,
        customProxy: !cloneImpl && looksLikeCustomProxy(code),
      });
    }
  }

  cache.set(key, { at: Date.now(), value: profile });
  return profile;
}

/**
 * Profile many spenders with bounded concurrency and a time budget.
 * Spenders past the budget come back missing (shown as unknown, not safe).
 */
export async function profileSpenders(
  client: ChainClient,
  chain: EvmChain,
  spenders: readonly Address[],
  options: { concurrency?: number; budgetMs?: number; max?: number } = {},
): Promise<Map<string, SpenderControl>> {
  const out = new Map<string, SpenderControl>();
  const unique = [...new Map(spenders.map((s) => [s.toLowerCase(), s])).values()].slice(
    0,
    options.max ?? 40,
  );
  const started = Date.now();
  const budget = options.budgetMs ?? 12_000;
  let cursor = 0;
  const worker = async () => {
    while (cursor < unique.length) {
      if (Date.now() - started > budget) return;
      const s = unique[cursor];
      cursor += 1;
      if (!s) continue;
      const p = await profileSpender(client, chain, s).catch(() => null);
      if (p) out.set(s.toLowerCase(), p);
    }
  };
  await Promise.all(Array.from({ length: options.concurrency ?? 6 }, () => worker()));
  return out;
}
