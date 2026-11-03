import apiClient, { bearerHeaders } from "@/lib/apiClient";

export type Promotion = {
  id: number;
  code: string;
  discount_percent: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  minimum_order_amount: number | string | null;
  maximum_discount_amount: number | string | null;
  usage_limit: number | null;
  used_count: number;
  product_ids: number[];
  products: { id: number; name: string }[];
  created_at: string;
  updated_at: string;
};

export type PromotionData = Pick<
  Promotion,
  | "code"
  | "discount_percent"
  | "is_active"
  | "starts_at"
  | "ends_at"
  | "minimum_order_amount"
  | "maximum_discount_amount"
  | "usage_limit"
  | "product_ids"
>;
export type PromotionStatus = "active" | "inactive";
export type PromotionQuote = {
  code: string;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  eligible_subtotal: number;
  total: number;
};

export const validatePromotion = (
  code: string,
  items: { product_id: number; quantity: number }[],
) => apiClient.post<{ data: PromotionQuote }>("/promotions/validate", { code, items });

export const getAdminPromotions = (
  token: string,
  params: { page: number; per_page: number; search?: string; status?: PromotionStatus | "" },
) =>
  apiClient.get<{
    data: Promotion[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>("/admin/promotions", {
    headers: bearerHeaders(token),
    params,
  });

export const createPromotion = (token: string, data: PromotionData) =>
  apiClient.post<{ data: Promotion }>("/admin/promotions", data, {
    headers: bearerHeaders(token),
  });

export const updatePromotion = (token: string, id: number, data: PromotionData) =>
  apiClient.put<{ data: Promotion }>(`/admin/promotions/${id}`, data, {
    headers: bearerHeaders(token),
  });

export const deletePromotion = (token: string, id: number) =>
  apiClient.delete<{ message: string }>(`/admin/promotions/${id}`, {
    headers: bearerHeaders(token),
  });
