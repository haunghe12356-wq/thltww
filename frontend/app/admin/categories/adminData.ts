import {
  createCategory,
  getAdminCategories,
  moveCategoryToTrash,
  permanentlyDeleteCategory,
  restoreCategory,
  updateCategory,
  type CategoryData,
} from "@/services/categoryService";
import type { PaginationParams } from "@/services/types";
import type { EntryAction, FormValues } from "../_types";

export async function getCategoryEntries(token: string, params: PaginationParams) {
  return getAdminCategories(token, params);
}

export async function saveCategoryEntry(
  token: string,
  editingId: number | null,
  form: FormValues,
  totalEntries: number,
) {
  const data: CategoryData = {
    name: form.name.trim(),
    slug: form.slug.trim(),
    description: form.description.trim() || null,
    status: Number(form.status),
    ...(!editingId ? { sort_order: totalEntries } : {}),
  };

  if (editingId) return updateCategory(token, editingId, data);
  return createCategory(token, data);
}

export function getCategoryEntryAction(action: EntryAction) {
  return {
    delete: moveCategoryToTrash,
    restore: restoreCategory,
    force: permanentlyDeleteCategory,
  }[action];
}
