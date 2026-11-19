import Link from "next/link";
import { Notice } from "@/components/ui";

export function NoActiveWallet() {
  return (
    <Notice tone="warn" role="alert"><strong>No active wallet.</strong> <Link href="/wallets">Create or unarchive a wallet</Link> first.</Notice>
  );
}
