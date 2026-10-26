import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type RpcError = { message: string; code?: string };

export async function callRpc<T>(
  fn: string,
  params: Record<string, unknown>,
): Promise<{ data: T | null; error: RpcError | null }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc(fn, params);
  if (error) {
    return { data: null, error: { message: error.message, code: error.code } };
  }
  return { data: data as T, error: null };
}
