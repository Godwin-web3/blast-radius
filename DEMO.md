# DEMO

## 30-second path

```bash
npm i && npm run dev
```

1. Open http://localhost:3000
2. Leave **ETH** selected and click **try vitalik.eth** (or paste `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`)
3. Wait for the live re-check. You should see a blast map plus a poster that says **Ethereum**.
4. Copy link — the URL is `/w/ethereum/vitalik.eth` so the chain is unambiguous when quoted.
5. Download card — the PNG is the 1200×630 OG image (kicker: `BLAST RADIUS · ETHEREUM`).

## Base + Arbitrum

Approvals do not follow you across L2s. Same wallet, different chain:

| Chain | Try |
| --- | --- |
| Ethereum | http://localhost:3000/w/ethereum/vitalik.eth |
| Base | http://localhost:3000/w/base/vitalik.eth |
| Arbitrum One | http://localhost:3000/w/arbitrum/vitalik.eth |

On the home form, pick **Base** or **Arb** *before* Scan, or tap the chain switch on an existing poster to re-scan the same wallet. `/w/vitalik.eth` still means Ethereum.

ENS is resolved on L1, then the checksum address is scanned on the selected chain.

## What “good” looks like

`vitalik.eth` is a public, well-known **Ethereum** reference. It **often** still has unlimited Uniswap Router / Permit2 / Across SpokePool-style ERC-20 approvals. Base and Arbitrum rows will differ (often quieter). Exact rows change as he revokes or as RPCs omit old logs — do not screenshot-assert a frozen dollar amount.

Expect:

- Huge headline: a real `$… EXPOSED` **only if** CoinGecko returned prices; otherwise `UNLIMITED` / `N OPEN ALLOWANCES`.
- Quote: *Still movable if these spenders turn hostile.*
- Top 3 rows: `TOKEN · SPENDER · UNLIMITED`
- Chain on the poster kicker and OG (`ETHEREUM` / `BASE` / `ARBITRUM`)
- Mono address (and ENS when resolved)
- A **partial-scan banner named for that chain** on public RPCs that cannot walk Approval logs to genesis. That banner is a feature, not a failure.
- Footer pointing at [revoke.cash](https://revoke.cash) for the same chain. No connect-wallet button.

## Optional depth

Copy `.env.example` to `.env.local`.

- Set **one** `ETHERSCAN_API_KEY` (Etherscan v2). The app passes `chainid` 1 / 8453 / 42161 — no per-chain explorer keys.
- Set `RPC_URL`, `BASE_RPC_URL`, and/or `ARBITRUM_RPC_URL` if you have dedicated endpoints. Public fallbacks are rate-limited.

## Tests

```bash
npm test
```

Covers unlimited detection (`type(uint256).max`, `2^255`, `1e59`), ranking (live unlimited > latent unlimited > limited; USD only when provided), and chain config / share URL encoding.
