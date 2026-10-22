import { IndexNote } from "@/components/IndexNote";
import { SiteFooter } from "@/components/SiteFooter";
import { formatUsdCompact } from "@/lib/headline";
import { loadProof, loadSpenderIndex, rankSpenders } from "@/lib/spender-index";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Spender blast radius · Ethereum",
  description:
    "How much each upgradeable Ethereum spender can move from user wallets right now, and who holds the key.",
};

export default async function SpendersPage() {
  const index = await loadSpenderIndex();
  const rows = rankSpenders(index?.spenders ?? []);
  const proofs = new Map(
    (await Promise.all(rows.map(async (r) => [r.address.toLowerCase(), await loadProof(r.address)] as const))).filter(([, p]) => p),
  );
  const total = rows.reduce((s, r) => s + r.movableUsd, 0);
  const wallets = rows.reduce((s, r) => s + r.wallets, 0);

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          Blast Radius
        </Link>
        <nav>
          <Link href="/">scan a wallet</Link>
        </nav>
      </header>
      <section style={{ margin: "32px 0 24px" }}>
        <div className="kicker">Ethereum · reverse index</div>
        <h1 className="display" style={{ fontSize: "clamp(40px, 8vw, 88px)" }}>
          Who holds the keys
        </h1>
        <p className="lede">
          {rows.length
            ? `${formatUsdCompact(total)} movable from ${wallets.toLocaleString("en-US")} wallet-approvals sits behind ${rows.length} upgradeable or owned spenders.`
            : "If a spender's admin key is compromised, this is what it can take."}
        </p>
      </section>

      {!index ? (
        <section className="empty">
          <h2>NO INDEX</h2>
          <p className="muted">The nightly index has not been published yet, or could not be fetched.</p>
        </section>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Spender</th>
                <th>Grade</th>
                <th>Who can change it</th>
                <th>Movable now</th>
                <th>Proven drainable</th>
                <th>Wallets</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.address}>
                  <td>
                    <Link href={`/spender/${s.address}`}>{s.label}</Link>
                    <div className="muted">{s.address.slice(0, 8)}…{s.address.slice(-4)}</div>
                  </td>
                  <td>
                    <span className={`grade grade-${s.grade === "?" ? "unknown" : s.grade.toLowerCase()}`}>{s.grade}</span>
                  </td>
                  <td className="control-cell">{s.summary}</td>
                  <td>
                    <strong>{formatUsdCompact(s.movableUsd)}</strong>
                    {s.unpricedPairs ? <div className="muted">+{s.unpricedPairs.toLocaleString("en-US")} unpriced</div> : null}
                  </td>
                  <td>
                    {proofs.get(s.address.toLowerCase()) ? (
                      <strong className="grade-f">{formatUsdCompact(proofs.get(s.address.toLowerCase())!.provenDrainUsd)}</strong>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{s.wallets.toLocaleString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <IndexNote generatedAt={index?.generatedAt} />
      <SiteFooter />
    </div>
  );
}
