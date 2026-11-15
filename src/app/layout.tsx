import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { currentUser } from "@/server/page-session";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });

export const metadata: Metadata = { title: { default: "Monetra", template: "%s · Monetra" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1B3FAB" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <AppShell user={user && { name: user.name, email: user.email }}>{children}</AppShell>
      </body>
    </html>
  );
}
