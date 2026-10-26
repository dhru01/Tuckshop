import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'product-images';
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadProductImage(
  schoolId: string,
  productId: string,
  file: File,
): Promise<{ path: string } | { error: string }> {
  if (!ALLOWED.has(file.type)) {
    return { error: 'Image must be JPEG, PNG, or WebP.' };
  }
  if (file.size > MAX_BYTES) {
    return { error: 'Image must be 2 MB or smaller.' };
  }

  const ext =
    file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${schoolId}/${productId}.${ext}`;

  const admin = createSupabaseAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    return { error: 'Could not upload image. Ensure the product-images bucket exists in Supabase.' };
  }

  return { path };
}

export function productImagePublicUrl(path: string | null, supabaseUrl: string): string | null {
  if (!path) return null;
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
