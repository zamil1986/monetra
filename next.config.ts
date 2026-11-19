import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let a phone on the same Wi-Fi load the dev server (HMR, dev assets).
  // Covers any LAN IP (192.168.x.x / 10.x.x.x) and the Mac's Bonjour name (*.local).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
};

export default nextConfig;
