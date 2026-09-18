import { NextResponse } from "next/server";
import { ChainPathError, getChain, parseChainSlug } from "@/lib/chains";
import { scanWallet } from "@/lib/scan";
import { ResolveError } from "@/lib/resolve";
import { serializeScan } from "@/lib/serialize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const chainRaw = searchParams.get("chain");
  if (!q) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }
  if (chainRaw && !parseChainSlug(chainRaw)) {
    return NextResponse.json(
      { error: `Unknown chain "${chainRaw}". Use ethereum, base, arbitrum, or solana.` },
      { status: 400 },
    );
  }
  try {
    const chain = getChain(chainRaw);
    const result = await scanWallet(q, chain);
    return NextResponse.json(serializeScan(result));
  } catch (err) {
    if (err instanceof ResolveError || err instanceof ChainPathError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
