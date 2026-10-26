/**
 * Typed domain errors with stable codes and user-safe messages.
 *
 * Rules (docs/ARCHITECTURE.md §14):
 *  - `message` is safe to show to end users. Internal details go in `cause`/`internal` and are
 *    logged server-side only – never returned to a client.
 *  - Database/provider errors are mapped to an AppError at the boundary (services layer).
 */

export const ERROR_CODES = {
  // Authentication / authorisation
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_NOT_VERIFIED: 'Please verify your email address before signing in.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  UNAUTHORISED: 'You do not have access to this page or action.',
  NO_SCHOOL_MEMBERSHIP: 'Your account is not linked to a school yet.',
  ACCOUNT_DISABLED: 'This account has been disabled. Please contact your school.',
  MFA_REQUIRED: 'Multi-factor authentication is required for this action.',
  SCHOOL_SUSPENDED: 'This school account is currently suspended.',

  // Validation / generic
  VALIDATION_FAILED: 'Some of the information you entered is not valid.',
  NOT_FOUND: 'We could not find what you were looking for.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  SYSTEM_ERROR: 'Something went wrong on our side. Please try again.',

  // POS / wallet
  UNKNOWN_CARD: 'Card not recognised.',
  CARD_NOT_ACTIVE: 'This card is not active.',
  CARD_EXPIRED: 'This card has expired.',
  INVALID_CREDENTIAL: 'The card could not be verified.',
  REPLAY_DETECTED: 'The card could not be verified. Please tap again.',
  WALLET_FROZEN: 'This wallet is frozen.',
  INSUFFICIENT_FUNDS: 'Insufficient balance.',
  LIMIT_EXCEEDED: 'This purchase exceeds the spending limit.',
  RESTRICTED_PRODUCT: 'One or more items are restricted for this learner.',
  PRODUCT_UNAVAILABLE: 'One or more products are unavailable.',
  INSUFFICIENT_STOCK: 'Not enough stock for one or more items.',
  SHIFT_REQUIRED: 'Open a shift before selling.',
  IDEMPOTENCY_CONFLICT: 'This request was already used with different details.',
  TIMEOUT_UNKNOWN: 'The result of this payment is not yet known. Check before retrying.',
  READER_DISCONNECTED: 'The card reader is disconnected.',

  // Payments
  PAYMENT_DECLINED: 'The payment was declined.',
  PAYMENT_CANCELLED: 'The payment was cancelled.',
  PAYMENT_PROVIDER_UNAVAILABLE: 'The payment provider is unavailable. Please try again shortly.',
  PAYMENT_AMOUNT_MISMATCH: 'The payment amount did not match. Our team has been alerted.',
  REFUND_FAILED: 'The refund could not be completed.',
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class AppError extends Error {
  readonly code: ErrorCode;
  /** Internal context for server logs. NEVER send to the client. */
  readonly internal?: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, options?: { cause?: unknown; internal?: Record<string, unknown> }) {
    super(ERROR_CODES[code], options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.internal = options?.internal;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Serialisable, client-safe representation. Unknown errors collapse to SYSTEM_ERROR. */
export function toClientError(error: unknown): { code: ErrorCode; message: string } {
  if (isAppError(error)) return { code: error.code, message: error.message };
  return { code: 'SYSTEM_ERROR', message: ERROR_CODES.SYSTEM_ERROR };
}
