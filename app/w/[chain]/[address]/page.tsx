import { WalletScanPage, walletMetadata } from "@/components/WalletScanPage";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ chain: string; address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chain, address } = await params;
  return walletMetadata([chain, address]);
}

export default async function ChainedWalletPage({ params }: Props) {
  const { chain, address } = await params;
  return <WalletScanPage segments={[chain, address]} />;
}
