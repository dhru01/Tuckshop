import { CreditCard, ShieldCheck, ShoppingBasket, Wallet } from 'lucide-react';
import Link from 'next/link';

import { Brand } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: Wallet,
    title: 'Parents stay in control',
    text: "Top up a child's wallet, set daily and weekly limits and freeze a card in seconds.",
  },
  {
    icon: CreditCard,
    title: 'Secure school cards',
    text: 'Cards identify the learner only. Money lives in a protected, auditable ledger.',
  },
  {
    icon: ShoppingBasket,
    title: 'Fast tuck shop checkout',
    text: 'A touchscreen point of sale built for busy break times, with barcode scanning.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for schools',
    text: 'Each school is fully separated, with role-based access and a full audit trail.',
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between p-4">
        <Brand />
        <nav aria-label="Account" className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Create account</Link>
          </Button>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 md:py-20">
        <section className="max-w-2xl space-y-5">
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Cashless tuck shop payments for primary schools
          </h1>
          <p className="text-lg text-pretty text-muted-foreground">
            Parents load money, learners tap a school card, and schools get accurate sales and stock
            reporting. Built for South African schools.
          </p>
        </section>

        <section aria-label="Features" className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="font-medium">{f.title}</h2>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl p-4 text-xs text-muted-foreground">
        Product in development. Privacy notice and terms will be published before any school pilot.
      </footer>
    </div>
  );
}
