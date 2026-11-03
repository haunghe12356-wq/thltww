import apiClient, { bearerHeaders } from "@/lib/apiClient";

export type InventoryProduct = {
  id: number;
  name: string;
  stock: number;
  price: number | string;
  image: string | null;
};

export type StockTransactionItem = {
  product_id: number | null;
  product_name: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
};

export type StockTransaction = {
  id: number;
  document_code: string | null;
  type: "in" | "out";
  source: string;
  source_id: number | null;
  reference: string | null;
  reason: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  items: StockTransactionItem[];
};

export type InventoryResponse = {
  data: {
    products: InventoryProduct[];
    transactions: StockTransaction[];
  };
  meta: {
    products: { current_page: number; last_page: number; per_page: number; total: number };
    transactions: { current_page: number; last_page: number; per_page: number; total: number };
  };
};

export type StockDocumentData = {
  reason: string;
  reference?: string;
  notes?: string;
  items: { product_id: number; quantity: number }[];
};

export type StockDocumentResponse = {
  message: string;
  data: StockTransaction;
};

export const getAdminInventory = (
  token: string,
  params: {
    stock_page: number;
    movement_page: number;
    per_page: number;
    stock_search?: string;
    movement_type?: "in" | "out" | "";
  },
) =>
  apiClient.get<InventoryResponse>("/admin/inventory", {
    headers: bearerHeaders(token),
    params,
  });

export const createStockReceipt = (token: string, data: StockDocumentData) =>
  apiClient.post<StockDocumentResponse>("/admin/inventory/receipts", data, {
    headers: bearerHeaders(token),
  });

export const createStockIssue = (token: string, data: StockDocumentData) =>
  apiClient.post<StockDocumentResponse>("/admin/inventory/issues", data, {
    headers: bearerHeaders(token),
  });
