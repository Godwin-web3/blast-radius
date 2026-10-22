// Step 1: discover latest Approval per (token, owner) for a spender via HyperSync.
const SP = (process.argv[2] || "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5").toLowerCase();
const APP = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const pad = "0x" + "0".repeat(24) + SP.slice(2);
const headers = { "content-type": "application/json" };
if (process.env.ENVIO_API_TOKEN) headers.authorization = `Bearer ${process.env.ENVIO_API_TOKEN}`;
const latest = new Map(); let n = 0, pages = 0, from = 0; const t = Date.now();
for (;;) {
  const body = { from_block: from, logs: [{ topics: [[APP], [], [pad]] }],
    field_selection: { log: ["block_number", "log_index", "address", "topic1", "topic3", "data"] } };
  const r = await fetch("https://eth.hypersync.xyz/query", { method: "POST", headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const j = await r.json(); pages++;
  for (const d of j.data) for (const l of d.logs ?? []) {
    if (l.topic3) continue; // ERC-721 single-token approval
    n++; latest.set(`${l.address.toLowerCase()}|0x${l.topic1.slice(26)}`, l.data);
  }
  if (pages % 20 === 0) console.error(pages, from, n, latest.size);
  from = j.next_block; if (from >= j.archive_height) break;
}
const nz = [...latest].filter(([, v]) => v && v !== "0x" && BigInt(v) > 0n);
console.log(JSON.stringify({ spender: SP, pages, events: n, pairs: latest.size, nonzero: nz.length, secs: (Date.now() - t) / 1000 }));
await (await import("node:fs/promises")).writeFile(`data/${SP}.pairs.json`, JSON.stringify(nz.map(([k]) => k)));
