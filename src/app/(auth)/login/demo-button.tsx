"use client";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, hintClass } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

/** "Coba demo" (PRD 3.1): a fresh Akun demo full of sample data, signed in straight away. */
export function DemoButton() {
  const router = useRouter();
  const { t } = useT();
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  return (
    <div className="mt-6 flex flex-col gap-2 border-t border-line pt-6">
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          const res = await fetch("/api/auth/demo", { method: "POST" }).catch(() => null);
          if (!res?.ok) return setState("failed");
          router.replace("/");
          router.refresh();
        }}
      >
        <Play />{state === "busy" ? t("demo.preparing") : t("demo.try")}
      </Button>
      <p className={hintClass}>
        {state === "failed" ? t("demo.failed") : t("demo.hint")}
      </p>
    </div>
  );
}
