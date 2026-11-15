import { db } from "./db";
import { ServiceError } from "./errors";

/**
 * The signed-in Pengguna. Auth (PRD 3.1) is not built yet, so development uses the account
 * named by DEV_USER_EMAIL, created by `npm run db:seed`. Production refuses until auth lands.
 */
export async function currentUserId(): Promise<string> {
  const email = process.env.NODE_ENV === "production" ? undefined : process.env.DEV_USER_EMAIL;
  if (!email) throw new ServiceError(404, "NOT_SIGNED_IN", "Sign-in is not available yet.");
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new ServiceError(404, "NOT_SIGNED_IN", `No account for ${email}. Run npm run db:seed.`);
  return user.id;
}
