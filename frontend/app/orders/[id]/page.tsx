"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getApiError } from "@/lib/apiClient";
import { cancelOrder, getOrderDetail, type OrderDetail } from "@/services/storeService";
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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const token = useSyncExternalStore(subscribeToShopToken, getShopToken, () => "");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    if (!token || !id) return;
    let active = true;
    getOrderDetail(token, id)
      .then(({ data }) => {
        if (!active) return;
        setOrder(data.data);
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
  }, [id, token]);

  const statusLabel = order?.status === "pending" && order.payment_method === "cod"
    ? "Chờ giao hàng"
    : statusLabels[order?.status ?? ""] ?? order?.status;

  const handleCancelOrder = async () => {
    if (!order || !window.confirm(`Bạn có chắc muốn hủy đơn hàng #${order.id}?`)) return;

    setCancelling(true);
    setCancelError("");
    try {
      await cancelOrder(token, order.id);
      setOrder({ ...order, status: "cancelled" });
    } catch (cancelRequestError: unknown) {
      setCancelError(getApiError(cancelRequestError));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="shop-page">
      <header className="site-header">
        <div className="wrap topbar"><Link href="/" className="logo">VIETNGHE SHOP</Link></div>
        <ShopNavigation active="orders" />
      </header>
      <main className="wrap page-content">
        <section className="editorial-heading">
          <span className="catalog-kicker">TÀI KHOẢN CỦA BẠN</span>
          <h1>Chi tiết đơn hàng{order ? ` #${order.id}` : ""}</h1>
          <p>Thông tin sản phẩm, thanh toán và giao nhận của đơn hàng.</p>
        </section>

        {!token ? (
          <div className="catalog-state-card">
            <h2>Đăng nhập để xem đơn hàng</h2>
            <p>Vui lòng đăng nhập bằng tài khoản đã đặt đơn này.</p>
            <Link className="catalog-retry-button" href="/login">Đăng nhập</Link>
          </div>
        ) : loading ? (
          <div className="catalog-state-card" role="status">Đang tải chi tiết đơn hàng...</div>
        ) : error ? (
          <div className="catalog-state-card" role="alert">
            <h2>Không tải được chi tiết đơn hàng</h2>
            <p>{error}</p>
            <Link className="catalog-retry-button" href="/orders">Quay lại lịch sử mua hàng</Link>
          </div>
        ) : order ? (
          <div className="order-detail-layout">
            <section className="order-detail-card" aria-labelledby="order-items-heading">
              <header className="order-detail-summary">
                <div>
                  <h2>Đơn hàng #{order.id}</h2>
                  <time dateTime={order.created_at}>Đặt lúc {formatDate(order.created_at)}</time>
                </div>
                <span className={`order-history-status status-${order.status}`}>{statusLabel}</span>
              </header>
              {cancelError && <p className="form-feedback error" role="alert">{cancelError}</p>}
              {order.status === "pending" && order.payment_method === "cod" && (
                <button
                  className="order-cancel-button"
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                >
                  {cancelling ? "Đang hủy..." : "Hủy đơn hàng"}
                </button>
              )}
              {order.status === "pending" && order.payment_method === "cod" && (
                <p className="order-cancel-note">Có thể hủy khi đơn chưa được xử lý giao hàng.</p>
              )}
              <h3 id="order-items-heading">Sản phẩm đã đặt</h3>
              <ul className="order-detail-items">
                {order.items.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.product?.name ?? "Sản phẩm không còn bán"}</strong>
                      <span>{formatPrice(item.price)} × {item.quantity}</span>
                    </div>
                    <strong>{formatPrice(Number(item.price) * item.quantity)}</strong>
                  </li>
                ))}
              </ul>
              <div className="order-detail-total">
                <span>Tạm tính</span>
                <strong>{formatPrice(order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0))}</strong>
              </div>
              {order.promo_code && (
                <div className="order-detail-total order-detail-discount">
                  <span>Mã ưu đãi {order.promo_code}</span>
                  <strong>-{formatPrice(Number(order.discount_amount))}</strong>
                </div>
              )}
              <div className="order-detail-total">
                <span>Thành tiền</span>
                <strong>{formatPrice(order.total)}</strong>
              </div>
            </section>

            <aside className="order-detail-card order-detail-information">
              <section>
                <h2>Thông tin nhận hàng</h2>
                <dl>
                  <div><dt>Người nhận</dt><dd>{order.customer_name || "Chưa có thông tin"}</dd></div>
                  <div><dt>Email</dt><dd>{order.customer_email || "Chưa có thông tin"}</dd></div>
                  <div><dt>Số điện thoại</dt><dd>{order.customer_phone || "Chưa có thông tin"}</dd></div>
                  <div><dt>Địa chỉ</dt><dd>{order.address || "Chưa có thông tin"}</dd></div>
                </dl>
              </section>
              <section>
                <h2>Thanh toán</h2>
                <dl>
                  <div>
                    <dt>Phương thức</dt>
                    <dd>{paymentMethodLabels[order.payment_method ?? ""] ?? "Thanh toán"}</dd>
                  </div>
                  {order.paid_at && (
                    <div><dt>Thanh toán lúc</dt><dd>{formatDate(order.paid_at)}</dd></div>
                  )}
                  <div><dt>Trạng thái</dt><dd>{statusLabel}</dd></div>
                </dl>
              </section>
            </aside>
          </div>
        ) : (
          <div className="catalog-state-card" role="alert">
            <h2>Không tìm thấy đơn hàng</h2>
            <Link className="catalog-retry-button" href="/orders">Quay lại lịch sử mua hàng</Link>
          </div>
        )}
        <Link className="order-detail-back" href="/orders">← Quay lại lịch sử mua hàng</Link>
      </main>
    </div>
  );
}
