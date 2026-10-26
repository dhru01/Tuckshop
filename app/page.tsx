import { ArrowRight, CreditCard, ShieldCheck, ShoppingBasket, Wallet } from 'lucide-react';
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
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <Brand />
          <nav aria-label="Account" className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Create account</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="relative overflow-hidden">
          <div className="bg-dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(60%_70%_at_50%_0%,black,transparent)]" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="page-enter space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase ring-1 ring-primary/15 ring-inset">
                <span className="size-1.5 rounded-full bg-highlight" aria-hidden="true" />
                Built for South African primary schools
              </span>
              <h1 className="font-heading text-4xl leading-[1.05] font-extrabold tracking-tight text-balance md:text-6xl">
                Cashless tuck shop payments for primary schools
              </h1>
              <p className="max-w-xl text-lg text-pretty text-muted-foreground">
                Parents load money, learners tap a school card, and schools get accurate sales and
                stock reporting.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/register">
                    Create account
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>

            {/* Illustrative wallet card – decorative only, shows no real data. */}
            <div aria-hidden="true" className="relative mx-auto w-full max-w-sm">
              <div className="bg-brand-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-lift ring-1 ring-white/10">
                <div className="bg-dot-grid absolute inset-0 opacity-20" />
                <div className="relative flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.16em] text-white/70 uppercase">
                    Wallet
                  </span>
                  <CreditCard className="size-6 text-white/80" />
                </div>
                <p className="font-heading relative mt-10 text-sm text-white/70">Available balance</p>
                <p className="font-heading num relative text-5xl font-extrabold tracking-tight">
                  R ••••
                </p>
                <div className="relative mt-8 flex items-center justify-between text-xs text-white/70">
                  <span>FirstByte Tuckshop</span>
                  <span className="rounded-full bg-highlight px-2.5 py-1 font-semibold text-highlight-foreground">
                    Tap to pay
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label="Features"
          className="mx-auto grid w-full max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4"
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group space-y-4 rounded-2xl bg-card p-6 shadow-card ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-soft text-primary transition-transform group-hover:scale-105">
                <f.icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="font-heading text-base font-semibold">{f.title}</h2>
              <p className="text-sm text-pretty text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted-foreground">
        Product in development. Privacy notice and terms will be published before any school pilot.
      </footer>
    </div>
  );
}
