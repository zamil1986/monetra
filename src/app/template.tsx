import type { ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";

/** Remounts on every top-level navigation (Transactions ↔ Wallets ↔ Categories), which is what fires the enter animation. */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
