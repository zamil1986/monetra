import type { MetadataRoute } from "next";

/**
 * Makes Monetra installable to the home screen on Android and iPhone (PRD 2.2).
 * Manifest only: no service worker, nothing cached, online-only (ADR 0005).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Monetra",
    short_name: "Monetra",
    description: "Track income, expenses and transfers across your wallets.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#1b3fab",
    background_color: "#fbfcfd",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
