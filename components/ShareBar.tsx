"use client";

import { useState } from "react";

export function ShareBar({
  path,
  filename,
  revokeUrl = "https://revoke.cash",
}: {
  path: string;
  filename: string;
  revokeUrl?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function copyLink() {
    const url = new URL(path, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function downloadCard() {
    setDownloading(true);
    try {
      const og = path.endsWith("/") ? `${path}opengraph-image` : `${path}/opengraph-image`;
      const res = await fetch(og);
      if (!res.ok) {
        throw new Error("Could not fetch poster");
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(href);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="actions">
      <button type="button" onClick={() => void copyLink()}>
        {copied ? "Copied" : "Copy link"}
      </button>
      <button type="button" onClick={() => void downloadCard()}>
        {downloading ? "Saving…" : "Download card"}
      </button>
      <a className="btn" href={revokeUrl} target="_blank" rel="noreferrer">
        Revoke on revoke.cash
      </a>
    </div>
  );
}
