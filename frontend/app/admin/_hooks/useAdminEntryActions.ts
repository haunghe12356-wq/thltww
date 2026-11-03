"use client";

import { getApiError } from "@/lib/apiClient";
import { getEntryName } from "../_utils";
import type { Entry, EntryAction, Section } from "../_types";
import { getBrandEntryAction } from "../brands/adminData";
import { getCategoryEntryAction } from "../categories/adminData";
import { getProductEntryAction } from "../products/adminData";

type AdminEntryActionRequest = (token: string, id: number) => Promise<unknown>;

export default function useAdminEntryActions(
  section: Section,
  token: string,
  editingId: number | null,
  resetForm: () => void,
  loadEntries: (token: string) => Promise<void>,
  setError: (message: string) => void,
  setMessage: (message: string) => void,
) {
  const changeEntryState = async (entry: Entry, action: EntryAction) => {
    const prompt = action === "force"
      ? `Xóa vĩnh viễn "${getEntryName(entry)}"? Thao tác này không thể hoàn tác.`
      : action === "delete"
        ? `Chuyển "${getEntryName(entry)}" vào thùng rác?`
        : `Khôi phục "${getEntryName(entry)}"?`;
    if (!window.confirm(prompt)) return;

    setError("");
    setMessage("");
    try {
      const getAction = {
        products: getProductEntryAction,
        categories: getCategoryEntryAction,
        brands: getBrandEntryAction,
      }[section];
      const actionRequest: AdminEntryActionRequest = getAction(action);
      await actionRequest(token, entry.id);
      setMessage(
        action === "restore"
          ? "Đã khôi phục dữ liệu."
          : action === "force"
            ? "Đã xóa vĩnh viễn dữ liệu."
            : "Đã chuyển dữ liệu vào thùng rác.",
      );
      if (editingId === entry.id) resetForm();
      await loadEntries(token);
    } catch (actionError) {
      setError(getApiError(actionError));
    }
  };

  return { changeEntryState };
}
