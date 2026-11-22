"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/toast";
import { Button, Field, FieldError, inputClass, segButtonClass, segClass } from "@/components/ui";
import { TIMEZONES } from "@/domain/timezones";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n-client";
import { useOnline } from "@/lib/use-online";
import { authErrorMessage } from "../(auth)/auth-error";

/** Days, weeks and months start by this clock, on the web and the phone alike. */
export function TimezoneSwitch({ initial }: { initial: string }) {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const { t } = useT();
  const [zone, setZone] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: string) {
    if (next === zone || busy) return;
    const before = zone;
    setZone(next);
    setBusy(true);
    setError(null);
    const { error: refusal } = await authClient.updateUser({ timezone: next });
    setBusy(false);
    if (refusal) {
      setZone(before);
      return setError(authErrorMessage(t, refusal, "common.somethingWrong"));
    }
    toast({ message: t("settings.timezoneSaved") });
    router.refresh();
  }

  return (
    <div className="max-w-[400px]">
      <div className={segClass} role="group" aria-label={t("settings.timezone")}>
        {TIMEZONES.map((z) => (
          <button key={z.id} type="button" className={segButtonClass} aria-pressed={zone === z.id} disabled={!online || busy} onClick={() => choose(z.id)}>
            <span><strong>{z.label}</strong> <span className="font-normal opacity-75">{z.city}</span></span>
          </button>
        ))}
      </div>
      {!TIMEZONES.some((z) => z.id === zone) && <p className="mt-2 text-meta text-ink-2">{zone}</p>}
      {error && <div className="mt-2"><FieldError message={error} /></div>}
    </div>
  );
}

/** Same request as the phone (mobile/lib/data/api.dart): other sessions stay signed in. */
export function ChangePasswordForm() {
  const toast = useToast();
  const online = useOnline();
  const { t } = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field: "current" | "next"; message: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setError({ field: "next", message: t("auth.passwordHint") });
    setBusy(true);
    setError(null);
    const { error: refusal } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: false });
    setBusy(false);
    if (refusal) return setError({ field: refusal.code === "INVALID_PASSWORD" ? "current" : "next", message: authErrorMessage(t, refusal, "common.somethingWrong") });
    setCurrent("");
    setNext("");
    toast({ message: t("settings.passwordChanged") });
  }

  const errorFor = (field: "current" | "next") => (error?.field === field ? error.message : null);
  return (
    <form className="flex max-w-[400px] flex-col gap-4" onSubmit={submit} noValidate>
      <Field label={t("settings.currentPassword")} htmlFor="pw-current" error={errorFor("current")}>
        <input
          className={inputClass(!!errorFor("current"))} id="pw-current" type="password" autoComplete="current-password"
          value={current} onChange={(e) => { setCurrent(e.target.value); if (error?.field === "current") setError(null); }}
        />
      </Field>
      <Field label={t("auth.newPassword")} htmlFor="pw-next" error={errorFor("next")} hint={t("auth.passwordHint")} hintId="pw-next-h">
        <input
          className={inputClass(!!errorFor("next"))} id="pw-next" type="password" autoComplete="new-password" aria-describedby="pw-next-h"
          value={next} onChange={(e) => { setNext(e.target.value); if (error?.field === "next") setError(null); }}
        />
      </Field>
      <div><Button type="submit" variant="secondary" disabled={busy || !online || !current || !next}>{t("settings.savePassword")}</Button></div>
    </form>
  );
}
