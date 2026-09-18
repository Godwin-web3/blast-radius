export function SiteFooter({ family = "evm" }: { family?: "evm" | "solana" }) {
  return (
    <footer className="footer">
      <div>
        {family === "solana" ? (
          <>
            Read-only. No private keys. No transactions. Solana rows are live{" "}
            <code>delegate</code> / <code>delegatedAmount</code> on token accounts — not
            ERC-20 allowances.
          </>
        ) : (
          <>
            Read-only. No private keys. No transactions. Approvals are re-checked live
            via <code>allowance</code> / <code>balanceOf</code>.
          </>
        )}
      </div>
      <div>
        {family === "solana" ? (
          <>
            Revoke a delegate in your wallet (or the token account on Solscan) · MIT
          </>
        ) : (
          <>
            To revoke, use{" "}
            <a href="https://revoke.cash" target="_blank" rel="noreferrer">
              revoke.cash
            </a>{" "}
            · MIT
          </>
        )}
      </div>
    </footer>
  );
}
