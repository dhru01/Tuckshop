/** Columns shared by school admin and POS catalogue reads. */
export const CATALOG_PRODUCT_SELECT =
  'id, name, barcode, price_cents, is_active, category_id, image_path';

export const POS_PRODUCT_SELECT = 'id, name, price_cents, barcode, category_id';

export const CATALOG_CATEGORY_SELECT = 'id, name, colour, sort_order';

/** Whether a product row should appear on the POS sell screen. */
export function isVisibleOnPos(product: {
  is_active: boolean;
  archived_at?: string | null;
}): boolean {
  return product.is_active && (product.archived_at === null || product.archived_at === undefined);
}
