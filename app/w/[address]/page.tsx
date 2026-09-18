import { WalletScanPage, walletMetadata } from "@/components/WalletScanPage";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  return walletMetadata([address]);
}

export default async function EthereumWalletPage({ params }: Props) {
  const { address } = await params;
  return <WalletScanPage segments={[address]} />;
}
