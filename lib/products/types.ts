export type SchoolProductListItem = {
  id: string;
  name: string;
  barcode: string | null;
  priceCents: number;
  costPriceCents: number | null;
  trackStock: boolean;
  stockQuantity: number;
  lowStockThreshold: number | null;
  isActive: boolean;
  archivedAt: string | null;
  imagePath: string | null;
  category: { id: string; name: string; colour: string | null };
};

export type InventoryMovementListItem = {
  id: string;
  productId: string;
  productName: string;
  movementType: string;
  quantityDelta: number;
  quantityAfter: number;
  reason: string | null;
  createdAt: string;
};
