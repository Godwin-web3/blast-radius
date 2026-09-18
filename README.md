# Blast Radius

Paste a wallet. See what approvals can still move.

A read-only Ethereum mainnet map of **open ERC-20 allowances** (and ERC-721 `ApprovalForAll` where we can find them). Discovery uses `Approval` logs plus an optional Etherscan key. Every row is re-checked live with `allowance` / `balanceOf`. Nothing is signed. Nothing is sent.

> Still movable if these spenders turn hostile.

## Why it is impressive because it is true

Unlimited Uniswap / Permit2 / Across-style spenders are ordinary DeFi hygiene failures, not a glitch. `vitalik.eth` is a known, public reference: it often still shows max-uint approvals sitting in front of real token balances. Blast Radius does not invent a dollar figure when CoinGecko has no price. If history is truncated by public RPC limits, the page says so.

## Stack

- Next.js App Router + TypeScript
- [viem](https://viem.sh) against Ethereum mainnet
- Public RPCs by default; optional `RPC_URL` and `ETHERSCAN_API_KEY`
- MIT

## Run

```bash
npm i && npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a `0x` address or ENS name. Share cards live at `/w/[address]` (try `/w/vitalik.eth`) with a 1200×630 OG image.

```bash
cp .env.example .env.local   # optional
npm test
npm run build
```

## What it does

1. Resolves `0x…` or `.eth`.
2. Discovers candidate `(token, spender)` pairs from:
   - `eth_getLogs` for `Approval(owner, spender, value)` and `ApprovalForAll`
   - Etherscan logs + token-tx hints when `ETHERSCAN_API_KEY` is set
   - a known-token × known-spender probe so Uniswap/Across/Permit2 still show up when logs are capped
3. **Always** re-checks current `allowance` / `balanceOf` (or `isApprovedForAll`).
4. Ranks unlimited-and-funded first. Poster top 3: token · spender · UNLIMITED.
5. Headline is `$… EXPOSED` only from live prices; otherwise an honest fallback (`UNLIMITED`, `N OPEN ALLOWANCES`, `CLEAN`).
6. Partial-scan banner when log history did not reach genesis.
7. Links [revoke.cash](https://revoke.cash) as an external revoke tip. This app never asks for a key or sends a tx.

## Environment

See `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `RPC_URL` | no | Preferred mainnet JSON-RPC |
| `ETHERSCAN_API_KEY` | no | Deeper Approval-log discovery |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical origin for metadata |

## Safety

- No wallet connect, no private keys, no `eth_sendTransaction`.
- USD is optional and sourced from CoinGecko; missing price ⇒ no dollar on the poster.
- Public RPCs rate-limit `getLogs`. Treat an unscanned older spender as *unknown*, not *safe*.
