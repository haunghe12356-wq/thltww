import apiClient, { bearerHeaders } from "@/lib/apiClient";
import type { PaginatedResponse, PaginationParams } from "./types";

export type Brand = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  logo?: string | null;
  status: number;
  products_count?: number;
  deleted_at?: string | null;
};

export type BrandData = Partial<Omit<Brand, "id" | "deleted_at" | "products_count">>;

export const getBrands = () =>
  apiClient.get<{ data: Pick<Brand, "id" | "name" | "slug" | "logo">[] }>("/brands");

export const getAdminBrands = (token: string, params?: PaginationParams) =>
  apiClient.get<PaginatedResponse<Brand>>("/admin/brands", {
    headers: bearerHeaders(token),
    params,
  });

export const createBrand = (token: string, data: BrandData) =>
  apiClient.post("/admin/brands", data, { headers: bearerHeaders(token) });

export const updateBrand = (token: string, id: number, data: BrandData) =>
  apiClient.put(`/admin/brands/${id}`, data, { headers: bearerHeaders(token) });

export const moveBrandToTrash = (token: string, id: number) =>
  apiClient.delete(`/admin/brands/${id}`, { headers: bearerHeaders(token) });

export const restoreBrand = (token: string, id: number) =>
  apiClient.post(`/admin/brands/${id}/restore`, undefined, {
    headers: bearerHeaders(token),
  });

export const permanentlyDeleteBrand = (token: string, id: number) =>
  apiClient.delete(`/admin/brands/${id}/force`, { headers: bearerHeaders(token) });
