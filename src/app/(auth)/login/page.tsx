"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { h1, muted } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { AuthForm } from "../auth-form";
import { DemoButton } from "./demo-button";

export default function LoginPage() {
  const router = useRouter();
  return (
    <>
      <h1 className={h1}>Sign in</h1>
      <p className={`${muted} mt-1 mb-6`}>Use the email you registered with.</p>
      <AuthForm
        submitLabel="Sign in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password", label: "Password", type: "password", autoComplete: "current-password",
            hint: <Link href="/forgot-password">Forgot password?</Link>,
          },
        ]}
        onSubmit={async ({ email, password }) => {
          const { error } = await authClient.signIn.email({ email: email!, password: password! });
          if (error) return error.status === 401 ? "That email and password don't match an account." : error.message ?? "Sign-in failed.";
          router.replace("/");
          router.refresh();
          return null;
        }}
      />
      <DemoButton />
      <p className="mt-8 text-center">No account yet? <Link href="/register">Create one</Link></p>
      <p className="mt-2 text-center text-meta"><Link href="/download">Get the Android app</Link></p>
    </>
  );
}
