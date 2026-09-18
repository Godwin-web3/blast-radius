import { SearchForm } from "@/components/SearchForm";
import { SiteFooter } from "@/components/SiteFooter";
import { walletPath } from "@/lib/chains";
import Link from "next/link";

export default function HomePage() {
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
          <Link href={walletPath("ethereum", "vitalik.eth")}>vitalik.eth</Link>
        </nav>
      </header>
      <main className="hero">
        <div className="kicker">Ethereum · Base · Arbitrum One · Solana</div>
        <h1 className="display">Blast Radius</h1>
        <p className="lede">Paste a wallet. See what can still move.</p>
        <SearchForm />
        <div className="hints">
          <Link className="chip" href={walletPath("ethereum", "vitalik.eth")}>
            try vitalik.eth
          </Link>
          <Link className="chip" href={walletPath("base", "vitalik.eth")}>
            same on Base
          </Link>
          <Link className="chip" href={walletPath("arbitrum", "vitalik.eth")}>
            same on Arbitrum
          </Link>
          <span className="chip">Solana delegates</span>
          <span className="chip">never fake USD</span>
        </div>
        <p className="fine">
          Read-only. No keys, no signatures, no transactions. Pick a chain, then
          scan. EVM: live <code>allowance</code> re-check. Solana: live token-account
          delegates — not ERC-20 approvals.
        </p>
        <div className="rings" aria-hidden="true">
          <span />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
