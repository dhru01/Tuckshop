import { revalidatePath } from 'next/cache';

/** Refresh school products admin and POS after catalogue changes. */
export function revalidateSchoolCatalog(): void {
  revalidatePath('/school/products');
  revalidatePath('/pos');
}
