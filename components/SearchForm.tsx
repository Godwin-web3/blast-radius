"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SearchForm({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    if (!q) {
      return;
    }
    setBusy(true);
    router.push(`/w/${encodeURIComponent(q)}`);
  }

  return (
    <form className="search" onSubmit={onSubmit}>
      <input
        name="wallet"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Paste 0x… or vitalik.eth"
        autoComplete="off"
        spellCheck={false}
        aria-label="Wallet address or ENS name"
      />
      <button type="submit" disabled={busy}>
        {busy ? "Scanning" : "Scan"}
      </button>
    </form>
  );
}
