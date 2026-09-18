import { ImageResponse } from "next/og";
import { getCachedScan } from "@/lib/cache";
import { ChainPathError, parseWalletPath } from "@/lib/chains";
import { posterQuote } from "@/lib/headline";
import { exposureTag } from "@/lib/format";
import { scanWallet } from "@/lib/scan";
import type { ScanResult } from "@/lib/types";

export const OG_SIZE = { width: 1200, height: 630 };

async function safeScan(query: string, chainSlug: ScanResult["chain"]): Promise<ScanResult | null> {
  const cached = getCachedScan(chainSlug, query);
  if (cached) {
    return cached;
  }
  try {
    const timeout = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 8000);
    });
    return await Promise.race([scanWallet(query, chainSlug), timeout]);
  } catch {
    return null;
  }
}

function topRows(result: ScanResult | null): Array<{ token: string; spender: string; tag: string }> {
  if (!result) {
    return [];
  }
  return result.approvals.slice(0, 3).map((a) => ({
    token: a.tokenSymbol,
    spender: a.spenderLabel,
    tag: exposureTag(a),
  }));
}

export async function renderOgCard(segments: readonly string[]): Promise<ImageResponse> {
  let chainKicker = "ETHEREUM";
  let query = segments.join("/");
  let result: ScanResult | null = null;
  let quote = posterQuote("allowance");

  try {
    const parsed = parseWalletPath(segments);
    chainKicker = parsed.chain.posterKicker;
    query = parsed.query || parsed.chain.name;
    quote = posterQuote(parsed.chain.family === "solana" ? "delegate" : "allowance");
    if (parsed.query) {
      result = await safeScan(parsed.query, parsed.chain.slug);
      if (result) {
        chainKicker = parsed.chain.posterKicker;
        quote = posterQuote(result.family === "solana" ? "delegate" : "allowance");
      }
    }
  } catch (err) {
    if (!(err instanceof ChainPathError)) {
      query = segments[segments.length - 1] ?? query;
    }
  }

  const title = result?.headline.title ?? "BLAST RADIUS";
  const ident = result?.ens ?? result?.address ?? query;
  const hex = result?.address && result.ens ? result.address : null;
  const rows = topRows(result);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, #1a0c0c 0%, #07060a 55%, #050407 100%)",
          color: "#f4ead8",
          padding: "48px 56px 42px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-40px",
            top: "-80px",
            width: "420px",
            height: "420px",
            borderRadius: "50%",
            border: "1px solid rgba(255,59,31,0.35)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "40px",
            top: "20px",
            width: "260px",
            height: "260px",
            borderRadius: "50%",
            border: "1px solid rgba(255,176,32,0.25)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "#ffb020",
              display: "flex",
            }}
          >
            BLAST RADIUS · {chainKicker}
          </div>
          <div
            style={{
              fontSize: title.length > 16 ? 72 : 108,
              lineHeight: 0.86,
              fontWeight: 800,
              letterSpacing: -3,
              textTransform: "uppercase",
              marginTop: 12,
              display: "flex",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              fontStyle: "italic",
              marginTop: 8,
              color: "#e7dcc8",
              display: "flex",
              maxWidth: 820,
            }}
          >
            “{quote}”
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.length === 0 ? (
            <div style={{ display: "flex", fontSize: 22, color: "#8f8778" }}>
              {result?.family === "solana"
                ? "Live scan for open delegates — no fabricated dollars."
                : "Live scan for open spenders — no fabricated dollars."}
            </div>
          ) : (
            rows.map((row) => (
              <div
                key={`${row.token}-${row.spender}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderTop: "1px solid rgba(244,234,216,0.14)",
                  paddingTop: 8,
                  fontSize: 22,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  width: 1080,
                }}
              >
                <div style={{ display: "flex", width: 180 }}>{row.token}</div>
                <div style={{ display: "flex", flex: 1, color: "#8f8778" }}>{row.spender}</div>
                <div style={{ display: "flex", color: "#ff3b1f", fontWeight: 700 }}>{row.tag}</div>
              </div>
            ))
          )}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 18,
              fontSize: 20,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              color: "#cfc6b6",
            }}
          >
            <div style={{ display: "flex" }}>{ident}</div>
            {hex ? <div style={{ display: "flex", fontSize: 16, color: "#8f8778" }}>{hex}</div> : null}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
