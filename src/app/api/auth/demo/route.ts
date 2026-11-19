import { startDemo } from "@/server/demo";
import { handle } from "@/server/http";

/** "Coba demo": web only (ADR 0005), so the Android app never holds an expiring Akun. */
export const POST = () => handle(startDemo);
