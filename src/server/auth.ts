import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins";
import { db } from "./db";
import { sendEmail } from "./email";
import { provisionUser } from "./users";

const DAY = 60 * 60 * 24;

/**
 * Email + password sign-in (PRD 3.1). The web keeps the session in a cookie; the Android app
 * sends it as a bearer token and may stay offline for weeks, so sessions live 90 days and are
 * extended whenever a Perangkat syncs (ADR 0005).
 */
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  advanced: { database: { generateId: "uuid" } },
  session: { expiresIn: 90 * DAY, updateAge: DAY },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Not awaited, so the response time doesn't reveal whether the address has an Akun.
      void sendEmail({
        to: user.email,
        subject: "Reset your Monetra password",
        text: `Open this link to choose a new password:\n\n${url}\n\nThe link expires in one hour. If you didn't ask for it, ignore this email.`,
      });
    },
  },
  user: {
    additionalFields: {
      timezone: { type: "string", required: false, defaultValue: "Asia/Jakarta" },
      isDemo: { type: "boolean", required: false, defaultValue: false, input: false },
      demoExpiresAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    user: { create: { after: async (user) => provisionUser(user.id) } },
  },
  plugins: [bearer(), nextCookies()],
});
