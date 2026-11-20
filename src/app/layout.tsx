import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { demoTimeLeft } from "@/domain/presentation";
import { I18nProvider } from "@/lib/i18n-client";
import { getT } from "@/server/i18n";
import { currentUser } from "@/server/page-session";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });

export const metadata: Metadata = {
  title: { default: "Monetra", template: "%s · Monetra" },
  // iPhone home-screen install: full screen, white status text over the cobalt band.
  appleWebApp: { capable: true, title: "Monetra", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B3FAB",
  // Draw under the notch and home indicator; the shell pads itself with env(safe-area-inset-*).
  viewportFit: "cover",
  // The on-screen keyboard shrinks the layout instead of covering the sticky Save button.
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const user = await currentUser();
  const { lang, t } = await getT();
  // Written by the shadcn sidebar when it is collapsed or expanded, so a reload keeps the same state.
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";
  return (
    <html lang={lang} className={archivo.variable}>
      <body>
        <I18nProvider lang={lang}>
          <AppShell
            user={user && {
              name: user.name,
              email: user.email,
              // An Akun demo shows how long it has left instead of its throwaway address.
              demo: user.isDemo && user.demoExpiresAt ? demoTimeLeft(user.demoExpiresAt, new Date(), t) : null,
            }}
            defaultOpen={sidebarOpen} modal={modal}>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
