export function IndexNote({ generatedAt }: { generatedAt?: string }) {
  return (
    <p className="fine" style={{ marginTop: 20 }}>
      Movable = min(live <code>allowance</code>, live <code>balanceOf</code>) × DefiLlama price, read
      on-chain for every wallet that ever approved the spender. Event values are never trusted:
      most approvals that look open in logs are already dead. Unpriced tokens are counted, not
      valued. ERC-20 only; NFT <code>setApprovalForAll</code> and Permit2 sub-allowances are not in
      this index yet. Spenders graded A or B (no upgrade key) are skipped on purpose.
      {generatedAt ? ` Updated ${generatedAt.slice(0, 16).replace("T", " ")} UTC.` : ""}
    </p>
  );
}
