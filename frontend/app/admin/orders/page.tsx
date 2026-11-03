"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { getApiError } from "@/lib/apiClient";
import AdminPagination from "../_components/AdminPagination";
import AdminSidebar from "../_components/AdminSidebar";
import {
  getAdminOrders,
  updateAdminOrderStatus,
  type AdminOrder,
  type AdminOrderStatus,
} from "@/services/storeService";
import type { PaginationMeta } from "@/services/types";

const emptyMeta: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
};

const statusLabels: Record<AdminOrderStatus, string> = {
  pending: "Chờ xử lý",
  paid: "Đã thanh toán",
  shipped: "Đang giao",
  cancelled: "Đã hủy",
};

const paymentMethodLabels: Record<string, string> = {
  cod: "COD",
  bank_transfer: "Chuyển khoản",
  vnpay: "VNPay",
  momo: "MoMo",
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

function availableStatuses(order: AdminOrder): AdminOrderStatus[] {
  if (order.status === "pending") {
    if (order.payment_method === "cod") return ["pending", "paid", "shipped"];
    if (order.payment_method === "bank_transfer") return ["pending", "paid"];
  }
  if (order.status === "paid") return ["paid", "shipped"];
  return [order.status];
}

function canAdminCancel(order: AdminOrder) {
  return order.status === "pending"
    && (order.payment_method === "cod" || order.payment_method === "bank_transfer");
}

export default function AdminOrdersPage() {
  const token = useSyncExternalStore(subscribeToToken, getStoredToken, () => "");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrders = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await getAdminOrders(token, {
        page,
        per_page: perPage,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      });
      setOrders(response.data.data);
      setMeta(response.data.meta);
    } catch (loadError: unknown) {
      setError(getApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter, token]);

  useEffect(() => {
    void Promise.resolve().then(loadOrders);
  }, [loadOrders]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStatusChange = async (order: AdminOrder, status: AdminOrderStatus) => {
    if (status === order.status || status === "pending") return;
    if (
      status === "cancelled" &&
      !window.confirm(`Hủy đơn hàng #${order.id} và hoàn sản phẩm về kho?`)
    ) return;

    setUpdatingOrderId(order.id);
    setError("");
    setNotice("");
    try {
      const response = await updateAdminOrderStatus(
        token,
        order.id,
        status,
      );
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? {
                ...currentOrder,
                status: response.data.data.status,
                paid_at: response.data.data.paid_at,
              }
            : currentOrder,
        ),
      );
      setNotice(`Đã cập nhật trạng thái đơn hàng #${order.id}.`);
    } catch (updateError: unknown) {
      setError(getApiError(updateError));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <AdminSidebar
          section="products"
          contentSection="orders"
          trashed={false}
          onTrashOpen={() => undefined}
        />
        <div className="admin-workspace">
          <header className="admin-header">
            <div>
              <span className="admin-eyebrow">BÁN HÀNG</span>
              <h1>Quản lý đơn hàng</h1>
              <p>Theo dõi đơn, tra cứu khách hàng và cập nhật trạng thái xử lý.</p>
            </div>
            <div className="admin-header-status"><span /> Hệ thống quản lý</div>
          </header>
          <div className="admin-content">
            {error && <p className="admin-notice error" role="alert">{error}</p>}
            {notice && <p className="admin-notice success" role="status">{notice}</p>}

            {!token ? (
              <section className="admin-card admin-sign-in">
                <h2>Đăng nhập để tiếp tục</h2>
                <p>Đăng nhập bằng tài khoản admin được cấp quyền để quản lý đơn hàng.</p>
                <Link href="/login">Đăng nhập</Link>
              </section>
            ) : (
              <section className="admin-card">
                <div className="admin-card-heading">
                  <div>
                    <span className="admin-eyebrow">ĐƠN HÀNG</span>
                    <h2>Danh sách đơn hàng ({meta.total})</h2>
                  </div>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => void loadOrders()}
                    disabled={loading}
                  >
                    Tải lại
                  </button>
                </div>

                <form className="admin-order-filters" onSubmit={handleSearch}>
                  <label>
                    Tìm đơn hàng
                    <input
                      type="search"
                      value={searchInput}
                      maxLength={255}
                      placeholder="Mã đơn, tên, email hoặc số điện thoại"
                      onChange={(event) => setSearchInput(event.target.value)}
                    />
                  </label>
                  <label>
                    Trạng thái
                    <select
                      value={statusFilter}
                      onChange={(event) => {
                        setPage(1);
                        setStatusFilter(event.target.value);
                      }}
                    >
                      <option value="">Tất cả trạng thái</option>
                      <option value="pending">Chờ xử lý</option>
                      <option value="paid">Đã thanh toán</option>
                      <option value="shipped">Đang giao</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </label>
                  <button type="submit" className="admin-primary-button" disabled={loading}>Tìm kiếm</button>
                </form>

                {loading ? (
                  <p className="admin-empty" role="status">Đang tải đơn hàng...</p>
                ) : orders.length === 0 ? (
                  <p className="admin-empty">Không tìm thấy đơn hàng phù hợp.</p>
                ) : (
                  <>
                    <div className="admin-table-wrap">
                      <table className="admin-table admin-orders-table">
                        <thead>
                          <tr>
                            <th>Đơn hàng</th>
                            <th>Khách hàng</th>
                            <th>Sản phẩm</th>
                            <th>Thanh toán</th>
                            <th>Trạng thái</th>
                            <th>Tổng tiền</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((order) => (
                            <tr key={order.id}>
                              <td>
                                <strong>#{order.id}</strong>
                                <small>{formatDate(order.created_at)}</small>
                                <details className="admin-order-details">
                                  <summary>Xem chi tiết đơn hàng</summary>
                                  <div>
                                    <p><strong>Người nhận:</strong> {order.customer_name || "Chưa có"}</p>
                                    <p><strong>Email:</strong> {order.customer_email || "Chưa có"}</p>
                                    <p><strong>Số điện thoại:</strong> {order.customer_phone || "Chưa có"}</p>
                                    <p><strong>Địa chỉ:</strong> {order.address || "Chưa có"}</p>
                                    <p><strong>Ngày đặt:</strong> {formatDate(order.created_at)}</p>
                                    {order.items.map((item) => (
                                      <p key={item.id}>
                                        {item.product?.name ?? "Sản phẩm không còn bán"} × {item.quantity}
                                        {" — "}{formatPrice(Number(item.price) * item.quantity)}
                                      </p>
                                    ))}
                                    {order.promo_code && (
                                      <p>Mã {order.promo_code}: -{formatPrice(Number(order.discount_amount))}</p>
                                    )}
                                    {order.paid_at && <p><strong>Đã thanh toán lúc:</strong> {formatDate(order.paid_at)}</p>}
                                  </div>
                                </details>
                              </td>
                              <td>
                                <strong>{order.customer_name || "Khách"}</strong>
                                <small>{order.customer_email || "Không có email"}</small>
                                <small>{order.customer_phone || "Không có số điện thoại"}</small>
                              </td>
                              <td>{order.items.reduce((quantity, item) => quantity + item.quantity, 0)} sản phẩm</td>
                              <td>{paymentMethodLabels[order.payment_method ?? ""] ?? order.payment_method ?? "—"}</td>
                              <td>
                                <select
                                  className={`admin-order-status status-${order.status}`}
                                  aria-label={`Trạng thái đơn hàng ${order.id}`}
                                  value={order.status}
                                  disabled={updatingOrderId !== null || availableStatuses(order).length === 1}
                                  onChange={(event) => void handleStatusChange(order, event.target.value as AdminOrderStatus)}
                                >
                                  {availableStatuses(order).map((status) => (
                                    <option key={status} value={status}>{statusLabels[status]}</option>
                                  ))}
                                </select>
                              </td>
                              <td><strong>{formatPrice(order.total)}</strong></td>
                              <td className="admin-row-actions">
                                {canAdminCancel(order) && (
                                  <button
                                    type="button"
                                    className="admin-order-cancel-action"
                                    disabled={updatingOrderId !== null}
                                    onClick={() => void handleStatusChange(order, "cancelled")}
                                  >
                                    {updatingOrderId === order.id ? "Đang hủy..." : "Hủy đơn hàng"}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <AdminPagination
                      meta={meta}
                      page={page}
                      perPage={perPage}
                      loading={loading}
                      onPageChange={setPage}
                      onPerPageChange={(value) => {
                        setPage(1);
                        setPerPage(value);
                      }}
                    />
                  </>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
