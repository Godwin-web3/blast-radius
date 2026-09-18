import { CHAINS } from "@/lib/chains";
import { POSTER_QUOTE } from "@/lib/headline";
import { shortAddress } from "@/lib/format";
import type { ScanResult } from "@/lib/types";
import { ShareBar } from "./ShareBar";

export function Poster({ result, path }: { result: ScanResult; path: string }) {
  const top = result.approvals.slice(0, 3);
  const label = result.ens ?? result.address;

  return (
    <section className="poster">
      <div className="poster-kicker">Blast Radius · {result.chainName}</div>
      <h1>{result.headline.title}</h1>
      <p className="quote">“{POSTER_QUOTE}”</p>
      <div className="rows">
        {top.length === 0 ? (
          <div className="row">
            <span>No open spenders in this window</span>
            <span className="muted">—</span>
            <span className="muted">CLEAN</span>
          </div>
        ) : (
          top.map((a) => (
            <div className="row" key={a.id}>
              <span>{a.tokenSymbol}</span>
              <span className="muted">{a.spenderLabel}</span>
              <span className="tag">
                {a.unlimited || a.kind === "erc721-for-all" ? "UNLIMITED" : "LIMITED"}
              </span>
            </div>
          ))
        )}
      </div>
      <div className="addr">{label}</div>
      {result.ens ? <div className="addr">{result.address}</div> : null}
      <ShareBar
        path={path}
        filename={`blast-radius-${result.chain}-${shortAddress(result.address, 4)}.png`}
        revokeUrl={CHAINS[result.chain].revokeCashUrl(result.address)}
      />
    </section>
  );
}
