import { WalletScanPage, walletMetadata } from "@/components/WalletScanPage";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ chain: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chain } = await params;
  return walletMetadata([chain]);
}

export default async function WalletPage({ params }: Props) {
  const { chain } = await params;
  return <WalletScanPage segments={[chain]} />;
}
