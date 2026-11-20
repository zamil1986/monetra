"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Rich } from "@/components/rich";
import { h1, muted } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n-client";
import { authErrorMessage } from "../auth-error";
import { AuthForm } from "../auth-form";
import { DemoButton } from "./demo-button";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useT();
  return (
    <>
      <h1 className={h1}>{t("login.title")}</h1>
      <p className={`${muted} mt-1 mb-6`}>{t("login.sub")}</p>
      <AuthForm
        submitLabel={t("login.submit")}
        fields={[
          { name: "email", label: t("common.email"), type: "email", autoComplete: "email" },
          {
            name: "password", label: t("common.password"), type: "password", autoComplete: "current-password",
            hint: <Link href="/forgot-password">{t("login.forgot")}</Link>,
          },
        ]}
        onSubmit={async ({ email, password }) => {
          const { error } = await authClient.signIn.email({ email: email!, password: password! });
          if (error) return error.status === 401 ? t("auth.error.INVALID_EMAIL_OR_PASSWORD") : authErrorMessage(t, error, "login.failed");
          router.replace("/");
          router.refresh();
          return null;
        }}
      />
      <DemoButton />
      <p className="mt-8 text-center"><Rich text={t("login.noAccount")} tags={{ link: (c) => <Link href="/register">{c}</Link> }} /></p>
      <p className="mt-2 text-center text-meta"><Link href="/download">{t("login.android")}</Link></p>
    </>
  );
}
