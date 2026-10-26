import { CheckCircle2, CircleAlert } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

/** Inline form error: icon + text on a soft red surface (never colour alone). */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert
      variant="destructive"
      className="rounded-xl border-danger/25 bg-danger-soft px-3.5 py-3"
    >
      <CircleAlert aria-hidden="true" />
      <AlertDescription className="font-medium text-danger">{message}</AlertDescription>
    </Alert>
  );
}

/** Inline success message: icon + text on a soft green surface. */
export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Alert className="rounded-xl border-success/25 bg-success-soft px-3.5 py-3 text-success">
      <CheckCircle2 aria-hidden="true" />
      <AlertDescription className="font-medium text-success">{message}</AlertDescription>
    </Alert>
  );
}
