"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getApiError } from "@/lib/apiClient";
import { cancelOrder, getOrderHistory, type OrderHistoryEntry } from "@/services/storeService";
import { ShopNavigation } from "@/app/shop/ShopNavigation";

const formatPrice = (value: number | string) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const statusLabels: Record<string, string> = {
  pending: "Chờ thanh toán",
  paid: "Đã thanh toán",
  shipped: "Đang giao hàng",
  cancelled: "Đã hủy",
};

const paymentMethodLabels: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng (COD)",
  bank_transfer: "Chuyển khoản ngân hàng (demo)",
  vnpay: "VNPay (demo)",
  momo: "MoMo (demo)",
};

function subscribeToShopToken(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getShopToken() {
  return window.localStorage.getItem("shop_token") ?? "";
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [cancelError, setCancelError] = useState("");
  const token = useSyncExternalStore(subscribeToShopToken, getShopToken, () => "");

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm(`Bạn có chắc muốn hủy đơn hàng #${orderId}?`)) return;

    setCancellingOrderId(orderId);
    setCancelError("");
    try {
      await cancelOrder(token, orderId);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, status: "cancelled" } : order,
        ),
      );
    } catch (cancelRequestError: unknown) {
      setCancelError(getApiError(cancelRequestError));
    } finally {
      setCancellingOrderId(null);
    }
  };

  useEffect(() => {
    if (!token) return;
    let active = true;
    getOrderHistory(token, page)
      .then(({ data }) => {
        if (!active) return;
        setOrders(data.data);
        setLastPage(data.last_page);
        setError("");
      })
      .catch((loadError: unknown) => {
        if (active) setError(getApiError(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, token]);

  return (
    <div className="shop-page">
      <header className="site-header">
        <div className="wrap topbar"><Link href="/" className="logo">VIETNGHE SHOP</Link></div>
        <ShopNavigation active="orders" />
      </header>
      <main className="wrap page-content">
        <section className="editorial-heading">
          <span className="catalog-kicker">TÀI KHOẢN CỦA BẠN</span>
          <h1>Lịch sử mua hàng</h1>
          <p>Đơn hàng được liên kết với tài khoản bạn dùng khi đặt mua.</p>
        </section>

        {!token ? (
          <div className="catalog-state-card">
            <h2>Đăng nhập để xem đơn hàng</h2>
            <p>Lịch sử chỉ hiển thị những đơn được đặt khi bạn đã đăng nhập.</p>
            <Link className="catalog-retry-button" href="/login">Đăng nhập</Link>
          </div>
        ) : loading ? (
          <div className="catalog-state-card" role="status">Đang tải lịch sử mua hàng...</div>
        ) : error ? (
          <div className="catalog-state-card" role="alert">
            <h2>Không tải được lịch sử mua hàng</h2>
            <p>{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="catalog-state-card">
            <h2>Bạn chưa có đơn hàng nào</h2>
            <p>Đơn đặt khi đã đăng nhập sẽ xuất hiện tại đây.</p>
            <Link className="catalog-retry-button" href="/products">Khám phá sản phẩm</Link>
          </div>
        ) : (
          <>
            {cancelError && <p className="form-feedback error" role="alert">{cancelError}</p>}
            <section className="order-history-list" aria-label="Danh sách đơn hàng">
              {orders.map((order) => (
                <article className="order-history-card" key={order.id}>
                  <header className="order-history-heading">
                    <div>
                      <strong>Đơn hàng #{order.id}</strong>
                      <time dateTime={order.created_at}>{formatDate(order.created_at)}</time>
                    </div>
                    <span className={`order-history-status status-${order.status}`}>
                      {order.status === "pending" && order.payment_method === "cod"
                        ? "Chờ giao hàng"
                        : statusLabels[order.status] ?? order.status}
                    </span>
                  </header>
                  <Link className="order-detail-link" href={`/orders/${order.id}`}>
                    Xem chi tiết đơn hàng
                  </Link>
                  {order.status === "pending" && order.payment_method === "cod" && (
                    <button
                      className="order-cancel-button"
                      type="button"
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={cancellingOrderId !== null}
                    >
                      {cancellingOrderId === order.id ? "Đang hủy..." : "Hủy đơn hàng"}
                    </button>
                  )}
                  <ul>
                    {order.items.map((item) => (
                      <li key={item.id}>
                        <span>{item.product?.name ?? "Sản phẩm không còn bán"} × {item.quantity}</span>
                        <strong>{formatPrice(Number(item.price) * item.quantity)}</strong>
                      </li>
                    ))}
                    {order.promo_code && (
                      <li className="order-history-discount">
                        <span>Mã {order.promo_code}</span>
                        <strong>-{formatPrice(Number(order.discount_amount ?? 0))}</strong>
                      </li>
                    )}
                  </ul>
                  <footer>
                    <span>{paymentMethodLabels[order.payment_method ?? ""] ?? "Thanh toán"}</span>
                    <strong>Tổng cộng: {formatPrice(order.total)}</strong>
                  </footer>
                </article>
              ))}
            </section>
            {lastPage > 1 && (
              <nav className="catalog-pagination" aria-label="Phân trang lịch sử mua hàng">
                <button type="button" disabled={page <= 1} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Trước</button>
                <span>Trang {page} / {lastPage}</span>
                <button type="button" disabled={page >= lastPage} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Sau</button>
              </nav>
            )}
          </>
        )}
      </main>
    </div>
  );
}
