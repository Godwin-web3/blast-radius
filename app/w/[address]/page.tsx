import { ApprovalTable } from "@/components/ApprovalTable";
import { BlastMap } from "@/components/BlastMap";
import { Poster } from "@/components/Poster";
import { SearchForm } from "@/components/SearchForm";
import { SiteFooter } from "@/components/SiteFooter";
import { scanWallet } from "@/lib/scan";
import { ResolveError } from "@/lib/resolve";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const q = decodeURIComponent(address);
  return {
    title: q,
    description: `Open approvals still movable for ${q}. Still movable if these spenders turn hostile.`,
  };
}

export default async function WalletPage({ params }: Props) {
  const { address } = await params;
  const q = decodeURIComponent(address);

  let error: string | null = null;
  let result = null;
  try {
    result = await scanWallet(q);
  } catch (err) {
    if (err instanceof ResolveError) {
      error = err.message;
    } else {
      error = err instanceof Error ? err.message : "Scan failed";
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Blast Radius
        </Link>
        <nav>
          <a href="https://revoke.cash" target="_blank" rel="noreferrer">
            revoke.cash
          </a>
        </nav>
      </header>
      <SearchForm initial={q} />

      {error ? (
        <section className="empty">
          <h2>NO LOCK</h2>
          <p className="muted">{error}</p>
        </section>
      ) : result ? (
        <>
          {result.partial ? (
            <div className="banner" role="status">
              Partial history. Public RPCs often cannot return every Approval log
              back to genesis
              {result.fromBlock
                ? ` (this pass covered blocks ${result.fromBlock}–${result.latestBlock})`
                : ""}
              . Rows below are live <code>allowance</code> / <code>balanceOf</code>{" "}
              re-checks — older spenders may still be missing.
            </div>
          ) : null}
          <Poster result={result} path={`/w/${encodeURIComponent(q)}`} />
          <BlastMap address={result.address} approvals={result.approvals} />
          <ApprovalTable approvals={result.approvals} />
          {!result.headline.hasUsd && result.approvals.some((a) => a.movable > 0n) ? (
            <p className="muted" style={{ marginTop: 16 }}>
              No live USD quote for some tokens, so the headline does not invent a
              dollar figure.
            </p>
          ) : null}
        </>
      ) : null}

      <SiteFooter />
    </div>
  );
}
