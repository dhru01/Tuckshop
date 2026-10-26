'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import {
  confirmCheckoutAction,
  previewCheckoutAction,
  resolvePurchaseStatusAction,
} from '@/app/actions/pos';
import { FormError } from '@/components/auth/form-message';
import { useIsOnline } from '@/components/shared/connection-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimulatedTapPanel } from '@/components/nfc/simulated-tap-panel';
import { normaliseCredentialReference } from '@/lib/nfc/credential';
import { parseKeyboardWedgeInput } from '@/lib/nfc/keyboard-wedge';
import { formatRand } from '@/lib/wallets/money';

export type PosProduct = {
  id: string;
  name: string;
  priceCents: number;
  barcode: string | null;
  categoryId: string;
};

export type PosCategory = { id: string; name: string; colour: string | null };

type BasketLine = { productId: string; quantity: number };

type CheckoutStep = 'sell' | 'tap' | 'preview' | 'processing' | 'success' | 'failed' | 'unknown';

const SESSION_KEY = 'tuckshop.pos.session';

type PosSession = {
  shiftId: string;
  posDeviceId: string | null;
};

/** Stable snapshot for useSyncExternalStore (must not return a new object every read). */
let sessionSnapshotRaw: string | null | undefined;
let sessionSnapshot: PosSession | null = null;

function readSession(): PosSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw === sessionSnapshotRaw) return sessionSnapshot;
    sessionSnapshotRaw = raw;
    if (!raw) {
      sessionSnapshot = null;
      return null;
    }
    sessionSnapshot = JSON.parse(raw) as PosSession;
    return sessionSnapshot;
  } catch {
    sessionSnapshotRaw = null;
    sessionSnapshot = null;
    return null;
  }
}

function subscribeSession(onChange: () => void) {
  const handler = () => {
    sessionSnapshotRaw = undefined;
    onChange();
  };
  window.addEventListener('storage', handler);
  window.addEventListener('tuckshop:pos-session', handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('tuckshop:pos-session', handler);
  };
}

