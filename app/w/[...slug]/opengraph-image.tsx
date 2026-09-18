import { ImageResponse } from "next/og";
import { getCachedScan } from "@/lib/cache";
import { ChainPathError, parseWalletPath } from "@/lib/chains";
import { POSTER_QUOTE } from "@/lib/headline";
import { scanWallet } from "@/lib/scan";
import type { ScanResult } from "@/lib/types";

export const runtime = "nodejs";
export const alt = "Blast Radius share card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const maxDuration = 30;

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
    tag: a.unlimited || a.kind === "erc721-for-all" ? "UNLIMITED" : "LIMITED",
  }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  let chainKicker = "ETHEREUM";
  let query = slug.join("/");
  let result: ScanResult | null = null;

  try {
    const parsed = parseWalletPath(slug);
    chainKicker = parsed.chain.posterKicker;
    query = parsed.query || parsed.chain.name;
    if (parsed.query) {
      result = await safeScan(parsed.query, parsed.chain.slug);
      if (result) {
        chainKicker = parsed.chain.posterKicker;
      }
    }
  } catch (err) {
    if (!(err instanceof ChainPathError)) {
      query = slug[slug.length - 1] ?? query;
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
            “{POSTER_QUOTE}”
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.length === 0 ? (
            <div style={{ display: "flex", fontSize: 22, color: "#8f8778" }}>
              Live scan for open spenders — no fabricated dollars.
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
    { ...size },
  );
}
