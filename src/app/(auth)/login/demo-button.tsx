"use client";
import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, hintClass } from "@/components/ui";

/** "Coba demo" (PRD 3.1): a fresh Akun demo full of sample data, signed in straight away. */
export function DemoButton() {
  const router = useRouter();
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
        <Play />{state === "busy" ? "Preparing the demo…" : "Try demo"}
      </Button>
      <p className={hintClass}>
        {state === "failed"
          ? "The demo couldn't start. Try again in a moment."
          : "Opens a sample account already filled with wallets and transactions. No sign-up. It expires after 24 hours."}
      </p>
    </div>
  );
}
