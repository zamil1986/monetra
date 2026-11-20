"use client";
import Link from "next/link";
import { useState } from "react";
import { Rich } from "@/components/rich";
import { Notice, h1, muted } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n-client";
import { authErrorMessage } from "../auth-error";
import { AuthForm } from "../auth-form";

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [sentTo, setSentTo] = useState<string | null>(null);
  return (
    <>
      <h1 className={h1}>{t("forgot.title")}</h1>
      <p className={`${muted} mt-1 mb-6`}>{t("forgot.sub")}</p>
      {sentTo ? (
        <Notice tone="info" role="status">
          <Rich text={t("forgot.sent", { email: sentTo })} />
        </Notice>
      ) : (
        <AuthForm
          submitLabel={t("forgot.submit")}
          fields={[{ name: "email", label: t("common.email"), type: "email", autoComplete: "email" }]}
          onSubmit={async ({ email }) => {
            const { error } = await authClient.requestPasswordReset({ email: email!, redirectTo: "/reset-password" });
            if (error) return authErrorMessage(t, error, "forgot.failed");
            setSentTo(email!);
            return null;
          }}
        />
      )}
      <p className="mt-8 text-center"><Link href="/login">{t("forgot.back")}</Link></p>
    </>
  );
}
