'use server';

import { revalidatePath } from 'next/cache';

import { isProductUploadFile, parseProductUpload } from '@/lib/products/parse-upload';
import { revalidateSchoolCatalog } from '@/lib/school/revalidate-catalog';
import { parseRandToCents } from '@/lib/wallets/money';
import {
  ensureSchoolProductCategories,
  schoolAdjustInventory,
  schoolArchiveProduct,
  schoolCreateProduct,
  schoolUpdateProduct,
  type InventoryMovementType,
  type ProductCategoryRow,
} from '@/services/inventory-service';
import { uploadProductImage } from '@/services/product-image-service';
import { actorId, requireActorForInterface } from '@/lib/auth/require-actor';

export type ProductActionState = { error?: string; success?: string };

async function schoolContext() {
  const access = await requireActorForInterface('school');
  const schoolId = access.active.schoolId;
  if (!schoolId) return { error: 'No school context.' as const };
  return { access, schoolId, actor: actorId(access) };
}

async function loadCategories(actor: string, schoolId: string): Promise<ProductCategoryRow[]> {
  const { data } = await ensureSchoolProductCategories(actor, schoolId);
  return data?.categories ?? [];
}

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const ctx = await schoolContext();
  if ('error' in ctx) return { error: ctx.error };

  const categories = await loadCategories(ctx.actor, ctx.schoolId);
  const categoryId = String(formData.get('categoryId') ?? '');
  if (!categories.some((c) => c.id === categoryId)) {
    return { error: 'Choose a valid category.' };
  }

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const barcode = String(formData.get('barcode') ?? '').trim();
  const priceCents = parseRandToCents(String(formData.get('price') ?? ''));
  if (!name) return { error: 'Product name is required.' };
  if (priceCents === null || priceCents < 0) return { error: 'Enter a valid price.' };

  const { error } = await schoolCreateProduct(ctx.actor, {
    schoolId: ctx.schoolId,
    categoryId,
    name,
    description: description || null,
    barcode: barcode || null,
    priceCents,
    costPriceCents: null,
    trackStock: false,
    initialStock: 0,
    lowStockThreshold: null,
  });

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return { error: 'Barcode already in use for another active product.' };
    }
    return { error: 'Could not create product.' };
  }

  revalidateSchoolCatalog();
  return { success: `Added ${name}. It will appear on the POS.` };
}

export async function updateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const ctx = await schoolContext();
  if ('error' in ctx) return { error: ctx.error };

  const productId = String(formData.get('productId') ?? '');
  const categories = await loadCategories(ctx.actor, ctx.schoolId);
  const categoryId = String(formData.get('categoryId') ?? '');
  if (!categories.some((c) => c.id === categoryId)) {
    return { error: 'Choose a valid category.' };
  }

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const barcode = String(formData.get('barcode') ?? '').trim();
  const priceCents = parseRandToCents(String(formData.get('price') ?? ''));
  const isActive = formData.get('isActive') === 'on';

  if (!name) return { error: 'Product name is required.' };
  if (priceCents === null || priceCents < 0) return { error: 'Enter a valid price.' };

  let imagePath: string | null | undefined = undefined;
  const imageFile = formData.get('image');
  if (imageFile instanceof File && imageFile.size > 0) {
    const uploaded = await uploadProductImage(ctx.schoolId, productId, imageFile);
    if ('error' in uploaded) return { error: uploaded.error };
    imagePath = uploaded.path;
  }

  const { error } = await schoolUpdateProduct(ctx.actor, {
    productId,
    categoryId,
    name,
    description: description || null,
    barcode: barcode || null,
    priceCents,
    costPriceCents: null,
    trackStock: false,
    lowStockThreshold: null,
    isActive,
    imagePath: imagePath ?? null,
  });

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return { error: 'Barcode already in use for another active product.' };
    }
    return { error: 'Could not update product.' };
  }

  revalidateSchoolCatalog();
  return { success: `Saved ${name}. POS catalogue updated.` };
}

export async function archiveProductAction(productId: string): Promise<ProductActionState> {
  const ctx = await schoolContext();
  if ('error' in ctx) return { error: ctx.error };

  const { error } = await schoolArchiveProduct(ctx.actor, productId);
  if (error) return { error: 'Could not delete product.' };

  revalidateSchoolCatalog();
  return { success: 'Product deleted.' };
}

export async function adjustStockAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const ctx = await schoolContext();
  if ('error' in ctx) return { error: ctx.error };

  const productId = String(formData.get('productId') ?? '');
  const movementType = String(formData.get('movementType') ?? '') as InventoryMovementType;
  if (!['restock', 'adjustment', 'write_off'].includes(movementType)) {
    return { error: 'Invalid adjustment type.' };
  }

  const qty = Number.parseInt(String(formData.get('quantity') ?? ''), 10);
  if (!Number.isSafeInteger(qty) || qty <= 0) {
    return { error: 'Quantity must be a positive whole number.' };
  }

  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) return { error: 'Reason is required.' };

  const notes = String(formData.get('notes') ?? '').trim();
  const supplier = String(formData.get('supplier') ?? '').trim();
  const costRaw = String(formData.get('unitCost') ?? '').trim();
  const unitCostCents = costRaw ? parseRandToCents(costRaw) : null;
  if (costRaw && unitCostCents === null) return { error: 'Enter a valid unit cost.' };

  let quantityDelta = qty;
  if (movementType === 'adjustment') {
    const direction = String(formData.get('direction') ?? 'add');
    quantityDelta = direction === 'remove' ? -qty : qty;
  }

  const { data, error } = await schoolAdjustInventory(ctx.actor, {
    productId,
    movementType,
    quantityDelta,
    reason,
    reasonCode: movementType,
    notes: notes || null,
    supplier: supplier || null,
    unitCostCents,
  });

  if (error || !data) {
    if (error?.message.includes('insufficient_stock')) {
      return { error: 'Not enough stock for this adjustment.' };
    }
    if (error?.message.includes('stock_not_tracked')) {
      return { error: 'This product does not track stock.' };
    }
    return { error: 'Could not adjust stock.' };
  }

  revalidatePath('/school/products');
  revalidatePath('/school/inventory');
  return { success: `Stock updated. On hand: ${data.stock_quantity}.` };
}

export async function importProductsAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const ctx = await schoolContext();
  if ('error' in ctx) return { error: ctx.error };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose an Excel file to import.' };
  }
  if (!isProductUploadFile(file.name)) {
    return { error: 'Upload an Excel file (.xlsx).' };
  }

  const categories = await loadCategories(ctx.actor, ctx.schoolId);
  const { rows, errors } = await parseProductUpload(file, categories);
  if (errors.length > 0) {
    return { error: errors.slice(0, 5).join(' ') };
  }
  if (rows.length === 0) return { error: 'No products found in file.' };

  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  let created = 0;
  for (const row of rows) {
    const categoryId = categoryByName.get(row.categoryName.toLowerCase());
    if (!categoryId) continue;

    const { error } = await schoolCreateProduct(ctx.actor, {
      schoolId: ctx.schoolId,
      categoryId,
      name: row.name,
      description: null,
      barcode: row.barcode,
      priceCents: row.priceCents,
      costPriceCents: null,
      trackStock: false,
      initialStock: 0,
      lowStockThreshold: null,
    });
    if (!error) created += 1;
  }

  revalidateSchoolCatalog();
  return { success: `Imported ${created} of ${rows.length} product(s). POS catalogue updated.` };
}

export async function ensureCategoriesForSchool(schoolId: string, actor: string) {
  return loadCategories(actor, schoolId);
}
