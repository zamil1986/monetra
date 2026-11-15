"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, cx, inputClass, segButtonClass, segClass } from "@/components/ui";
import type { PeriodKind } from "@/domain/period";

const OPTIONS: { kind: PeriodKind; short: string; long?: string }[] = [
  { kind: "today", short: "Today" },
  { kind: "week", short: "week", long: "This " },
  { kind: "month", short: "month", long: "This " },
  { kind: "year", short: "year", long: "This " },
  { kind: "custom", short: "Custom" },
];

/** The Periode lives in the URL, so the same view opens on the other device. */
export function PeriodFilter({ kind, from, to }: { kind: PeriodKind; from: string; to: string }) {
  const router = useRouter();
  const path = usePathname();
  const [showCustom, setShowCustom] = useState(kind === "custom");
  const [range, setRange] = useState({ from, to });

  const go = (params: Record<string, string>) => {
    const query = new URLSearchParams(params);
    router.replace(query.size ? `${path}?${query}` : path);
  };
  const pick = (next: PeriodKind) => {
    if (next === "custom") return setShowCustom(true);
    setShowCustom(false);
    go(next === "month" ? {} : { period: next });
  };
  const pressed = (k: PeriodKind) => (showCustom ? k === "custom" : k === kind);

  return (
    <div className="flex flex-col gap-3 max-md:w-full">
      <div className={cx(segClass, "max-md:w-full")} role="group" aria-label="Period">
        {OPTIONS.map((o) => (
          <button key={o.kind} type="button" className={cx(segButtonClass, "min-h-10 px-3 text-sm")} aria-pressed={pressed(o.kind)} onClick={() => pick(o.kind)}>
            {o.long && <span className="max-md:hidden">{o.long}</span>}
            <span className={o.long ? "md:lowercase max-md:capitalize" : undefined}>{o.short}</span>
          </button>
        ))}
      </div>
      {showCustom && (
        <form
          className="flex flex-wrap items-end gap-2.5"
          aria-label="Custom date range"
          onSubmit={(e) => {
            e.preventDefault();
            go({ period: "custom", from: range.from, to: range.to });
          }}
        >
          <Field label="From" htmlFor="p-from" className="flex-[1_1_140px]">
            <input id="p-from" type="date" required className={inputClass()} value={range.from} max={range.to || undefined}
              onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </Field>
          <Field label="To" htmlFor="p-to" className="flex-[1_1_140px]">
            <input id="p-to" type="date" required className={inputClass()} value={range.to} min={range.from || undefined}
              onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </Field>
          <Button type="submit" variant="secondary">Show</Button>
        </form>
      )}
    </div>
  );
}
