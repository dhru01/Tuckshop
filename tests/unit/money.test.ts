import { describe, expect, it } from 'vitest';

import {
  MAX_CENTS,
  MoneyError,
  addCents,
  cents,
  formatRand,
  multiplyCents,
  parseRandToCents,
  subCents,
  sumCents,
} from '@/lib/wallets/money';

describe('cents()', () => {
  it('accepts integers', () => {
    expect(cents(0)).toBe(0);
    expect(cents(50_000)).toBe(50_000);
    expect(cents(-250)).toBe(-250);
  });

  it.each([0.5, 12.34, NaN, Infinity, -Infinity])('rejects non-integer %s', (v) => {
    expect(() => cents(v)).toThrow(MoneyError);
  });

  it('rejects out-of-range amounts', () => {
    expect(() => cents(MAX_CENTS + 1)).toThrow(MoneyError);
    expect(() => cents(-MAX_CENTS - 1)).toThrow(MoneyError);
  });
});

describe('integer arithmetic', () => {
  it('reproduces the brief example: R500 top-up, R47 purchase -> R453', () => {
    const topUp = cents(50_000);
    const chips = multiplyCents(cents(1_200), 1);
    const juice = multiplyCents(cents(1_000), 1);
    const sandwich = multiplyCents(cents(2_500), 1);
    const total = sumCents([chips, juice, sandwich]);
    expect(total).toBe(4_700);
    expect(formatRand(total)).toBe('R47.00');
    const balance = subCents(topUp, total);
    expect(balance).toBe(45_300);
    expect(formatRand(balance)).toBe('R453.00');
  });

  it('has no floating point drift (0.1 + 0.2 class of bugs)', () => {
    // 10 cents + 20 cents is exactly 30 cents.
    expect(addCents(cents(10), cents(20))).toBe(30);
    // 1999 cents * 3 stays exact.
    expect(multiplyCents(cents(1_999), 3)).toBe(5_997);
  });

  it('rejects invalid quantities', () => {
    expect(() => multiplyCents(cents(100), -1)).toThrow(MoneyError);
    expect(() => multiplyCents(cents(100), 1.5)).toThrow(MoneyError);
  });

  it('guards against overflow beyond the allowed range', () => {
    expect(() => multiplyCents(cents(MAX_CENTS), 2)).toThrow(MoneyError);
  });

  it('sums an empty list to zero', () => {
    expect(sumCents([])).toBe(0);
  });
});

describe('parseRandToCents()', () => {
  it.each([
    ['50', 5_000],
    ['R50', 5_000],
    ['R 100', 10_000],
    ['12.5', 1_250],
    ['12,50', 1_250],
    ['12.05', 1_205],
    ['0.99', 99],
    ['500.00', 50_000],
    ['1 000', 100_000],
  ])('parses %s -> %d cents', (input, expected) => {
    expect(parseRandToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '12.345', '-5', '1e3', '12..5', 'R', '1,000.00.1'])('rejects %j', (input) => {
    expect(parseRandToCents(input)).toBeNull();
  });
});

describe('formatRand()', () => {
  it.each([
    [0, 'R0.00'],
    [5, 'R0.05'],
    [99, 'R0.99'],
    [100, 'R1.00'],
    [4_700, 'R47.00'],
    [123_456, 'R1\u00A0234.56'],
    [-250, '-R2.50'],
  ])('formats %d as %s', (value, expected) => {
    expect(formatRand(value)).toBe(expected);
  });

  it('refuses non-integers', () => {
    expect(() => formatRand(1.5)).toThrow(MoneyError);
  });
});
