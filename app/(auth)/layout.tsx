import { CreditCard, ShieldCheck, Wallet } from 'lucide-react';
import Link from 'next/link';

import { Brand } from '@/components/shared/brand';

const POINTS = [
  { icon: Wallet, text: 'Parents load money and stay in control of limits.' },
  { icon: CreditCard, text: 'Learners pay with a school card at the tuck shop.' },
  { icon: ShieldCheck, text: 'Every rand is tracked in an auditable ledger.' },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="bg-brand-gradient relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex xl:p-14">
        <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(70%_60%_at_30%_30%,black,transparent)]" />
        <Link
          href="/"
          aria-label="FirstByte Tuckshop home"
          className="relative w-fit rounded-xl focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          <Brand tone="light" />
        </Link>
        <div className="relative space-y-8">
          <h2 className="font-heading max-w-md text-4xl leading-[1.1] font-extrabold tracking-tight text-balance xl:text-5xl">
            Tuck shop payments, <span className="text-highlight">simplified.</span>
          </h2>
          <ul className="space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-white/85">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
                  <p.icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm text-pretty xl:text-base">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/55">Cashless tuck shop for primary schools.</p>
      </aside>

      <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-canvas p-5 sm:p-8">
        <Link
          href="/"
          aria-label="FirstByte Tuckshop home"
          className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
        >
          <Brand />
        </Link>
        <main id="main" className="page-enter w-full max-w-md">
          {children}
        </main>
      </div>
    </div>
  );
}
