/**
 * UI shell preview (Phase 1 only).
 *
 * Until real authentication lands in Phase 2, the role interfaces are reachable ONLY when a
 * developer explicitly sets UI_SHELL_PREVIEW=true. It fails closed:
 *  - default is OFF;
 *  - it is ignored when APP_ENV=production (and the env schema refuses to boot with it on).
 *
 * The preview grants NO data access: there is no Supabase session, so RLS denies everything.
 */
export function computeUiPreview(env: {
  UI_SHELL_PREVIEW?: string | undefined;
  APP_ENV?: string | undefined;
}): boolean {
  const flag = env.UI_SHELL_PREVIEW?.trim();
  const requested = flag === 'true' || flag === '1';
  return requested && env.APP_ENV !== 'production';
}

export function isUiPreviewEnabled(): boolean {
  return computeUiPreview({
    UI_SHELL_PREVIEW: process.env.UI_SHELL_PREVIEW,
    APP_ENV: process.env.APP_ENV,
  });
}
