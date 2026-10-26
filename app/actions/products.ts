'use server';

import { revalidatePath } from 'next/cache';

import { parseProductCsv } from '@/lib/products/csv';
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
  const costRaw = String(formData.get('cost') ?? '').trim();
  const costPriceCents = costRaw ? parseRandToCents(costRaw) : null;
  const trackStock = formData.get('trackStock') === 'on';
  const initialStock = Number.parseInt(String(formData.get('initialStock') ?? '0'), 10);
  const lowRaw = String(formData.get('lowStockThreshold') ?? '').trim();
  const lowStockThreshold = lowRaw ? Number.parseInt(lowRaw, 10) : null;

  if (!name) return { error: 'Product name is required.' };
  if (priceCents === null || priceCents < 0) return { error: 'Enter a valid price.' };
  if (costRaw && costPriceCents === null) return { error: 'Enter a valid cost price.' };
  if (trackStock && (!Number.isSafeInteger(initialStock) || initialStock < 0)) {
    return { error: 'Initial stock must be zero or more.' };
  }
  if (lowRaw && (!Number.isSafeInteger(lowStockThreshold) || lowStockThreshold! < 0)) {
    return { error: 'Low-stock threshold must be zero or more.' };
  }

  const { error } = await schoolCreateProduct(ctx.actor, {
    schoolId: ctx.schoolId,
    categoryId,
    name,
    description: description || null,
    barcode: barcode || null,
    priceCents,
    costPriceCents,
    trackStock,
    initialStock: trackStock ? initialStock : 0,
    lowStockThreshold,
  });

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return { error: 'Barcode already in use for another active product.' };
    }
    return { error: 'Could not create product.' };
  }

  revalidatePath('/school/products');
  revalidatePath('/school/inventory');
  return { success: `Added ${name}.` };
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
  const costRaw = String(formData.get('cost') ?? '').trim();
  const costPriceCents = costRaw ? parseRandToCents(costRaw) : null;
  const trackStock = formData.get('trackStock') === 'on';
  const lowRaw = String(formData.get('lowStockThreshold') ?? '').trim();
  const lowStockThreshold = lowRaw ? Number.parseInt(lowRaw, 10) : null;
  const isActive = formData.get('isActive') === 'on';

  if (!name) return { error: 'Product name is required.' };
  if (priceCents === null || priceCents < 0) return { error: 'Enter a valid price.' };
  if (costRaw && costPriceCents === null) return { error: 'Enter a valid cost price.' };
  if (lowRaw && (!Number.isSafeInteger(lowStockThreshold) || lowStockThreshold! < 0)) {
    return { error: 'Low-stock threshold must be zero or more.' };
  }

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
    costPriceCents,
    trackStock,
    lowStockThreshold,
    isActive,
    imagePath: imagePath ?? null,
  });

  if (error) {
    if (error.message.includes('unique') || error.message.includes('duplicate')) {
      return { error: 'Barcode already in use for another active product.' };
    }
    return { error: 'Could not update product.' };
  }

  revalidatePath('/school/products');
  revalidatePath('/school/inventory');
  return { success: `Saved ${name}.` };
}

export async function archiveProductAction(productId: string): Promise<ProductActionState> {
  const ctx = await schoolContext();
  if ('error' in ctx) return { error: ctx.error };

  const { error } = await schoolArchiveProduct(ctx.actor, productId);
  if (error) return { error: 'Could not archive product.' };

  revalidatePath('/school/products');
  revalidatePath('/school/inventory');
  return { success: 'Product archived.' };
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
    return { error: 'Choose a CSV file to import.' };
  }

  const text = await file.text();
  const categories = await loadCategories(ctx.actor, ctx.schoolId);
  const { rows, errors } = parseProductCsv(text, categories);
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
      costPriceCents: row.costPriceCents,
      trackStock: row.trackStock,
      initialStock: row.initialStock,
      lowStockThreshold: row.lowStockThreshold,
    });
    if (!error) created += 1;
  }

  revalidatePath('/school/products');
  revalidatePath('/school/inventory');
  return { success: `Imported ${created} of ${rows.length} product(s).` };
}

export async function ensureCategoriesForSchool(schoolId: string, actor: string) {
  return loadCategories(actor, schoolId);
}
