import apiClient, { bearerHeaders } from "@/lib/apiClient";
import type { ApiResource, PaginatedResponse, PaginationParams } from "./types";

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  discount_percent?: number | null;
  discounted_price?: number | string | null;
  stock: number;
  image?: string | null;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  rating?: number;
  reviews_count?: number;
  deleted_at?: string | null;
};

export type ProductData = {
  name: string;
  description?: string | null;
  price: number;
  discount_percent?: number | null;
  stock?: number;
  image?: string | null;
  category_id?: number | null;
  brand_id?: number | null;
};

export const getProducts = (params?: PaginationParams) =>
  apiClient.get<PaginatedResponse<Product>>("/products", { params });

export const getProductPrice = (product: Product) =>
  Number(product.discounted_price ?? product.price);

export const getProduct = (id: string | number) =>
  apiClient.get<ApiResource<Product>>(`/products/${id}`);

export const createProduct = (data: ProductData, token: string) =>
  apiClient.post("/products", data, { headers: bearerHeaders(token) });

export const getAdminProducts = (token: string, params?: PaginationParams) =>
  apiClient.get<PaginatedResponse<Product>>("/admin/products", {
    headers: bearerHeaders(token),
    params,
  });

export const createAdminProduct = (token: string, data: ProductData) =>
  apiClient.post("/admin/products", data, { headers: bearerHeaders(token) });

export const updateAdminProduct = (token: string, id: number, data: Partial<ProductData>) =>
  apiClient.put(`/admin/products/${id}`, data, { headers: bearerHeaders(token) });

export const moveProductToTrash = (token: string, id: number) =>
  apiClient.delete(`/admin/products/${id}`, { headers: bearerHeaders(token) });

export const restoreProduct = (token: string, id: number) =>
  apiClient.post(`/admin/products/${id}/restore`, undefined, {
    headers: bearerHeaders(token),
  });

export const permanentlyDeleteProduct = (token: string, id: number) =>
  apiClient.delete(`/admin/products/${id}/force`, { headers: bearerHeaders(token) });
