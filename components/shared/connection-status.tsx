'use client';

import { Wifi, WifiOff } from 'lucide-react';
import { useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Browser connectivity (navigator.onLine). A hint only – the server decides every payment. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

export function ConnectionStatus({ className }: { className?: string }) {
  const online = useIsOnline();
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        online ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger',
        className,
      )}
    >
      {online ? (
        <Wifi className="size-3.5" aria-hidden="true" />
      ) : (
        <WifiOff className="size-3.5" aria-hidden="true" />
      )}
      {online ? 'Online' : 'Offline – payments paused'}
    </span>
  );
}
