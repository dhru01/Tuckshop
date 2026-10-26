import { redirect } from 'next/navigation';

/** Inventory tracking is not part of the tuck shop product offering. */
export default function Page() {
  redirect('/school/products');
}
