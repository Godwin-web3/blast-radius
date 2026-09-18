# DEMO

## 30-second path

```bash
npm i && npm run dev
```

1. Open http://localhost:3000
2. Click **try vitalik.eth** (or paste `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`)
3. Wait for the live re-check. You should see a blast map plus a poster.
4. Copy link / Download card — the PNG is the 1200×630 OG image at `/w/vitalik.eth/opengraph-image`.

## What “good” looks like

`vitalik.eth` is a public, well-known reference. It **often** still has unlimited Uniswap Router / Permit2 / Across SpokePool-style ERC-20 approvals. Exact rows change as he revokes or as RPCs omit old logs — do not screenshot-assert a frozen dollar amount.

Expect:

- Huge headline: a real `$… EXPOSED` **only if** CoinGecko returned prices; otherwise `UNLIMITED` / `N OPEN ALLOWANCES`.
- Quote: *Still movable if these spenders turn hostile.*
- Top 3 rows: `TOKEN · SPENDER · UNLIMITED`
- Mono address (and ENS when resolved)
- A **partial-scan banner** on public RPCs that cannot walk Approval logs to genesis. That banner is a feature, not a failure.
- Footer pointing at [revoke.cash](https://revoke.cash). No connect-wallet button.

## Optional depth

Copy `.env.example` to `.env.local` and set `ETHERSCAN_API_KEY` to pull more historical Approval logs. Set `RPC_URL` if you have a dedicated mainnet endpoint.

## Tests

```bash
npm test
```

Covers unlimited detection (`type(uint256).max`, `2^255`, `1e59`) and ranking (live unlimited > latent unlimited > limited; USD only when provided).
