import { CircleAlert, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Joins class names, skipping falsy ones. */
export const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

/* Typography */
export const h1 = "text-2xl font-bold leading-tight";
export const h2 = "text-lg font-bold leading-snug";
export const muted = "text-ink-2";

/* Buttons */
type ButtonVariant = "primary" | "secondary" | "quiet" | "danger" | "dangerSolid" | "yellow";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-cobalt bg-cobalt text-white hover:border-cobalt-deep hover:bg-cobalt-deep",
  secondary: "border-ink bg-transparent text-ink hover:bg-panel",
  quiet: "border-transparent bg-transparent px-2 text-cobalt-ink hover:bg-cobalt-soft",
  danger: "border-red bg-transparent text-red hover:bg-red-soft",
  dangerSolid: "border-red bg-red text-paper hover:border-red-deep hover:bg-red-deep",
  yellow: "border-yellow bg-yellow text-on-yellow hover:border-yellow-deep hover:bg-yellow-deep",
};

export function buttonClass(variant: ButtonVariant = "primary", size: "md" | "lg" = "md", className?: string) {
  return cx(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded border px-4 py-2 font-semibold no-underline",
    "transition-[background-color,border-color,transform] duration-150 ease-out-expo active:translate-y-px",
    "disabled:cursor-not-allowed disabled:border-line disabled:bg-panel disabled:text-ink-3 disabled:active:translate-y-0",
    size === "lg" ? "min-h-12 text-base" : "min-h-10 text-[15px]",
    BUTTON_VARIANTS[variant],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "md" | "lg" }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function iconButtonClass(danger = false) {
  return cx(
    "inline-grid size-11 md:size-9 cursor-pointer place-items-center rounded border-0 bg-transparent text-ink-2 no-underline",
    "hover:bg-panel hover:text-ink disabled:cursor-not-allowed disabled:bg-transparent disabled:text-disabled",
    danger && "hover:bg-red-soft hover:text-red",
  );
}

/* Form controls */
export function inputClass(invalid = false, className?: string) {
  return cx(
    // 16px, not 15: iOS Safari zooms the page into any focused field set smaller than 16px.
    "min-h-11 w-full rounded border bg-surface px-3 py-[9px] text-[16px] placeholder:text-ink-3",
    "transition-[border-color,box-shadow] duration-150 ease-out-expo hover:border-ink",
    "focus-visible:border-cobalt-ink focus-visible:shadow-[0_0_0_2px_var(--color-cobalt-ink)] focus-visible:outline-0",
    "disabled:border-line disabled:bg-panel disabled:text-ink-3",
    invalid ? "border-red shadow-[0_0_0_1px_var(--color-red)]" : "border-field",
    className,
  );
}

export const labelClass = "text-meta font-semibold";
export const hintClass = "text-meta text-ink-2";

export function FieldError({ message, id }: { message?: string | null; id?: string }) {
  if (!message) return null;
  return (
    <span className="flex items-start gap-1.5 text-meta font-medium text-red" id={id} role="alert">
      <CircleAlert className="mt-0.5 size-[15px]!" />
      {message}
    </span>
  );
}

/** A labelled control. Pass `htmlFor` for a single input, or `legendId` for a group labelled by its legend. */
export function Field(props: {
  label: ReactNode;
  htmlFor?: string;
  legendId?: string;
  error?: string | null;
  hint?: ReactNode;
  hintId?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", props.className)}>
      {props.htmlFor ? (
        <label className={labelClass} htmlFor={props.htmlFor}>{props.label}</label>
      ) : (
        <span className={labelClass} id={props.legendId}>{props.label}</span>
      )}
      {props.children}
      <FieldError message={props.error} />
      {/* The error says what to fix; the hint would only say it again. */}
      {props.hint && !props.error && <span className={hintClass} id={props.hintId}>{props.hint}</span>}
    </div>
  );
}

export function chipClass(className?: string) {
  return cx(
    "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded border border-field bg-surface px-3 py-[7px] text-sm font-medium text-ink",
    "transition-[background-color,border-color] duration-150 ease-out-expo hover:border-ink [&_svg]:size-4!",
    "aria-checked:border-ink aria-checked:bg-ink aria-checked:text-paper aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper",
    className,
  );
}

/* Segmented control: a row of mutually exclusive buttons. */
export const segClass = "flex overflow-hidden rounded border border-ink";
export const segButtonClass = cx(
  "inline-flex min-h-[46px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 border-0 border-r border-ink bg-transparent px-3.5 py-2",
  // Three Indonesian labels must fit a 390px phone: tighter padding, and the icons go first.
  "max-md:gap-1.5 max-md:px-2 max-[420px]:[&_svg]:hidden",
  "whitespace-nowrap text-[15px] font-medium text-ink-2 transition-colors duration-150 ease-out-expo last:border-r-0",
  "hover:bg-panel hover:text-ink aria-pressed:bg-ink aria-pressed:font-semibold aria-pressed:text-paper",
);

/* Notices */
type Tone = "info" | "warn" | "danger" | "neutral";
const TONES: Record<Tone, { box: string; Icon: LucideIcon | null }> = {
  info: { box: "border-cobalt-edge bg-cobalt-soft text-cobalt-text", Icon: Info },
  warn: { box: "border-amber-edge bg-amber-soft text-amber-text", Icon: TriangleAlert },
  danger: { box: "border-red-edge bg-red-soft text-red-text", Icon: CircleAlert },
  neutral: { box: "border-line bg-panel", Icon: null },
};

export function Notice({
  tone = "neutral",
  icon,
  role,
  className,
  children,
}: {
  tone?: Tone;
  icon?: LucideIcon | null;
  role?: "alert" | "status";
  className?: string;
  children: ReactNode;
}) {
  const { box, Icon: defaultIcon } = TONES[tone];
  const Icon = icon === undefined ? defaultIcon : icon;
  return (
    <div className={cx("flex items-start gap-2.5 rounded border px-3.5 py-3 text-sm [&_a]:text-inherit", box, className)} role={role}>
      {Icon && <Icon className="mt-px" />}
      <div>{children}</div>
    </div>
  );
}

export const noticeActions = "mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 font-semibold";

/* Page frame */
export function PageHead({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-4 py-3 md:min-h-[68px] md:px-8">
      {children}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="max-w-[1240px] px-4 pt-5 pb-10 md:px-8 md:pt-7 md:pb-[72px]">{children}</main>;
}

export const spacer = "flex-1";

/** Main column plus a 440px side panel, stacked until the window is wide enough. */
export const splitClass = "grid grid-cols-[minmax(0,1fr)] items-start gap-8 wide:grid-cols-[minmax(0,1fr)_440px] wide:gap-10";
export const sidePanel = "rounded-xl bg-panel p-5";

/* Lists of rows separated by hairlines */
export const rowsClass = "border-t-2 border-ink";
export const rowClass = "flex min-w-0 items-center gap-3 border-b border-line py-3";
export const rowTitle = "block truncate font-semibold";
export const rowSub = "block text-meta text-ink-2";
export const rowFig = "fig whitespace-nowrap text-lg md:text-xl";

/* Visibility per layout */
export const onlyDesktop = "max-md:hidden!";
export const onlyMobile = "md:hidden!";
