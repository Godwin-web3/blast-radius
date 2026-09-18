import { CHAINS } from "@/lib/chains";
import { posterQuote } from "@/lib/headline";
import { exposureTag, shortAddress } from "@/lib/format";
import type { ScanResult } from "@/lib/types";
import { ShareBar } from "./ShareBar";

export function Poster({ result, path }: { result: ScanResult; path: string }) {
  const top = result.approvals.slice(0, 3);
  const label = result.ens ?? result.address;
  const chain = CHAINS[result.chain];
  const empty = result.family === "solana" ? "No open delegates in this window" : "No open spenders in this window";

  return (
    <section className="poster">
      <div className="poster-kicker">Blast Radius · {result.chainName}</div>
      <h1>{result.headline.title}</h1>
      <p className="quote">“{posterQuote(result.family === "solana" ? "delegate" : "allowance")}”</p>
      <div className="rows">
        {top.length === 0 ? (
          <div className="row">
            <span>{empty}</span>
            <span className="muted">—</span>
            <span className="muted">CLEAN</span>
          </div>
        ) : (
          top.map((a) => (
            <div className="row" key={a.id}>
              <span>{a.tokenSymbol}</span>
              <span className="muted">{a.spenderLabel}</span>
              <span className="tag">{exposureTag(a)}</span>
            </div>
          ))
        )}
      </div>
      <div className="addr">{label}</div>
      {result.ens ? <div className="addr">{result.address}</div> : null}
      <ShareBar
        path={path}
        filename={`blast-radius-${result.chain}-${shortAddress(result.address, 4)}.png`}
        revokeUrl={chain.revokeUrl(result.address)}
        revokeLabel={chain.revokeLabel}
      />
    </section>
  );
}
