import { randomBytes, randomUUID } from "node:crypto";
import { auth } from "./auth";
import { db } from "./db";
import { requestLang } from "./i18n";
import { addSampleData } from "./sample-data";

const DEMO_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** Akun demo past their 24 hours go, with everything they own (PRD 3.1). */
export async function removeExpiredDemos(now = new Date()) {
  const { count } = await db.user.deleteMany({ where: { isDemo: true, demoExpiresAt: { lt: now } } });
  return count;
}

/**
 * Makes a fresh Akun demo full of sample data and signs it in. Returns Better Auth's response,
 * whose Set-Cookie header carries the session.
 */
export async function startDemo(): Promise<Response> {
  await removeExpiredDemos();
  const email = `demo-${randomUUID()}@demo.monetra.invalid`;
  const response = await auth.api.signUpEmail({
    // The demo opens in the Bahasa of the sign-in page it was started from.
    body: { name: "Demo Pengguna", email, password: randomBytes(24).toString("base64url"), timezone: "Asia/Jakarta", language: await requestLang() },
    asResponse: true,
  });
  if (!response.ok) return response;
  const user = await db.user.update({
    where: { email },
    data: { isDemo: true, demoExpiresAt: new Date(Date.now() + DEMO_LIFETIME_MS) },
  });
  await addSampleData(user.id);
  return response;
}
