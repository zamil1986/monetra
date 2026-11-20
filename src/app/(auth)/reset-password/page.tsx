"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Rich } from "@/components/rich";
import { Notice, h1, muted } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n-client";
import { authErrorMessage } from "../auth-error";
import { AuthForm } from "../auth-form";

function ResetForm() {
  const router = useRouter();
  const { t } = useT();
  const token = useSearchParams().get("token");
  if (!token) {
    return (
      <Notice tone="warn" role="alert">
        <Rich text={t("reset.incomplete")} tags={{ link: (c) => <Link href="/forgot-password">{c}</Link> }} />
      </Notice>
    );
  }
  return (
    <AuthForm
      submitLabel={t("reset.submit")}
      fields={[{ name: "password", label: t("auth.newPassword"), type: "password", autoComplete: "new-password", hint: t("auth.passwordHint") }]}
      onSubmit={async ({ password }) => {
        const { error } = await authClient.resetPassword({ newPassword: password!, token });
        if (error) return authErrorMessage(t, error, "reset.failed");
        router.replace("/login");
        return null;
      }}
    />
  );
}

export default function ResetPasswordPage() {
  const { t } = useT();
  return (
    <>
      <h1 className={h1}>{t("reset.title")}</h1>
      <p className={`${muted} mt-1 mb-6`}>{t("reset.sub")}</p>
      <Suspense><ResetForm /></Suspense>
    </>
  );
}
