export function SiteFooter() {
  return (
    <footer className="footer">
      <div>
        Read-only. No private keys. No transactions. Approvals are re-checked live
        via <code>allowance</code> / <code>balanceOf</code>.
      </div>
      <div>
        To revoke, use{" "}
        <a href="https://revoke.cash" target="_blank" rel="noreferrer">
          revoke.cash
        </a>{" "}
        · MIT
      </div>
    </footer>
  );
}
