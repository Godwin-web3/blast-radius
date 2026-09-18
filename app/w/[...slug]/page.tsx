import { ApprovalTable } from "@/components/ApprovalTable";
import { BlastMap } from "@/components/BlastMap";
import { Poster } from "@/components/Poster";
import { SearchForm } from "@/components/SearchForm";
import { SiteFooter } from "@/components/SiteFooter";
import { ChainPathError, CHAINS, parseWalletPath, walletPath } from "@/lib/chains";
import { scanWallet } from "@/lib/scan";
import { ResolveError } from "@/lib/resolve";
import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const parsed = parseWalletPath(slug);
    const q = parsed.query || parsed.chain.slug;
    return {
      title: `${q} · ${parsed.chain.name}`,
      description: `Open ${parsed.chain.name} approvals still movable for ${q}. Still movable if these spenders turn hostile.`,
    };
  } catch {
    return {
      title: "Blast Radius",
      description: "Paste a wallet. See which ERC-20 approvals can still move your tokens.",
    };
  }
}

export default async function WalletPage({ params }: Props) {
  const { slug } = await params;

  let error: string | null = null;
  let result = null;
  let parsed: ReturnType<typeof parseWalletPath> | null = null;

  try {
    parsed = parseWalletPath(slug);
    if (!parsed.query) {
      error = "Paste a 0x address or ENS name.";
    } else {
      result = await scanWallet(parsed.query, parsed.chain);
    }
  } catch (err) {
    if (err instanceof ChainPathError || err instanceof ResolveError) {
      error = err.message;
    } else {
      error = err instanceof Error ? err.message : "Scan failed";
    }
  }

  const chainSlug = parsed?.chain.slug ?? "ethereum";
  const initialQuery = parsed?.query ?? "";
  const sharePath = result
    ? walletPath(result.chain, result.ens ?? result.query)
    : parsed && parsed.query
      ? walletPath(parsed.chain, parsed.query)
      : "/";

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
      <SearchForm initial={initialQuery} chain={chainSlug} />

      {error ? (
        <section className="empty">
          <h2>NO LOCK</h2>
          <p className="muted">{error}</p>
        </section>
      ) : result ? (
        <>
          {result.partial ? (
            <div className="banner" role="status">
              Partial {result.chainName} history. Public RPCs often cannot return
              every Approval log back to genesis
              {result.fromBlock
                ? ` (this pass covered blocks ${result.fromBlock}–${result.latestBlock})`
                : ""}
              . Rows below are live <code>allowance</code> / <code>balanceOf</code>{" "}
              re-checks on {result.chainName} — older spenders on this chain may
              still be missing.
            </div>
          ) : null}
          <Poster result={result} path={sharePath} />
          <BlastMap address={result.address} approvals={result.approvals} />
          <ApprovalTable
            approvals={result.approvals}
            explorerUrl={CHAINS[result.chain].explorer.addressUrl}
          />
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
