import type { ReactNode } from "react";
import { PageTransition } from "@/components/page-transition";

/** The root template does not remount between /transactions and /transactions/[id]; this one does. */
export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
