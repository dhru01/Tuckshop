/**
 * Runs once when a server instance starts. Validates configuration so a misconfigured
 * deployment fails immediately (and loudly) instead of at the first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnvironmentValid } = await import('./lib/env/server');
    assertEnvironmentValid();
  }
}
