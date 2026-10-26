/**
 * Money utilities. ALL monetary values in this codebase are INTEGER CENTS (ZAR).
 * No floating-point arithmetic is performed on money anywhere; parsing/formatting is done on
 * strings and integers only. (docs/PAYMENTS_AND_LEDGER.md §1)
 */

declare const centsBrand: unique symbol;
/** Integer number of cents. Branded so plain numbers cannot be passed accidentally. */
export type Cents = number & { readonly [centsBrand]: true };

/** Upper bound for a single amount: R 10 000 000.00. Keeps all sums far inside 2^53. */
export const MAX_CENTS = 1_000_000_000;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value))
    throw new MoneyError('Amount must be an integer number of cents.');
  if (Math.abs(value) > MAX_CENTS) throw new MoneyError('Amount is out of range.');
  return value as Cents;
}

export function addCents(a: Cents, b: Cents): Cents {
  return cents(a + b);
}

export function subCents(a: Cents, b: Cents): Cents {
  return cents(a - b);
}

/** Line total = unit price × quantity, in integer arithmetic with range checks. */
export function multiplyCents(unit: Cents, quantity: number): Cents {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new MoneyError('Quantity must be a non-negative integer.');
  }
  return cents(unit * quantity);
}

export function sumCents(values: readonly Cents[]): Cents {
  let total = 0;
  for (const v of values) total += v;
  return cents(total);
}

/**
 * Parse a user-entered rand amount ("R 12", "12.5", "1 234,50") into cents WITHOUT floats.
 * Accepts at most two decimal places. Returns null when the input is not a valid amount.
 */
export function parseRandToCents(input: string): Cents | null {
  const cleaned = input.replace(/[Rr\s\u00A0]/g, '').replace(',', '.');
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const rand = match[1] ?? '0';
  const frac = (match[2] ?? '').padEnd(2, '0');
  const value = Number(rand) * 100 + Number(frac);
  return Number.isSafeInteger(value) && value <= MAX_CENTS ? (value as Cents) : null;
}

/** Format cents as South African rand, e.g. 4700 -> "R47.00", 45300 -> "R453.00", -250 -> "-R2.50". */
export function formatRand(value: number): string {
  if (!Number.isSafeInteger(value)) throw new MoneyError('Cannot format a non-integer amount.');
  const negative = value < 0;
  const abs = Math.abs(value);
  const rand = Math.trunc(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  const frac = (abs % 100).toString().padStart(2, '0');
  return `${negative ? '-' : ''}R${rand}.${frac}`;
}
