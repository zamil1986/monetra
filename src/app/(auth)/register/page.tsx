"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { h1, muted } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthForm } from "../auth-form";

export default function RegisterPage() {
  const router = useRouter();
  return (
    <>
      <h1 className={h1}>Create your account</h1>
      <p className={`${muted} mt-1 mb-6`}>You start with a cash wallet and the usual categories.</p>
      <AuthForm
        submitLabel="Create account"
        fields={[
          { name: "name", label: "Name", type: "text", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters." },
        ]}
        onSubmit={async ({ name, email, password }) => {
          // Day boundaries follow the profile time zone (PRD 3.1); the browser's is the best first guess.
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
          const { error } = await authClient.signUp.email({ name: name!.trim(), email: email!, password: password!, timezone });
          if (error) return error.code === "USER_ALREADY_EXISTS" ? "An account with that email already exists." : error.message ?? "Sign-up failed.";
          router.replace("/");
          router.refresh();
          return null;
        }}
      />
      <p className="mt-8 text-center">Already have an account? <Link href="/login">Sign in</Link></p>
    </>
  );
}
