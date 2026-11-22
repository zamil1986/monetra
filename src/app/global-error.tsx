"use client";
import { Archivo } from "next/font/google";
import { buttonClass, h1 } from "@/components/ui";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });

/**
 * The last resort, when the root layout itself failed: no shell and no Bahasa to ask, so it speaks
 * both catalogs' words at once and offers the same way back as the screen error.
 */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="id" className={archivo.variable}>
      <body className="bg-paper text-ink">
        <div className="h-14 bg-cobalt" aria-hidden />
        <main className="max-w-[560px] px-4 pt-8 md:px-8">
          <div role="alert" className="border-t-2 border-ink pt-4">
            <h1 className={h1}>Monetra gagal dimuat · Monetra didn&apos;t load</h1>
            <p className="mt-3 text-[17px]">Tidak ada yang hilang dari yang sudah disimpan. Nothing you saved is lost.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button type="button" className={buttonClass("primary", "lg")} onClick={() => retry()}>Coba lagi · Try again</button>
              {/* A full load, since the router is part of what failed. */}
              <a className={buttonClass("secondary", "lg")} href="/dashboard">Ke Beranda · Home</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
