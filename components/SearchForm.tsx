"use client";

import { CHAIN_LIST, type ChainSlug, walletPath } from "@/lib/chains";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export function SearchForm({
  initial = "",
  chain = "ethereum",
}: {
  initial?: string;
  chain?: ChainSlug;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [selected, setSelected] = useState<ChainSlug>(chain);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(initial);
    setSelected(chain);
    setBusy(false);
  }, [initial, chain]);

  function go(nextChain: ChainSlug, query: string) {
    const q = query.trim();
    if (!q) {
      setSelected(nextChain);
      return;
    }
    setBusy(true);
    router.push(walletPath(nextChain, q));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    go(selected, value);
  }

  const solana = selected === "solana";

  return (
    <div className="search-stack">
      <div className="chain-switch" role="radiogroup" aria-label="Chain">
        {CHAIN_LIST.map((c) => {
          const pressed = selected === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              role="radio"
              aria-checked={pressed}
              className={pressed ? "is-on" : undefined}
              onClick={() => go(c.slug, value)}
            >
              {c.shortName}
            </button>
          );
        })}
      </div>
      <form className="search" onSubmit={onSubmit}>
        <input
          name="wallet"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={solana ? "Paste Solana base58 address" : "Paste 0x… or vitalik.eth"}
          autoComplete="off"
          spellCheck={false}
          aria-label={solana ? "Solana wallet address" : "Wallet address or ENS name"}
        />
        <button type="submit" disabled={busy}>
          {busy ? "Scanning" : "Scan"}
        </button>
      </form>
    </div>
  );
}
