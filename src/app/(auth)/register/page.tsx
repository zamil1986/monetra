"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Rich } from "@/components/rich";
import { h1, muted } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n-client";
import { authErrorMessage } from "../auth-error";
import { AuthForm } from "../auth-form";

export default function RegisterPage() {
  const router = useRouter();
  const { t, lang } = useT();
  return (
    <>
      <h1 className={h1}>{t("register.title")}</h1>
      <p className={`${muted} mt-1 mb-6`}>{t("register.sub")}</p>
      <AuthForm
        submitLabel={t("register.submit")}
        fields={[
          { name: "name", label: t("common.name"), type: "text", autoComplete: "name" },
          { name: "email", label: t("common.email"), type: "email", autoComplete: "email" },
          { name: "password", label: t("common.password"), type: "password", autoComplete: "new-password", hint: t("auth.passwordHint") },
        ]}
        onSubmit={async ({ name, email, password }) => {
          // Day boundaries follow the profile time zone (PRD 3.1); the browser's is the best first guess.
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
          // The Akun starts in the Bahasa this page is shown in (ADR 0006).
          const { error } = await authClient.signUp.email({ name: name!.trim(), email: email!, password: password!, timezone, language: lang });
          if (error) return authErrorMessage(t, error, "register.failed");
          router.replace("/");
          router.refresh();
          return null;
        }}
      />
      <p className="mt-8 text-center"><Rich text={t("register.haveAccount")} tags={{ link: (c) => <Link href="/login">{c}</Link> }} /></p>
    </>
  );
}
