# Blast Radius

Paste a wallet. See what can still move.

A read-only map of **open ERC-20 allowances** (and ERC-721 `ApprovalForAll` where we can find them) on **Ethereum mainnet, Base, and Arbitrum One**, plus **SPL Token / Token-2022 delegates** on **Solana**. EVM discovery uses `Approval` logs plus an optional Etherscan key. Solana reads `getTokenAccountsByOwner` (jsonParsed) for Tokenkeg + Token-2022. Every EVM row is re-checked live with `allowance` / `balanceOf`. Solana rows are live `delegate` + `delegatedAmount` (not ERC-20 allowances). Nothing is signed. Nothing is sent.

> Still movable if these spenders / delegates turn hostile.

## Why it is impressive because it is true

Unlimited Uniswap / Permit2 / Across-style spenders are ordinary DeFi hygiene failures, not a glitch. `vitalik.eth` is a known, public Ethereum reference: it often still shows max-uint approvals sitting in front of real token balances. Approvals are **per chain** — a revoke on Ethereum does nothing on Base. On Solana, exposure is a **token-account delegate**, not an ERC-20 allowance — we do not fake that mental model. Blast Radius does not invent a dollar figure when CoinGecko has no price. If history (EVM) or token-account RPC (Solana) is truncated by public RPC limits, the page says so **for that chain**.

## Stack

- Next.js App Router + TypeScript
- [viem](https://viem.sh) against Ethereum, Base, and Arbitrum One
- Plain Solana JSON-RPC (`getTokenAccountsByOwner`) — no wallet adapter
- Public RPCs by default; optional `RPC_URL` / `BASE_RPC_URL` / `ARBITRUM_RPC_URL` / `SOLANA_RPC`
- **One** `ETHERSCAN_API_KEY` for the three EVM chains (Etherscan unified v2 API + `chainid`)
- MIT

## Run

```bash
npm i && npm run dev
```

Open [http://localhost:3000](http://localhost:3000), pick a chain, paste a `0x` address, ENS name, or Solana base58 wallet.

Canonical share cards:

| Chain | Path |
| --- | --- |
| Ethereum | `/w/ethereum/vitalik.eth` |
| Base | `/w/base/vitalik.eth` |
| Arbitrum One | `/w/arbitrum/vitalik.eth` |
| Solana | `/w/solana/[base58]` |

`/w/vitalik.eth` still works and means **Ethereum** (back-compat). Quoted links should use the `/w/[chain]/[address]` form so the chain is unambiguous. Each poster/OG kicker names the chain.

```bash
cp .env.example .env.local   # optional
npm test
npm run build
```

## What it does

### Ethereum, Base, Arbitrum One

1. Resolves `0x…` or `.eth` on Ethereum (ENS is L1).
2. Discovers candidate `(token, spender)` pairs **on the selected chain** from:
   - `eth_getLogs` for `Approval(owner, spender, value)` and `ApprovalForAll`
   - Etherscan v2 logs + token-tx hints when `ETHERSCAN_API_KEY` is set (`chainid` 1 / 8453 / 42161)
   - a known-token × known-spender probe (routers / Permit2 / bridges **for that chain**) so Uniswap/Across/Aerodrome/Camelot still show up when logs are capped
3. **Always** re-checks current `allowance` / `balanceOf` (or `isApprovedForAll`).
4. Ranks unlimited-and-funded first. Poster top 3: token · spender · UNLIMITED.
5. Headline is `$… EXPOSED` only from live prices; otherwise an honest fallback (`UNLIMITED`, `N OPEN ALLOWANCES`, `CLEAN`).
6. Partial-scan banner when log history on **that chain** did not reach genesis.
7. Links [revoke.cash](https://revoke.cash) as an external revoke tip for the same chain.

### Solana

1. Validates a **base58** wallet (no ENS, no `0x`).
2. Calls `getTokenAccountsByOwner` for **Tokenkeg** and **Token-2022** with `jsonParsed`.
3. Surfaces accounts with a **non-null `delegate` and `delegatedAmount > 0`**. Rows are labeled **delegates**, not allowances.
4. Token-2022 **permanent delegate** on a mint is included when the wallet holds that mint and the permanent delegate is someone else. Freeze/mint authorities are **not** scored as “can move funds.” Frozen accounts still show the open delegate, with movable = 0 until thawed (permanent delegate can still move).
5. Resolves mint decimals from the parsed account; symbols from on-chain Token-2022 metadata, a small known-mint list, or a public token list. Unknown ⇒ truncated mint. USD only from CoinGecko — never invented.
6. `u64::MAX` delegated amount is treated as unlimited-ish. Ordinary delegated amounts show as amounts.
7. Partial-scan banner if RPC failed for Tokenkeg or Token-2022. Missing accounts are *unknown*, not *safe*.
8. Inspect the wallet on Solscan. Revoke in the wallet UI — this app never asks for a key or sends a tx.

## Environment

See `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `RPC_URL` | no | Preferred Ethereum mainnet JSON-RPC |
| `BASE_RPC_URL` | no | Preferred Base JSON-RPC |
| `ARBITRUM_RPC_URL` | no | Preferred Arbitrum One JSON-RPC |
| `SOLANA_RPC` | no | Preferred Solana mainnet JSON-RPC |
| `HELIUS_API_KEY` | no | Optional Helius JSON-RPC (`?api-key=`). Same methods as public RPC. |
| `ETHERSCAN_API_KEY` | no | **One** Etherscan v2 key for the three EVM chains |
| `NEXT_PUBLIC_SITE_URL` | no | Canonical origin for metadata |

### One Etherscan key, three EVM chains

Etherscan’s unified API is `https://api.etherscan.io/v2/api`. Blast Radius sends the same `ETHERSCAN_API_KEY` with:

- Ethereum `chainid=1`
- Base `chainid=8453`
- Arbitrum One `chainid=42161`

You do **not** need a separate Basescan or Arbiscan key. Solana does not use Etherscan.

### Public RPC fallbacks and rate limits

If a dedicated RPC env is unset, the scanner falls back to public endpoints (PublicNode, LlamaRPC, Ankr, 1rpc, official public URLs, drpc). Those endpoints commonly:

- Rate-limit or reject unfiltered `eth_getLogs` (especially full-history scans)
- Throttle burst `eth_call` / multicall traffic
- Rate-limit Solana `getTokenAccountsByOwner`

That is why the **partial-scan banner** exists. EVM rows that do render are still live `allowance` / `balanceOf` re-checks. Solana rows that do render are live jsonParsed delegates. Missing spenders/delegates are *unknown*, not *safe*. A dedicated RPC (plus the Etherscan key on EVM) is the reliable way to deepen the scan.

Solana works with **plain RPC alone**. `HELIUS_API_KEY` only adds a keyed JSON-RPC URL — it is not required and does not change the model.

## Safety

- No wallet connect, no private keys, no `eth_sendTransaction` / Solana txs.
- USD is optional and sourced from CoinGecko per chain platform; missing price ⇒ no dollar on the poster.
- Public RPCs rate-limit. Treat an unscanned older spender or a missed token account as *unknown*, not *safe*.
