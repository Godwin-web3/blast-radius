import { describe, expect, it } from "vitest";
import {
  decodeBase58,
  isSolanaAddress,
  truncatePubkey,
} from "@/lib/solana/address";
import {
  MAX_U64,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@/lib/solana/constants";
import { knownSplToken, labelDelegate } from "@/lib/solana/known";
import {
  collectDelegateExposures,
  displayMintSymbol,
  extractTokenAccount,
  isUnlimitedDelegatedAmount,
  movableDelegateAmount,
  parseMintMetadata,
  parsePermanentDelegate,
  parseTokenAmount,
  toDelegateExposure,
} from "@/lib/solana/parse";
import { rankApprovals, riskScore } from "@/lib/ranking";
import { buildHeadline } from "@/lib/headline";
import type { OpenApproval, RankableApproval } from "@/lib/types";
import { resolveSolanaWallet } from "@/lib/solana/scan";
import { ResolveError } from "@/lib/resolve";

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const OWNER = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const DELEGATE = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const ATA = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const OTHER = "So11111111111111111111111111111111111111112";

function jsonParsedAccount(info: Record<string, unknown>, pubkey = ATA, programId = TOKEN_PROGRAM_ID) {
  return {
    pubkey,
    account: {
      owner: programId,
      data: {
        program: programId === TOKEN_2022_PROGRAM_ID ? "spl-token-2022" : "spl-token",
        parsed: {
          info,
          type: "account",
        },
      },
    },
  };
}

describe("Solana address", () => {
  it("accepts well-known 32-byte pubkeys", () => {
    expect(isSolanaAddress(TOKEN_PROGRAM_ID)).toBe(true);
    expect(decodeBase58(TOKEN_PROGRAM_ID)?.length).toBe(32);
    expect(isSolanaAddress(TOKEN_2022_PROGRAM_ID)).toBe(true);
    expect(isSolanaAddress(USDC)).toBe(true);
    expect(isSolanaAddress("11111111111111111111111111111111")).toBe(true);
    const zeros = decodeBase58("11111111111111111111111111111111");
    expect(zeros).not.toBeNull();
    expect(zeros?.length).toBe(32);
    expect([...zeros!].every((b) => b === 0)).toBe(true);
  });

  it("rejects EVM, ENS, and junk", () => {
    expect(isSolanaAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe(false);
    expect(isSolanaAddress("vitalik.eth")).toBe(false);
    expect(isSolanaAddress("short")).toBe(false);
    expect(isSolanaAddress("0OIl" + "1".repeat(40))).toBe(false);
  });

  it("truncates pubkeys without a 0x prefix", () => {
    expect(truncatePubkey(USDC, 4)).toBe("EPjF…Dt1v");
  });
});

describe("resolveSolanaWallet", () => {
  it("accepts base58 and rejects EVM/ENS", () => {
    expect(resolveSolanaWallet(`  ${USDC}  `)).toBe(USDC);
    expect(() => resolveSolanaWallet("vitalik.eth")).toThrow(ResolveError);
    expect(() => resolveSolanaWallet("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toThrow(
      /EVM/,
    );
    expect(() => resolveSolanaWallet("not-an-address")).toThrow(/base58/);
  });
});

describe("token-account parsing", () => {
  it("parses jsonParsed amounts including nested delegatedAmount", () => {
    expect(parseTokenAmount({ amount: "1500000", decimals: 6 })).toBe(1_500_000n);
    expect(parseTokenAmount("42")).toBe(42n);
    expect(parseTokenAmount("nope")).toBe(0n);
  });

  it("surfaces only non-null delegates with delegatedAmount > 0", () => {
    const live = jsonParsedAccount({
      mint: USDC,
      owner: OWNER,
      state: "initialized",
      tokenAmount: { amount: "1000000", decimals: 6 },
      delegate: DELEGATE,
      delegatedAmount: { amount: "250000", decimals: 6 },
    });
    const none = jsonParsedAccount(
      {
        mint: USDC,
        owner: OWNER,
        state: "initialized",
        tokenAmount: { amount: "1000000", decimals: 6 },
      },
      OTHER,
    );
    const zero = jsonParsedAccount(
      {
        mint: USDC,
        owner: OWNER,
        state: "initialized",
        tokenAmount: { amount: "1000000", decimals: 6 },
        delegate: DELEGATE,
        delegatedAmount: { amount: "0", decimals: 6 },
      },
      "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    );

    const extracted = extractTokenAccount(live);
    expect(extracted?.delegate).toBe(DELEGATE);
    expect(extracted?.delegatedAmount).toBe(250_000n);
    expect(toDelegateExposure(extracted!)?.delegate).toBe(DELEGATE);

    const rows = collectDelegateExposures([live, none, zero]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.mint).toBe(USDC);
    expect(rows[0]?.delegatedAmount).toBe(250_000n);
    expect(rows[0]?.unlimited).toBe(false);
  });

  it("treats u64::MAX as unlimited-ish and caps movable at the balance", () => {
    expect(isUnlimitedDelegatedAmount(MAX_U64)).toBe(true);
    expect(isUnlimitedDelegatedAmount(MAX_U64 - 1n)).toBe(false);
    expect(movableDelegateAmount(MAX_U64, 99n)).toBe(99n);
    expect(movableDelegateAmount(50n, 80n)).toBe(50n);
    expect(movableDelegateAmount(90n, 80n)).toBe(80n);
    expect(movableDelegateAmount(MAX_U64, 10n, true)).toBe(0n);
  });

  it("keeps frozen accounts in the list but movable is 0", () => {
    const frozen = jsonParsedAccount({
      mint: USDC,
      owner: OWNER,
      state: "frozen",
      tokenAmount: { amount: "5000", decimals: 6 },
      delegate: DELEGATE,
      delegatedAmount: { amount: "5000", decimals: 6 },
    });
    const row = collectDelegateExposures([frozen])[0];
    expect(row?.frozen).toBe(true);
    expect(movableDelegateAmount(row!.delegatedAmount, row!.balance, row!.frozen)).toBe(0n);
  });

  it("does not treat the owner as a delegate of themselves", () => {
    const self = jsonParsedAccount({
      mint: USDC,
      owner: OWNER,
      tokenAmount: { amount: "1", decimals: 6 },
      delegate: OWNER,
      delegatedAmount: { amount: "1", decimals: 6 },
    });
    expect(collectDelegateExposures([self])).toHaveLength(0);
  });
});

describe("Token-2022 mint extensions", () => {
  it("reads a permanent delegate from mint jsonParsed extensions", () => {
    const mint = {
      parsed: {
        info: {
          decimals: 6,
          extensions: [
            {
              extension: "permanentDelegate",
              state: { delegate: DELEGATE },
            },
            {
              extension: "tokenMetadata",
              state: { name: "USD Coin", symbol: "USDC" },
            },
          ],
        },
      },
    };
    expect(parsePermanentDelegate(mint)).toBe(DELEGATE);
    const meta = parseMintMetadata(mint);
    expect(meta.symbol).toBe("USDC");
    expect(meta.name).toBe("USD Coin");
    expect(meta.permanentDelegate).toBe(DELEGATE);
  });

  it("ignores freeze/mint authorities as if they were movers", () => {
    const mint = {
      parsed: {
        info: {
          decimals: 6,
          freezeAuthority: OWNER,
          mintAuthority: OWNER,
          extensions: [],
        },
      },
    };
    expect(parsePermanentDelegate(mint)).toBeNull();
  });
});

describe("symbol fallback", () => {
  it("uses known mints, otherwise truncates", () => {
    expect(knownSplToken(USDC)?.symbol).toBe("USDC");
    expect(displayMintSymbol(USDC, "USDC")).toBe("USDC");
    expect(displayMintSymbol(USDC, null)).toBe("EPjF…Dt1v");
    expect(labelDelegate(DELEGATE)).toMatch(/Jupiter/);
    expect(labelDelegate(OWNER)).toContain("…");
  });
});

describe("Solana ranking / headline", () => {
  function item(partial: Partial<RankableApproval> & Pick<RankableApproval, "id">): RankableApproval {
    return {
      kind: "spl-delegate",
      unlimited: false,
      movable: 0n,
      balance: 0n,
      decimals: 6,
      usdMovable: null,
      ...partial,
    };
  }

  it("ranks live unlimited SPL delegates like live unlimited ERC-20", () => {
    const live = item({
      id: "live",
      unlimited: true,
      movable: 1_000_000n,
      balance: 1_000_000n,
      usdMovable: 1,
    });
    const limited = item({
      id: "limited",
      movable: 500_000n,
      balance: 500_000n,
      usdMovable: 0.5,
    });
    expect(rankApprovals([limited, live]).map((r) => r.id)).toEqual(["live", "limited"]);
    expect(riskScore(live)).toBeGreaterThan(riskScore(limited));
  });

  it("headlines OPEN DELEGATES without inventing USD", () => {
    const approval = (id: string): OpenApproval => ({
      id,
      kind: "spl-delegate",
      token: USDC,
      tokenSymbol: "USDC",
      tokenName: "USD Coin",
      decimals: 6,
      spender: DELEGATE,
      spenderLabel: "Jupiter",
      allowance: 100n,
      balance: 100n,
      movable: 100n,
      unlimited: false,
      usdMovable: null,
      usdPrice: null,
    });
    const h = buildHeadline([approval("a"), approval("b")], { noun: "delegate" });
    expect(h.hasUsd).toBe(false);
    expect(h.title).toBe("2 OPEN DELEGATES");
    expect(h.title.includes("$")).toBe(false);
  });
});
