import { headers } from "next/headers";
import { auth } from "./auth";
import { ServiceError } from "./errors";

/** The signed-in Pengguna, from the session cookie (web) or bearer token (Android). */
export async function currentUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ServiceError(401, "NOT_SIGNED_IN", "error.notSignedIn");
  const { isDemo, demoExpiresAt } = session.user;
  if (isDemo && demoExpiresAt && new Date(demoExpiresAt) < new Date()) {
    throw new ServiceError(401, "DEMO_EXPIRED", "error.demoExpired");
  }
  return session.user.id;
}
