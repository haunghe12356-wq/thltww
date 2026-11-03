import {
  createAdminProduct,
  getAdminProducts,
  moveProductToTrash,
  permanentlyDeleteProduct,
  restoreProduct,
  updateAdminProduct,
  type ProductData,
} from "@/services/productService";
import type { PaginationParams } from "@/services/types";
import type { EntryAction, FormValues } from "../_types";

export async function getProductEntries(token: string, params: PaginationParams) {
  return getAdminProducts(token, params);
}

export async function saveProductEntry(
  token: string,
  editingId: number | null,
  form: FormValues,
) {
  const data: ProductData = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    price: Number(form.price),
    discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
    stock: Number(form.stock),
    image: form.image.trim() || null,
    category_id: form.category_id ? Number(form.category_id) : null,
    brand_id: form.brand_id ? Number(form.brand_id) : null,
  };

  if (editingId) return updateAdminProduct(token, editingId, data);
  return createAdminProduct(token, data);
}

export function getProductEntryAction(action: EntryAction) {
  return {
    delete: moveProductToTrash,
    restore: restoreProduct,
    force: permanentlyDeleteProduct,
  }[action];
}
