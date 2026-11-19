import type { ReactNode } from "react";

/** Sign-in screens: cobalt pitch on the left (desktop only), the form on the right. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-background md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-cobalt p-10 text-on-cobalt md:flex">
        <span className="fig block text-[28px] font-black leading-none text-white [&_b]:text-yellow">MONETRA<b>.</b></span>
        <div className="max-w-[40ch]">
          <h2 className="text-3xl font-bold leading-tight text-white">Know where your money is.</h2>
          <p className="mt-3">Record income, expenses and transfers across your wallets. The same figures on your Mac and on your phone.</p>
        </div>
        <span className="text-meta">Rupiah, whole numbers, your time zone.</span>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
        <div className="w-full max-w-[400px]">
          <span className="fig mb-8 block text-2xl font-black leading-none text-cobalt md:hidden [&_b]:text-yellow">MONETRA<b>.</b></span>
          {children}
        </div>
      </main>
    </div>
  );
}
