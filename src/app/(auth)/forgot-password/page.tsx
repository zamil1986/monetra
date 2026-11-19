"use client";
import Link from "next/link";
import { useState } from "react";
import { Notice, h1, muted } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthForm } from "../auth-form";

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  return (
    <>
      <h1 className={h1}>Reset your password</h1>
      <p className={`${muted} mt-1 mb-6`}>We&apos;ll email you a link to choose a new one.</p>
      {sentTo ? (
        <Notice tone="info" role="status">
          If <strong>{sentTo}</strong> has an account, a reset link is on its way. It expires in one hour.
        </Notice>
      ) : (
        <AuthForm
          submitLabel="Send reset link"
          fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
          onSubmit={async ({ email }) => {
            const { error } = await authClient.requestPasswordReset({ email: email!, redirectTo: "/reset-password" });
            if (error) return error.message ?? "Couldn't send the link.";
            setSentTo(email!);
            return null;
          }}
        />
      )}
      <p className="mt-8 text-center"><Link href="/login">Back to sign in</Link></p>
    </>
  );
}
