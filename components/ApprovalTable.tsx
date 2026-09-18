import type { OpenApproval } from "@/lib/types";
import { formatAllowance, formatUnits, shortAddress } from "@/lib/format";
import { formatUsdCompact } from "@/lib/headline";

function explorer(address: string): string {
  return `https://etherscan.io/address/${address}`;
}

export function ApprovalTable({ approvals }: { approvals: OpenApproval[] }) {
  if (approvals.length === 0) {
    return (
      <div className="empty">
        <h2>CLEAN</h2>
        <p className="muted">No open allowances found in this scan window.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Spender</th>
            <th>Allowance</th>
            <th>Balance</th>
            <th>Movable now</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((a) => (
            <tr key={a.id}>
              <td>
                <a href={explorer(a.token)} target="_blank" rel="noreferrer">
                  {a.tokenSymbol}
                </a>
                <div className="muted">{a.tokenName}</div>
              </td>
              <td>
                <a href={explorer(a.spender)} target="_blank" rel="noreferrer">
                  {a.spenderLabel}
                </a>
                <div className="muted">{shortAddress(a.spender, 5)}</div>
              </td>
              <td>
                {a.kind === "erc721-for-all" || a.unlimited ? (
                  <span className="pill">UNLIMITED</span>
                ) : (
                  formatAllowance(a.allowance, a.decimals)
                )}
              </td>
              <td>
                {a.kind === "erc721-for-all"
                  ? `${a.balance.toString()} NFT`
                  : formatUnits(a.balance, a.decimals)}
              </td>
              <td>
                {a.kind === "erc721-for-all"
                  ? a.balance > 0n
                    ? `${a.balance.toString()} · ALL`
                    : "ALL (empty bag)"
                  : a.usdMovable != null && a.usdMovable > 0
                    ? formatUsdCompact(a.usdMovable)
                    : a.movable > 0n
                      ? formatUnits(a.movable, a.decimals)
                      : "0 (approval still open)"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
