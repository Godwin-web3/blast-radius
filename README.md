# Blast Radius

Paste a wallet. See what approvals can still move.

A read-only map of **open ERC-20 allowances** (and ERC-721 `ApprovalForAll` where we can find them) on **Ethereum mainnet, Base, and Arbitrum One**. Discovery uses `Approval` logs plus an optional Etherscan key. Every row is re-checked live with `allowance` / `balanceOf`. Nothing is signed. Nothing is sent.

> Still movable if these spenders turn hostile.

## Why it is impressive because it is true

Unlimited Uniswap / Permit2 / Across-style spenders are ordinary DeFi hygiene failures, not a glitch. `vitalik.eth` is a known, public Ethereum reference: it often still shows max-uint approvals sitting in front of real token balances. Approvals are **per chain** — a revoke on Ethereum does nothing on Base. Blast Radius does not invent a dollar figure when CoinGecko has no price. If history is truncated by public RPC limits, the page says so **for that chain**.

## Stack

- Next.js App Router + TypeScript
- [viem](https://viem.sh) against Ethereum, Base, and Arbitrum One
- Public RPCs by default; optional `RPC_URL` / `BASE_RPC_URL` / `ARBITRUM_RPC_URL`
- **One** `ETHERSCAN_API_KEY` for all three chains (Etherscan unified v2 API + `chainid`)
- MIT

## Run

```bash
npm i && npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick a chain, paste a `0x` address or ENS name.

Canonical share cards:

| Chain | Path |
| --- | --- |
| Ethereum | `/w/ethereum/vitalik.eth` |
| Base | `/w/base/vitalik.eth` |
| Arbitrum One | `/w/arbitrum/vitalik.eth` |

`/w/vitalik.eth` still works and means **Ethereum** (back-compat). Quoted links should use the `/w/[chain]/[address]` form so the chain is unambiguous. Each poster/OG kicker names the chain.

```bash
cp .env.example .env.local   # optional
npm test
npm run build
```

## What it does

1. Resolves `0x…` or `.eth` on Ethereum (ENS is L1).
2. Discovers candidate `(token, spender)` pairs **on the selected chain** from:
   - `eth_getLogs` for `Approval(owner, spender, value)` and `ApprovalForAll`
   - Etherscan v2 logs + token-tx hints when `ETHERSCAN_API_KEY` is set (`chainid` 1 / 8453 / 42161)
   - a known-token × known-spender probe (routers / Permit2 / bridges **for that chain**) so Uniswap/Across/Aerodrome/Camelot still show up when logs are capped
3. **Always** re-checks current `allowance` / `balanceOf` (or `isApprovedForAll`).
4. Ranks unlimited-and-funded first. Poster top 3: token · spender · UNLIMITED.
5. Headline is `$… EXPOSED` only from live prices; otherwise an honest fallback (`UNLIMITED`, `N OPEN ALLOWANCES`, `CLEAN`).
6. Partial-scan banner when log history on **that chain** did not reach genesis.
7. Links [revoke.cash](https://revoke.cash) as an external revoke tip for the same chain. This app never asks for a key or sends a tx.

## Environment

See `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `RPC_URL` | no | Preferred Ethereum mainnet JSON-RPC |
| `BASE_RPC_URL` | no | Preferred Base JSON-RPC |
| `ARBITRUM_RPC_URL` | no | Preferred Arbitrum One JSON-RPC |
| `ETHERSCAN_API_KEY` | no | **One** Etherscan v2 key for all three chains |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical origin for metadata |

### One Etherscan key, three chains

Etherscan’s unified API is `https://api.etherscan.io/v2/api`. Blast Radius sends the same `ETHERSCAN_API_KEY` with:

- Ethereum `chainid=1`
- Base `chainid=8453`
- Arbitrum One `chainid=42161`

You do **not** need a separate Basescan or Arbiscan key.

### Public RPC fallbacks and rate limits

If a dedicated RPC env is unset, the scanner falls back to public endpoints (PublicNode, LlamaRPC, Ankr, 1rpc, official public URLs, drpc). Those endpoints commonly:

- Rate-limit or reject unfiltered `eth_getLogs` (especially full-history scans)
- Throttle burst `eth_call` / multicall traffic

That is why the **partial-scan banner** exists. Rows that do render are still live `allowance` / `balanceOf` re-checks. Missing older spenders are *unknown*, not *safe*. A dedicated RPC plus the Etherscan key is the reliable way to deepen history.

## Safety

- No wallet connect, no private keys, no `eth_sendTransaction`.
- USD is optional and sourced from CoinGecko per chain platform; missing price ⇒ no dollar on the poster.
- Public RPCs rate-limit `getLogs`. Treat an unscanned older spender as *unknown*, not *safe*.
