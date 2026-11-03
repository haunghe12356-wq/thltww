import apiClient, { bearerHeaders } from "@/lib/apiClient";

export type OrderHistoryItem = {
  id: number;
  quantity: number;
  price: string | number;
  product: { id: number; name: string } | null;
};

export type OrderHistoryEntry = {
  id: number;
  promo_code?: string | null;
  discount_amount?: string | number;
  total: string | number;
  status: string;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string;
  items: OrderHistoryItem[];
};

export type OrderDetail = OrderHistoryEntry & {
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address: string | null;
  promo_code: string | null;
  discount_amount: string | number;
};

export type AdminOrderStatus = "pending" | "paid" | "shipped" | "cancelled";
export type AdminOrder = Omit<OrderDetail, "status"> & { status: AdminOrderStatus };

export type ProductReview = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  user: { name: string };
};

export type AdminProductReview = ProductReview & {
  is_approved: boolean;
  user: { id: number; name: string; email: string };
  product: { id: number; name: string };
};

export type ContactMessageData = {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
};

export type CheckoutData = {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  promo_code?: string;
  payment_method: "cod" | "bank_transfer" | "vnpay" | "momo";
  items: { product_id: number; quantity: number }[];
};

export const getProductReviews = (productId: number) =>
  apiClient.get<{ data: ProductReview[] }>(`/products/${productId}/reviews`);

export const submitProductReview = (
  productId: number,
  data: { rating: number; comment: string },
  token: string,
) =>
  apiClient.post<{ data: ProductReview }>(
    `/products/${productId}/reviews`,
    data,
    { headers: { Authorization: `Bearer ${token}` } },
  );

export const getAdminProductReviews = (
  token: string,
  params: {
    page: number;
    per_page: number;
    status: "pending" | "approved" | "all";
    product_id?: number;
  },
) =>
  apiClient.get<{
    data: AdminProductReview[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>("/admin/reviews", { headers: bearerHeaders(token), params });

export const updateProductReviewApproval = (
  token: string,
  reviewId: number,
  is_approved: boolean,
) =>
  apiClient.patch<{ message: string }>(
    `/admin/reviews/${reviewId}/approval`,
    { is_approved },
    { headers: bearerHeaders(token) },
  );

export const deleteProductReview = (token: string, reviewId: number) =>
  apiClient.delete<{ message: string }>(`/admin/reviews/${reviewId}`, {
    headers: bearerHeaders(token),
  });

export const submitContactMessage = (data: ContactMessageData) =>
  apiClient.post<{ message: string }>("/contact-messages", data);

export const submitOrder = (data: CheckoutData) => {
  const token = typeof window === "undefined" ? "" : window.localStorage.getItem("shop_token") ?? "";

  return apiClient.post<{
    data: {
      id: number;
      promo_code: string | null;
      discount_amount: number;
      total: number;
      status: string;
      payment_method: CheckoutData["payment_method"];
      payment_mode: "demo" | "vnpay" | "cod";
      payment_url: string | null;
      email_sent: boolean | null;
      email_status: "sent" | "not_configured" | "failed" | null;
      confirmation_email: string;
    };
  }>("/orders", data, token ? { headers: bearerHeaders(token) } : undefined);
};

export const getOrderHistory = (token: string, page = 1) =>
  apiClient.get<{
    data: OrderHistoryEntry[];
    current_page: number;
    last_page: number;
    total: number;
  }>("/orders", {
    headers: bearerHeaders(token),
    params: { page, per_page: 10 },
  });

export const getOrderDetail = (token: string, orderId: string | number) =>
  apiClient.get<{ data: OrderDetail }>(`/orders/${orderId}`, {
    headers: bearerHeaders(token),
  });

export const getAdminOrders = (
  token: string,
  params: { page: number; per_page: number; status?: string; search?: string },
) =>
  apiClient.get<{
    data: AdminOrder[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>("/admin/orders", {
    headers: bearerHeaders(token),
    params,
  });

export const updateAdminOrderStatus = (
  token: string,
  orderId: number,
  status: AdminOrderStatus,
) =>
  apiClient.patch<{ data: { id: number; status: AdminOrderStatus; paid_at: string | null } }>(
    `/admin/orders/${orderId}/status`,
    { status },
    { headers: bearerHeaders(token) },
  );

export const cancelOrder = (token: string, orderId: string | number) =>
  apiClient.post<{ data: { id: number; status: string } }>(
    `/orders/${orderId}/cancel`,
    undefined,
    { headers: bearerHeaders(token) },
  );
