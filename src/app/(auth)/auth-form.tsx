"use client";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button, Field, Notice, inputClass } from "@/components/ui";

export type AuthField = {
  name: string;
  label: string;
  type: "email" | "password" | "text";
  autoComplete: string;
  hint?: ReactNode;
};

/**
 * One form for every sign-in screen: locks the button while the request runs, and shows the
 * server's refusal above the button without clearing what was typed.
 */
export function AuthForm({
  fields,
  submitLabel,
  onSubmit,
  after,
}: {
  fields: AuthField[];
  submitLabel: string;
  /** Resolves to an error message to show, or null when it worked. */
  onSubmit: (values: Record<string, string>) => Promise<string | null>;
  after?: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(fields.map((f) => [f.name, String(data.get(f.name) ?? "")]));
    setBusy(true);
    setError(null);
    try {
      setError(await onSubmit(values));
    } catch {
      setError("Couldn't reach Monetra. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate={false}>
      {fields.map((f) => (
        <Field key={f.name} label={f.label} htmlFor={f.name} hint={f.hint}>
          <input className={inputClass()} id={f.name} name={f.name} type={f.type} autoComplete={f.autoComplete} required />
        </Field>
      ))}
      {error && <Notice tone="warn" role="alert">{error}</Notice>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "Please wait…" : submitLabel}</Button>
      {after}
    </form>
  );
}
