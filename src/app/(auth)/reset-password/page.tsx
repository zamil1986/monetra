"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Notice, h1, muted } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthForm } from "../auth-form";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  if (!token) {
    return (
      <Notice tone="warn" role="alert">
        This reset link is incomplete or has expired. <Link href="/forgot-password">Ask for a new one</Link>.
      </Notice>
    );
  }
  return (
    <AuthForm
      submitLabel="Save new password"
      fields={[{ name: "password", label: "New password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." }]}
      onSubmit={async ({ password }) => {
        const { error } = await authClient.resetPassword({ newPassword: password!, token });
        if (error) return error.message ?? "Couldn't save the new password.";
        router.replace("/login");
        return null;
      }}
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className={h1}>Choose a new password</h1>
      <p className={`${muted} mt-1 mb-6`}>You&apos;ll be signed out everywhere else.</p>
      <Suspense><ResetForm /></Suspense>
    </>
  );
}
