import apiClient, { bearerHeaders } from "@/lib/apiClient";
import type { ApiCollection, PaginatedResponse, PaginationParams } from "./types";

export type Category = {
  id: number;
  parent_id?: number | null;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  sort_order: number;
  status: number;
  products_count?: number;
  deleted_at?: string | null;
};

export type CategoryData = Partial<Omit<Category, "id" | "deleted_at" | "products_count">>;

export const getCategories = (params?: PaginationParams) =>
  apiClient.get<ApiCollection<Category>>("/categories", { params });

export const getAdminCategories = (token: string, params?: PaginationParams) =>
  apiClient.get<PaginatedResponse<Category>>("/admin/categories", {
    headers: bearerHeaders(token),
    params,
  });

export const createCategory = (token: string, data: CategoryData) =>
  apiClient.post("/admin/categories", data, { headers: bearerHeaders(token) });

export const updateCategory = (token: string, id: number, data: CategoryData) =>
  apiClient.put(`/admin/categories/${id}`, data, { headers: bearerHeaders(token) });

export const moveCategoryToTrash = (token: string, id: number) =>
  apiClient.delete(`/admin/categories/${id}`, { headers: bearerHeaders(token) });

export const restoreCategory = (token: string, id: number) =>
  apiClient.post(`/admin/categories/${id}/restore`, undefined, {
    headers: bearerHeaders(token),
  });

export const permanentlyDeleteCategory = (token: string, id: number) =>
  apiClient.delete(`/admin/categories/${id}/force`, { headers: bearerHeaders(token) });
