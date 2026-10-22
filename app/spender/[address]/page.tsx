import { IndexNote } from "@/components/IndexNote";
import { SiteFooter } from "@/components/SiteFooter";
import { CHAINS, walletPath } from "@/lib/chains";
import { formatUsdCompact } from "@/lib/headline";
import { indexUrl, type IndexedSpender } from "@/lib/spender-index";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 900;

type Props = { params: Promise<{ address: string }> };

async function loadDetail(address: string): Promise<IndexedSpender | null> {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return null;
  const url = indexUrl().replace(/index\.json$/, `spenders/${address.toLowerCase()}.json`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), next: { revalidate: 900 } } as RequestInit);
    return res.ok ? ((await res.json()) as IndexedSpender) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await loadDetail((await params).address);
  return s
    ? {
        title: `${s.label}: ${formatUsdCompact(s.movableUsd)} movable`,
        description: `${s.label} can move ${formatUsdCompact(s.movableUsd)} from ${s.wallets.toLocaleString("en-US")} wallets right now. Grade ${s.grade}: ${s.summary}`,
      }
    : { title: "Spender · Blast Radius" };
}

export default async function SpenderPage({ params }: Props) {
  const s = await loadDetail((await params).address);
  if (!s) notFound();
  const addr = CHAINS.ethereum.explorer.addressUrl;
  const deadShare = s.eventNonzeroPairs ? 1 - s.livePairs / s.eventNonzeroPairs : 0;

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Blast Radius
        </Link>
        <nav>
          <Link href="/spenders">all spenders</Link>
        </nav>
      </header>

      <section className="poster" style={{ marginTop: 24 }}>
        <div className="poster-kicker">
          {s.label} · grade <span className={`grade grade-${s.grade === "?" ? "unknown" : s.grade.toLowerCase()}`}>{s.grade}</span>
        </div>
        <h1 className="display" style={{ fontSize: "clamp(44px, 9vw, 96px)" }}>
          {formatUsdCompact(s.movableUsd)}
        </h1>
        <p className="lede">
          movable right now from {s.wallets.toLocaleString("en-US")} wallets ({s.unlimitedLivePairs.toLocaleString("en-US")} unlimited
          approvals). {s.summary}
        </p>
        {s.controller ? (
          <p className="muted">
            Key holder:{" "}
            <a href={addr(s.controller.address)} target="_blank" rel="noreferrer">
              {s.controller.label ?? s.controller.kind} · {s.controller.address.slice(0, 8)}…{s.controller.address.slice(-4)}
            </a>
          </p>
        ) : null}
        <p className="muted">
          <a href={addr(s.address)} target="_blank" rel="noreferrer">{s.address}</a>
        </p>
      </section>

      <div className="banner" role="status">
        {s.approvalEvents.toLocaleString("en-US")} Approval events. {s.eventNonzeroPairs.toLocaleString("en-US")} wallet-token pairs look
        open in logs; only {s.livePairs.toLocaleString("en-US")} still are on-chain ({Math.round(deadShare * 100)}% dead or empty).
        Verified at block {s.block.toLocaleString("en-US")}.
      </div>

      <h2 style={{ margin: "28px 0 12px" }}>By token</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr><th>Token</th><th>Movable now</th><th>Wallets</th></tr>
          </thead>
          <tbody>
            {s.topTokens.map((t) => (
              <tr key={t.address}>
                <td><a href={addr(t.address)} target="_blank" rel="noreferrer">{t.symbol}</a></td>
                <td>{formatUsdCompact(t.usd)}</td>
                <td>{t.wallets.toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ margin: "28px 0 12px" }}>Most exposed wallets</h2>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr><th>Wallet</th><th>Type</th><th>Movable now</th></tr>
          </thead>
          <tbody>
            {s.topWallets.map((w) => (
              <tr key={w.address}>
                <td><Link href={walletPath("ethereum", w.address)}>{w.address.slice(0, 10)}…{w.address.slice(-6)}</Link></td>
                <td className="muted">{w.isContract === undefined ? "?" : w.isContract ? "contract" : "EOA"}</td>
                <td>{formatUsdCompact(w.usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <IndexNote generatedAt={s.updatedAt} />
      <SiteFooter />
    </div>
  );
}
