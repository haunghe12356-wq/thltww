"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { getApiError } from "@/lib/apiClient";
import { getAdminProducts, type Product } from "@/services/productService";
import {
  createStockIssue,
  createStockReceipt,
  getAdminInventory,
  type InventoryProduct,
  type StockTransaction,
} from "@/services/inventoryService";
import AdminSidebar from "../_components/AdminSidebar";

type DocumentLine = { product_id: string; quantity: string };
const emptyLine: DocumentLine = { product_id: "", quantity: "1" };
const pageSize = 10;

const sourceLabels: Record<string, string> = {
  manual: "Phiếu thủ công",
  opening: "Tồn đầu kỳ",
  order: "Xuất bán đơn hàng",
  order_cancel: "Nhập lại đơn bị hủy",
  payment_cancel: "Nhập lại giao dịch thất bại",
  payment_reconfirm: "Xuất lại giao dịch xác nhận muộn",
  adjustment: "Điều chỉnh tồn kho",
};

function subscribeToToken(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredToken() {
  return window.localStorage.getItem("shop_token") ?? "";
}

function formatPrice(value: number | string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export default function AdminInventoryPage() {
  const token = useSyncExternalStore(subscribeToToken, getStoredToken, () => "");
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [stockPage, setStockPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const [stockLastPage, setStockLastPage] = useState(1);
  const [movementLastPage, setMovementLastPage] = useState(1);
  const [stockTotal, setStockTotal] = useState(0);
  const [movementTotal, setMovementTotal] = useState(0);
  const [stockSearchInput, setStockSearchInput] = useState("");
  const [stockSearch, setStockSearch] = useState("");
  const [movementType, setMovementType] = useState<"in" | "out" | "">("");
  const [documentType, setDocumentType] = useState<"in" | "out">("in");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DocumentLine[]>([{ ...emptyLine }]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadInventory = useCallback(async (
    pageOverrides: { stockPage?: number; movementPage?: number } = {},
  ) => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await getAdminInventory(token, {
        stock_page: pageOverrides.stockPage ?? stockPage,
        movement_page: pageOverrides.movementPage ?? movementPage,
        per_page: pageSize,
        ...(stockSearch ? { stock_search: stockSearch } : {}),
        ...(movementType ? { movement_type: movementType } : {}),
      });
      setProducts(response.data.data.products);
      setTransactions(response.data.data.transactions);
      setStockLastPage(response.data.meta.products.last_page);
      setMovementLastPage(response.data.meta.transactions.last_page);
      setStockTotal(response.data.meta.products.total);
      setMovementTotal(response.data.meta.transactions.total);
    } catch (loadError: unknown) {
      setError(getApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [movementPage, movementType, stockPage, stockSearch, token]);

  useEffect(() => {
    void Promise.resolve().then(() => loadInventory());
  }, [loadInventory]);

  useEffect(() => {
    if (!token) return;
    let active = true;
    const loadProducts = async () => {
      setCatalogLoading(true);
      setError("");
      try {
        const firstPage = await getAdminProducts(token, { page: 1, per_page: 100 });
        const allProducts = [...firstPage.data.data];
        for (let currentPage = 2; currentPage <= firstPage.data.meta.last_page; currentPage += 1) {
          const response = await getAdminProducts(token, { page: currentPage, per_page: 100 });
          allProducts.push(...response.data.data);
        }
        if (active) setCatalog(allProducts);
      } catch (loadError: unknown) {
        if (active) setError(getApiError(loadError));
      } finally {
        if (active) setCatalogLoading(false);
      }
    };
    void loadProducts();
    return () => {
      active = false;
    };
  }, [token]);

  const submitDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const items = lines.map((line) => ({
      product_id: Number(line.product_id),
      quantity: Number(line.quantity),
    }));

    try {
      const createDocument = documentType === "in" ? createStockReceipt : createStockIssue;
      const response = await createDocument(token, {
        reason: reason.trim(),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        items,
      });
      setNotice(`${response.data.message} Mã phiếu: ${response.data.data.document_code ?? `#${response.data.data.id}`}.`);
      setCatalog((current) => current.map((product) => {
        const updatedItem = response.data.data.items.find((item) => item.product_id === product.id);
        return updatedItem ? { ...product, stock: updatedItem.stock_after } : product;
      }));
      setReason("");
      setReference("");
      setNotes("");
      setLines([{ ...emptyLine }]);
      setStockPage(1);
      setMovementPage(1);
      await loadInventory({ stockPage: 1, movementPage: 1 });
    } catch (saveError: unknown) {
      setError(getApiError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleStockSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStockPage(1);
    setStockSearch(stockSearchInput.trim());
  };

  const changeLine = (index: number, patch: Partial<DocumentLine>) => {
    setLines((current) => current.map((line, lineIndex) =>
      lineIndex === index ? { ...line, ...patch } : line,
    ));
  };

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <AdminSidebar
          section="products"
          contentSection="inventory"
          trashed={false}
          onTrashOpen={() => undefined}
        />
        <div className="admin-workspace">
          <header className="admin-header">
            <div>
              <span className="admin-eyebrow">KHO HÀNG</span>
              <h1>Quản lý kho</h1>
              <p>Tạo phiếu nhập/xuất, theo dõi biến động và số lượng tồn kho hiện tại.</p>
            </div>
            <div className="admin-header-status"><span /> Theo dõi tồn kho</div>
          </header>
          <div className="admin-content">
            {error && <p className="admin-notice error" role="alert">{error}</p>}
            {notice && <p className="admin-notice success" role="status">{notice}</p>}
            {!token ? (
              <section className="admin-card admin-sign-in">
                <h2>Đăng nhập để tiếp tục</h2>
                <p>Đăng nhập bằng tài khoản admin được cấp quyền để quản lý kho.</p>
                <Link href="/login">Đăng nhập</Link>
              </section>
            ) : (
              <>
                <section className="admin-card">
                  <div className="admin-card-heading">
                    <div>
                      <span className="admin-eyebrow">CHỨNG TỪ KHO</span>
                      <h2>{documentType === "in" ? "Tạo phiếu nhập hàng" : "Tạo phiếu xuất hàng"}</h2>
                    </div>
                    <div className="admin-inventory-tabs" role="group" aria-label="Loại phiếu kho">
                      <button type="button" className={documentType === "in" ? "active" : ""} onClick={() => setDocumentType("in")}>Phiếu nhập</button>
                      <button type="button" className={documentType === "out" ? "active" : ""} onClick={() => setDocumentType("out")}>Phiếu xuất</button>
                    </div>
                  </div>
                  <form className="admin-inventory-form" onSubmit={submitDocument}>
                    <label>
                      Lý do {documentType === "in" ? "nhập" : "xuất"}
                      <input required maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={documentType === "in" ? "VD: Nhập hàng từ nhà cung cấp" : "VD: Xuất hàng hư hỏng"} />
                    </label>
                    <label>
                      Mã tham chiếu (không bắt buộc)
                      <input maxLength={100} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Mã hóa đơn / nhà cung cấp" />
                    </label>
                    <label className="admin-inventory-notes">
                      Ghi chú
                      <textarea rows={2} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
                    </label>
                    <div className="admin-inventory-lines">
                      <div className="admin-inventory-lines-heading"><strong>Sản phẩm và số lượng</strong><button type="button" className="admin-secondary-button" onClick={() => setLines((current) => [...current, { ...emptyLine }])}>+ Thêm sản phẩm</button></div>
                      {lines.map((line, index) => (
                        <div className="admin-inventory-line" key={index}>
                          <label>
                            Sản phẩm
                            <select required value={line.product_id} onChange={(event) => changeLine(index, { product_id: event.target.value })}>
                              <option value="">{catalogLoading ? "Đang tải sản phẩm..." : "Chọn sản phẩm"}</option>
                              {catalog.map((product) => (
                                <option
                                  key={product.id}
                                  value={product.id}
                                  disabled={lines.some((otherLine, otherIndex) =>
                                    otherIndex !== index && otherLine.product_id === String(product.id),
                                  )}
                                >
                                  {product.name} (tồn {product.stock})
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            Số lượng
                            <input required type="number" min={1} max={1_000_000} step={1} value={line.quantity} onChange={(event) => changeLine(index, { quantity: event.target.value })} />
                          </label>
                          <button
                            type="button"
                            className="admin-inventory-remove"
                            aria-label="Xóa sản phẩm khỏi phiếu"
                            disabled={lines.length === 1}
                            onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                          >
                            Xóa
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="admin-inventory-actions">
                      <button type="submit" className="admin-primary-button" disabled={saving || catalogLoading || catalog.length === 0}>
                        {saving ? "Đang lưu phiếu..." : documentType === "in" ? "Tạo phiếu nhập" : "Tạo phiếu xuất"}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="admin-card">
                  <div className="admin-card-heading">
                    <div>
                      <span className="admin-eyebrow">TỒN KHO</span>
                      <h2>Danh sách tồn kho ({stockTotal})</h2>
                    </div>
                    <button type="button" className="admin-secondary-button" onClick={() => void loadInventory()} disabled={loading}>Tải lại</button>
                  </div>
                  <form className="admin-inventory-filter" onSubmit={handleStockSearch}>
                    <label htmlFor="inventory-search">Tìm sản phẩm</label>
                    <input id="inventory-search" type="search" maxLength={255} value={stockSearchInput} onChange={(event) => setStockSearchInput(event.target.value)} placeholder="Tên hoặc mã sản phẩm" />
                    <button type="submit" className="admin-primary-button" disabled={loading}>Tìm kiếm</button>
                  </form>
                  {loading ? (
                    <p className="admin-empty" role="status">Đang tải tồn kho...</p>
                  ) : products.length === 0 ? (
                    <p className="admin-empty">Không có sản phẩm phù hợp.</p>
                  ) : (
                    <>
                      <div className="admin-table-wrap">
                        <table className="admin-table admin-inventory-table">
                          <thead><tr><th>Mã</th><th>Sản phẩm</th><th>Đơn giá</th><th>Tồn hiện tại</th></tr></thead>
                          <tbody>{products.map((product) => (
                            <tr key={product.id}>
                              <td>#{product.id}</td>
                              <td><strong>{product.name}</strong></td>
                              <td>{formatPrice(product.price)}</td>
                              <td><span className={product.stock <= 5 ? "admin-inventory-low-stock" : ""}>{product.stock}</span></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                      <div className="admin-inventory-pagination">
                        <span>Trang {stockPage} / {stockLastPage}</span>
                        <div>
                          <button type="button" className="admin-secondary-button" disabled={stockPage <= 1 || loading} onClick={() => setStockPage((page) => page - 1)}>Trước</button>
                          <button type="button" className="admin-secondary-button" disabled={stockPage >= stockLastPage || loading} onClick={() => setStockPage((page) => page + 1)}>Sau</button>
                        </div>
                      </div>
                    </>
                  )}
                </section>

                <section className="admin-card">
                  <div className="admin-card-heading">
                    <div>
                      <span className="admin-eyebrow">SỔ KHO</span>
                      <h2>Lịch sử nhập / xuất ({movementTotal})</h2>
                    </div>
                    <label className="admin-inventory-type-filter">
                      Loại phiếu
                      <select value={movementType} onChange={(event) => {
                        setMovementType(event.target.value as "in" | "out" | "");
                        setMovementPage(1);
                      }}>
                        <option value="">Tất cả</option>
                        <option value="in">Nhập kho</option>
                        <option value="out">Xuất kho</option>
                      </select>
                    </label>
                  </div>
                  {loading ? (
                    <p className="admin-empty" role="status">Đang tải lịch sử...</p>
                  ) : transactions.length === 0 ? (
                    <p className="admin-empty">Chưa có phát sinh nhập / xuất kho.</p>
                  ) : (
                    <>
                      <div className="admin-table-wrap">
                        <table className="admin-table admin-inventory-history">
                          <thead><tr><th>Phiếu / thời gian</th><th>Loại</th><th>Lý do / tham chiếu</th><th>Sản phẩm</th><th>Người tạo</th></tr></thead>
                          <tbody>{transactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td><strong>{transaction.document_code ?? `#${transaction.id}`}</strong><small>{formatDate(transaction.created_at)}</small></td>
                              <td><span className={transaction.type === "in" ? "admin-inventory-in" : "admin-inventory-out"}>{transaction.type === "in" ? "Nhập" : "Xuất"}</span><small>{sourceLabels[transaction.source] ?? transaction.source}</small></td>
                              <td><strong>{transaction.reason}</strong>{transaction.reference && <small>Tham chiếu: {transaction.reference}</small>}{transaction.notes && <small>{transaction.notes}</small>}</td>
                              <td>
                                {transaction.items.map((item, index) => (
                                  <div className="admin-inventory-history-item" key={`${item.product_id ?? item.product_name}-${index}`}>
                                    <strong>{item.product_name}</strong>
                                    <span>{transaction.type === "in" ? "+" : "-"}{item.quantity} ({item.stock_before} → {item.stock_after})</span>
                                  </div>
                                ))}
                              </td>
                              <td>{transaction.created_by ?? (transaction.source === "opening" ? "Hệ thống" : "Khách hàng")}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                      <div className="admin-inventory-pagination">
                        <span>Trang {movementPage} / {movementLastPage}</span>
                        <div>
                          <button type="button" className="admin-secondary-button" disabled={movementPage <= 1 || loading} onClick={() => setMovementPage((page) => page - 1)}>Trước</button>
                          <button type="button" className="admin-secondary-button" disabled={movementPage >= movementLastPage || loading} onClick={() => setMovementPage((page) => page + 1)}>Sau</button>
                        </div>
                      </div>
                    </>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
