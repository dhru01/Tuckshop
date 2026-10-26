import 'server-only';

import { callRpc } from '@/services/rpc';

export type ProductCategoryRow = {
  id: string;
  name: string;
  sort_order: number;
  colour: string | null;
  is_active: boolean;
};

export async function ensureSchoolProductCategories(actorId: string, schoolId: string) {
  return callRpc<{ school_id: string; categories: ProductCategoryRow[] }>(
    'ensure_school_product_categories',
    { p_actor_id: actorId, p_school_id: schoolId },
  );
}

export async function schoolCreateProduct(
  actorId: string,
  params: {
    schoolId: string;
    categoryId: string;
    name: string;
    description: string | null;
    barcode: string | null;
    priceCents: number;
    costPriceCents: number | null;
    trackStock: boolean;
    initialStock: number;
    lowStockThreshold: number | null;
  },
) {
  return callRpc<{ product_id: string }>('school_create_product', {
    p_actor_id: actorId,
    p_school_id: params.schoolId,
    p_category_id: params.categoryId,
    p_name: params.name,
    p_description: params.description,
    p_barcode: params.barcode,
    p_price_cents: params.priceCents,
    p_cost_price_cents: params.costPriceCents,
    p_track_stock: params.trackStock,
    p_initial_stock: params.initialStock,
    p_low_stock_threshold: params.lowStockThreshold,
  });
}

export async function schoolUpdateProduct(
  actorId: string,
  params: {
    productId: string;
    categoryId: string;
    name: string;
    description: string | null;
    barcode: string | null;
    priceCents: number;
    costPriceCents: number | null;
    trackStock: boolean;
    lowStockThreshold: number | null;
    isActive: boolean;
    imagePath: string | null;
  },
) {
  return callRpc<{ product_id: string }>('school_update_product', {
    p_actor_id: actorId,
    p_product_id: params.productId,
    p_category_id: params.categoryId,
    p_name: params.name,
    p_description: params.description,
    p_barcode: params.barcode,
    p_price_cents: params.priceCents,
    p_cost_price_cents: params.costPriceCents,
    p_track_stock: params.trackStock,
    p_low_stock_threshold: params.lowStockThreshold,
    p_is_active: params.isActive,
    p_image_path: params.imagePath,
  });
}

export async function schoolArchiveProduct(actorId: string, productId: string) {
  return callRpc<null>('school_archive_product', {
    p_actor_id: actorId,
    p_product_id: productId,
  });
}

export type InventoryMovementType = 'restock' | 'adjustment' | 'write_off';

export async function schoolAdjustInventory(
  actorId: string,
  params: {
    productId: string;
    movementType: InventoryMovementType;
    quantityDelta: number;
    reason: string;
    reasonCode: string | null;
    notes: string | null;
    supplier: string | null;
    unitCostCents: number | null;
  },
) {
  return callRpc<{ inventory_movement_id: string; stock_quantity: number }>(
    'school_adjust_inventory',
    {
      p_actor_id: actorId,
      p_product_id: params.productId,
      p_movement_type: params.movementType,
      p_quantity_delta: params.quantityDelta,
      p_reason: params.reason,
      p_reason_code: params.reasonCode,
      p_notes: params.notes,
      p_supplier: params.supplier,
      p_unit_cost_cents: params.unitCostCents,
    },
  );
}
