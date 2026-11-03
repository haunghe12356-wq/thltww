import {
  createBrand,
  getAdminBrands,
  moveBrandToTrash,
  permanentlyDeleteBrand,
  restoreBrand,
  updateBrand,
  type BrandData,
} from "@/services/brandService";
import type { PaginationParams } from "@/services/types";
import type { EntryAction, FormValues } from "../_types";

export async function getBrandEntries(token: string, params: PaginationParams) {
  return getAdminBrands(token, params);
}

export async function saveBrandEntry(
  token: string,
  editingId: number | null,
  form: FormValues,
) {
  const data: BrandData = {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || null,
    status: Number(form.status),
    logo: form.image.trim() || null,
  };

  if (editingId) return updateBrand(token, editingId, data);
  return createBrand(token, data);
}

export function getBrandEntryAction(action: EntryAction) {
  return {
    delete: moveBrandToTrash,
    restore: restoreBrand,
    force: permanentlyDeleteBrand,
  }[action];
}
