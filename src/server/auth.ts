import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins";
import { isLang, translate, DEFAULT_LANG } from "@/domain/i18n";
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
      // In the Pengguna's own Bahasa (ADR 0006).
      const lang = "language" in user && isLang(user.language) ? user.language : DEFAULT_LANG;
      void sendEmail({
        to: user.email,
        subject: translate(lang, "email.reset.subject"),
        text: translate(lang, "email.reset.body", { url }),
      });
    },
  },
  user: {
    additionalFields: {
      timezone: { type: "string", required: false, defaultValue: "Asia/Jakarta" },
      // Set at sign-up from the language the sign-up screen was shown in; changed later through
      // /api/profile/language, which keeps the newest choice across Perangkat (ADR 0006).
      language: { type: "string", required: false, defaultValue: DEFAULT_LANG },
      languageChangedAt: { type: "date", required: false, input: false },
      isDemo: { type: "boolean", required: false, defaultValue: false, input: false },
      demoExpiresAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Anything but a known Bahasa falls back to the default rather than refusing the sign-up.
        before: async (user) => ({ data: { ...user, language: isLang(user.language) ? user.language : DEFAULT_LANG } }),
        after: async (user) => provisionUser(user.id),
      },
      update: {
        before: async (data) => ("language" in data && !isLang(data.language) ? false : { data }),
      },
    },
  },
  plugins: [bearer(), nextCookies()],
});
