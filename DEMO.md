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

## Base, Arbitrum, Solana

Approvals / delegates do not follow you across chains. Same wallet, different chain:

| Chain | Try |
| --- | --- |
| Ethereum | http://localhost:3000/w/ethereum/vitalik.eth |
| Base | http://localhost:3000/w/base/vitalik.eth |
| Arbitrum One | http://localhost:3000/w/arbitrum/vitalik.eth |
| Solana | http://localhost:3000/w/solana/<base58 wallet> |

On the home form, pick **Base**, **Arb**, or **SOL** *before* Scan, or tap the chain switch on an existing poster to re-scan the same wallet. `/w/vitalik.eth` still means Ethereum. Solana needs a base58 address, not ENS.

## What “good” looks like

`vitalik.eth` is a public, well-known **Ethereum** reference. It **often** still has unlimited Uniswap Router / Permit2 / Across SpokePool-style ERC-20 approvals. Base and Arbitrum rows will differ (often quieter). Exact rows change as he revokes or as RPCs omit old logs — do not screenshot-assert a frozen dollar amount.

Expect:

- Huge headline: a real `$… EXPOSED` **only if** CoinGecko returned prices; otherwise `UNLIMITED` / `N OPEN ALLOWANCES`.
- Quote: *Still movable if these spenders turn hostile.*
- Top 3 rows: `TOKEN · SPENDER · UNLIMITED`
- Chain on the poster kicker and OG (`ETHEREUM` / `BASE` / `ARBITRUM` / `SOLANA`)
- Mono address (and ENS when resolved)
- A **partial-scan banner named for that chain** on public RPCs that cannot walk Approval logs to genesis (EVM) or cannot return every token account (Solana). That banner is a feature, not a failure.
- Footer pointing at [revoke.cash](https://revoke.cash) on EVM, Solscan on Solana. No connect-wallet button.

Solana is **delegates on token accounts**, not ERC-20 allowances. The table says Delegate / Delegated. There is no ApprovalForAll equivalent.

## Optional depth

Copy `.env.example` to `.env.local`.

- Set **one** `ETHERSCAN_API_KEY` (Etherscan v2). The app passes `chainid` 1 / 8453 / 42161 — no per-chain explorer keys.
- Set `RPC_URL`, `BASE_RPC_URL`, `ARBITRUM_RPC_URL`, and/or `SOLANA_RPC` if you have dedicated endpoints. Public fallbacks are rate-limited.
- Optional `HELIUS_API_KEY` is only a keyed Solana JSON-RPC URL. The app works with plain RPC.

## Tests

```bash
npm test
```

Covers unlimited detection (`type(uint256).max`, `2^255`, `1e59`, Solana `u64::MAX`), ranking (live unlimited > latent unlimited > limited; USD only when provided), Solana jsonParsed delegate parsing, and chain config / share URL encoding.
