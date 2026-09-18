import { SearchForm } from "@/components/SearchForm";
import { SiteFooter } from "@/components/SiteFooter";
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
          <Link href="/w/vitalik.eth">vitalik.eth</Link>
        </nav>
      </header>
      <main className="hero">
        <div className="kicker">Ethereum mainnet · live allowances</div>
        <h1 className="display">Blast Radius</h1>
        <p className="lede">Paste a wallet. See what approvals can still move.</p>
        <SearchForm />
        <div className="hints">
          <Link className="chip" href="/w/vitalik.eth">
            try vitalik.eth
          </Link>
          <span className="chip">public RPC · optional Etherscan</span>
          <span className="chip">never fake USD</span>
        </div>
        <p className="fine">
          Read-only. No keys, no signatures, no transactions. History from Approval
          logs when the node allows it — current <code>allowance</code> is always
          re-checked on-chain.
        </p>
        <div className="rings" aria-hidden="true">
          <span />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
