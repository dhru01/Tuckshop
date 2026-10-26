import { cn } from '@/lib/utils';

const HUES = [172, 255, 84, 295, 18, 215] as const;

function hueFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return HUES[h % HUES.length] ?? 172;
}

/** Deterministic initials avatar (colour derived from the name – no data stored). */
export function InitialsAvatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase() ||
    '?';
  const hue = hueFor(name);

  return (
    <span
      aria-hidden="true"
      style={{
        backgroundColor: `oklch(0.94 0.045 ${hue})`,
        color: `oklch(0.38 0.1 ${hue})`,
      }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-heading font-bold',
        size === 'sm' && 'size-8 text-xs',
        size === 'md' && 'size-10 text-sm',
        size === 'lg' && 'size-14 text-lg',
        className,
      )}
    >
      {initials}
    </span>
  );
}
