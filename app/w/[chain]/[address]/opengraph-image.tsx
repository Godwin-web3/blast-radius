import { renderOgCard } from "@/lib/og-card";

export const runtime = "nodejs";
export const alt = "Blast Radius share card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const maxDuration = 30;

export default async function OgImage({
  params,
}: {
  params: Promise<{ chain: string; address: string }>;
}) {
  const { chain, address } = await params;
  return renderOgCard([chain, address]);
}