export function PosSellView({
  categories,
  products,
  allowSimulatedTap,
}: {
  categories: PosCategory[];
  products: PosProduct[];
  allowSimulatedTap: boolean;
}) {
  const online = useIsOnline();
  const [categoryId, setCategoryId] = useState<string | 'all'>('all');
  const [search, setSearch] = useState('');
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [step, setStep] = useState<CheckoutStep>('sell');
  const [error, setError] = useState<string | undefined>(undefined);
  const [credential, setCredential] = useState('');
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    receiptNumber: number;
    totalCents: number;
    balanceAfterCents: number;
    learnerName: string;
  } | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const wedgeRef = useRef<HTMLInputElement>(null);
  const session = useSyncExternalStore(subscribeSession, readSession, () => null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId !== 'all' && p.categoryId !== categoryId) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.barcode?.toLowerCase().includes(q) ?? false);
    });
  }, [products, categoryId, search]);

  const totalCents = useMemo(() => {
    let t = 0;
    for (const line of basket) {
      const p = products.find((x) => x.id === line.productId);
      if (p) t += p.priceCents * line.quantity;
    }
    return t;
  }, [basket, products]);

  const addProduct = useCallback((productId: string) => {
    setBasket((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l,
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }, []);

  const changeLineQuantity = useCallback((productId: string, delta: number) => {
    setBasket((prev) => {
      const line = prev.find((l) => l.productId === productId);
      if (!line) return prev;
      const nextQty = line.quantity + delta;
      if (nextQty <= 0) return prev.filter((l) => l.productId !== productId);
      if (nextQty > 99) return prev;
      return prev.map((l) =>
        l.productId === productId ? { ...l, quantity: nextQty } : l,
      );
    });
    setError(undefined);
  }, []);

  const removeLine = useCallback((productId: string) => {
    setBasket((prev) => prev.filter((l) => l.productId !== productId));
    setError(undefined);
  }, []);

  const onBarcodeEnter = (value: string) => {
    const code = value.trim();
    if (!code) return;
    const match = products.find((p) => p.barcode === code);
    if (match) addProduct(match.id);
    else setError(`Unknown barcode: ${code}`);
    setSearch('');
    if (barcodeRef.current) barcodeRef.current.value = '';
  };

  const startCheckout = () => {
    if (!session?.shiftId) {
      setError('Open a shift before selling (Shift menu).');
      return;
    }
    if (basket.length === 0) {
      setError('Add items to the basket first.');
      return;
    }
    if (!online) {
      setError('You are offline. Checkout is disabled until you reconnect.');
      return;
    }
    setError(undefined);
    setIdempotencyKey(`pos:${crypto.randomUUID()}`);
    setStep('tap');
  };

  const runPreviewWithCred = useCallback(
    async (credRaw: string) => {
      if (!idempotencyKey) return;
      setError(undefined);
      const cred = normaliseCredentialReference(credRaw);
      setCredential(cred);
      const result = await previewCheckoutAction(cred, basket);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPreview(result.preview);
      setStep('preview');
    },
    [basket, idempotencyKey],
  );

  const runPreview = () => void runPreviewWithCred(credential);

  const runConfirm = async () => {
    if (!idempotencyKey || !session?.shiftId) return;
    setStep('processing');
    setError(undefined);
    const cred = normaliseCredentialReference(credential);
    try {
      const result = await confirmCheckoutAction({
        credentialRaw: cred,
        lines: basket,
        shiftId: session.shiftId,
        posDeviceId: session.posDeviceId,
        idempotencyKey,
      });
      if (result.ok) {
        setSuccess({
          receiptNumber: result.receiptNumber,
          totalCents: result.totalCents,
          balanceAfterCents: result.balanceAfterCents,
          learnerName: result.learnerName,
        });
        setBasket([]);
        setStep('success');
        return;
      }
      if (result.unknown) {
        setStep('unknown');
        return;
      }
      setError(result.message);
      setStep('failed');
    } catch {
      setStep('unknown');
    }
  };

  const checkUnknown = async () => {
    if (!idempotencyKey) return;
    const result = await resolvePurchaseStatusAction(idempotencyKey);
    if (result.ok) {
      setSuccess({
        receiptNumber: result.receiptNumber,
        totalCents: result.totalCents,
        balanceAfterCents: result.balanceAfterCents,
        learnerName: result.learnerName || 'Learner',
      });
      setBasket([]);
      setStep('success');
    } else {
      setError(result.message);
      setStep('failed');
    }
  };

  const resetFlow = () => {
    setStep('sell');
    setPreview(null);
    setCredential('');
    setIdempotencyKey(null);
    setSuccess(null);
    setError(undefined);
  };

  useEffect(() => {
    if (step === 'tap') wedgeRef.current?.focus();
  }, [step]);

  const onWedgeInput = (raw: string) => {
    const parsed = parseKeyboardWedgeInput(raw);
    if (!parsed) return;
    void runPreviewWithCred(normaliseCredentialReference(parsed.uid));
  };

  if (!session?.shiftId) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40">
        <p className="font-medium">Shift required</p>
        <p className="text-muted-foreground">Open a shift from the Shift page before taking payments.</p>
      </div>
    );
  }

  if (step === 'success' && success) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-background p-6 text-center">
        <p className="text-lg font-semibold text-success">Payment successful</p>
        <p className="text-2xl font-bold tabular-nums">{formatRand(success.totalCents)}</p>
        <p className="text-sm text-muted-foreground">
          {success.learnerName} · Receipt #{success.receiptNumber}
        </p>
        <p className="text-sm">Remaining balance: {formatRand(success.balanceAfterCents)}</p>
        <Button type="button" size="lg" className="min-h-12 w-full" onClick={resetFlow}>
          Next customer
        </Button>
      </div>
    );
  }

  if (step === 'unknown') {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-background p-6">
        <p className="font-medium">Outcome unknown</p>
        <p className="text-sm text-muted-foreground">
          The connection dropped before we got a result. Check status before trying a new payment.
        </p>
        <FormError message={error} />
        <Button type="button" className="min-h-12 w-full" onClick={checkUnknown}>
          Check payment status
        </Button>
        <Button type="button" variant="outline" className="min-h-12 w-full" onClick={resetFlow}>
          Cancel
        </Button>
      </div>
    );
  }

  if (step === 'tap' || step === 'preview' || step === 'processing' || step === 'failed') {
    const learner = preview?.learner as { display_name?: string; grade?: string } | undefined;
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-lg border border-border bg-background p-6">
        <FormError message={error} />
        {step === 'tap' && (
          <>
            <p className="text-lg font-medium">Tap school card</p>
            <p className="text-sm text-muted-foreground">Total: {formatRand(totalCents)}</p>
            <input
              ref={wedgeRef}
              type="text"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const el = e.currentTarget;
                  onWedgeInput(el.value);
                  el.value = '';
                }
              }}
            />
            {allowSimulatedTap ? (
              <SimulatedTapPanel
                disabled={step !== 'tap'}
                onUid={(uid) => {
                  setCredential(uid);
                }}
              />
            ) : (
              <p className="text-sm">Use your connected card reader. Simulated tap is disabled in this environment.</p>
            )}
            {allowSimulatedTap ? (
              <div className="space-y-2">
                <Label htmlFor="card-uid">Or paste credential reference</Label>
                <Input
                  id="card-uid"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder="uid:53:b9:89:cd:74:00:01"
                  className="min-h-12"
                />
              </div>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="min-h-12 w-full"
              disabled={!credential.trim()}
              onClick={runPreview}
            >
              Continue
            </Button>
            <Button type="button" variant="ghost" onClick={resetFlow}>Back to basket</Button>
          </>
        )}
        {step === 'preview' && preview && (
          <>
            <p className="text-lg font-medium">Confirm payment</p>
            <p className="text-sm">
              {learner?.display_name} · Grade {learner?.grade}
            </p>
            <p className="text-2xl font-bold tabular-nums">{formatRand(Number(preview.total_cents))}</p>
            <p className="text-sm text-muted-foreground">
              Balance before: {formatRand(Number(preview.wallet_balance_cents))}
            </p>
            <Button type="button" size="lg" className="min-h-12 w-full" onClick={runConfirm}>
              Confirm payment
            </Button>
            <Button type="button" variant="outline" onClick={() => setStep('tap')}>Back</Button>
          </>
        )}
        {step === 'processing' && (
          <p className="text-center text-muted-foreground" role="status" aria-live="polite">
            Processing payment…
          </p>
        )}
        {step === 'failed' && (
          <Button type="button" className="min-h-12 w-full" onClick={resetFlow}>Back to basket</Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={categoryId === 'all' ? 'default' : 'outline'}
            className="min-h-11"
            onClick={() => setCategoryId('all')}
          >
            All
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              type="button"
              size="sm"
              variant={categoryId === c.id ? 'default' : 'outline'}
              className="min-h-11"
              onClick={() => setCategoryId(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
        <Input
          ref={barcodeRef}
          placeholder="Scan barcode or search…"
          className="min-h-12 text-base"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onBarcodeEnter(search);
          }}
        />
        <FormError message={error} />
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="flex min-h-[4.5rem] w-full flex-col items-start justify-center rounded-xl border border-border bg-background p-4 text-left hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => addProduct(p.id)}
              >
                <span className="font-medium">{p.name}</span>
                <span className="text-sm tabular-nums text-muted-foreground">{formatRand(p.priceCents)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <aside className="space-y-4 rounded-xl border border-border bg-background p-4">
        <h2 className="font-medium">Basket</h2>
        {basket.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tap products to add them.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {basket.map((line) => {
              const p = products.find((x) => x.id === line.productId);
              if (!p) return null;
              return (
                <li
                  key={line.productId}
                  className="space-y-2 rounded-xl border border-border bg-muted/30 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-snug">{p.name}</span>
                    <span className="num shrink-0 font-semibold">
                      {formatRand(p.priceCents * line.quantity)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-lg"
                      className="min-h-12 min-w-12 shrink-0"
                      aria-label={`Remove one ${p.name}`}
                      onClick={() => changeLineQuantity(line.productId, -1)}
                    >
                      <Minus className="size-5" aria-hidden="true" />
                    </Button>
                    <span
                      className="num min-w-10 text-center text-base font-semibold"
                      aria-live="polite"
                      aria-label={`Quantity: ${line.quantity}`}
                    >
                      {line.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-lg"
                      className="min-h-12 min-w-12 shrink-0"
                      aria-label={`Add one ${p.name}`}
                      disabled={line.quantity >= 99}
                      onClick={() => changeLineQuantity(line.productId, 1)}
                    >
                      <Plus className="size-5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      className="ml-auto min-h-12 min-w-12 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove all ${p.name} from basket`}
                      onClick={() => removeLine(line.productId)}
                    >
                      <Trash2 className="size-5" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-lg font-semibold tabular-nums">Total {formatRand(totalCents)}</p>
        <Button
          type="button"
          size="lg"
          className="min-h-14 w-full text-base"
          disabled={basket.length === 0 || !online}
          onClick={startCheckout}
        >
          Checkout
        </Button>
        {!online ? (
          <p className="text-xs text-danger">Offline — checkout disabled</p>
        ) : null}
        {basket.length > 0 ? (
          <Button type="button" variant="ghost" className="w-full" onClick={() => setBasket([])}>
            Clear basket
          </Button>
        ) : null}
      </aside>
    </div>
  );
}
