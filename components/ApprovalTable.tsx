import { CHAINS } from "@/lib/chains";
import { formatAllowance, formatUnits, shortAddress } from "@/lib/format";
import { formatUsdCompact } from "@/lib/headline";
import { isSplKind, type OpenApproval } from "@/lib/types";

export function ApprovalTable({
  approvals,
  explorerUrl = CHAINS.ethereum.explorer.addressUrl,
  family = "evm",
}: {
  approvals: OpenApproval[];
  explorerUrl?: (address: string) => string;
  family?: "evm" | "solana";
}) {
  const solana = family === "solana";
  if (approvals.length === 0) {
    return (
      <div className="empty">
        <h2>CLEAN</h2>
        <p className="muted">
          {solana
            ? "No open SPL / Token-2022 delegates found on this wallet."
            : "No open allowances found in this scan window."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Token</th>
            <th>{solana ? "Delegate" : "Spender"}</th>
            <th>{solana ? "Delegated" : "Allowance"}</th>
            <th>Balance</th>
            <th>Movable now</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((a) => (
            <tr key={a.id}>
              <td>
                <a href={explorerUrl(a.token)} target="_blank" rel="noreferrer">
                  {a.tokenSymbol}
                </a>
                <div className="muted">{a.tokenName}</div>
              </td>
              <td>
                <a href={explorerUrl(a.spender)} target="_blank" rel="noreferrer">
                  {a.spenderLabel}
                </a>
                <div className="muted">{shortAddress(a.spender, 5)}</div>
              </td>
              <td>
                {a.kind === "erc721-for-all" || a.unlimited ? (
                  <span className="pill">UNLIMITED</span>
                ) : isSplKind(a.kind) ? (
                  formatUnits(a.allowance, a.decimals)
                ) : (
                  formatAllowance(a.allowance, a.decimals)
                )}
                {a.frozen ? (
                  <div className="muted" style={{ marginTop: 4 }}>
                    frozen
                  </div>
                ) : null}
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
                      : a.frozen
                        ? "0 (frozen — delegate still set)"
                        : solana
                          ? "0 (delegate still open)"
                          : "0 (approval still open)"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
