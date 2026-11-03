"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { getApiError } from "@/lib/apiClient";
import { clearCart, removeFromCart, updateCartQuantity, useCart } from "@/services/cartService";
import { getProductPrice } from "@/services/productService";
import { validatePromotion, type PromotionQuote } from "@/services/promotionService";
import { submitOrder } from "@/services/storeService";
import { getCurrentUser } from "@/services/userService";
import { ShopNavigation } from "@/app/shop/ShopNavigation";

type PaymentMethod = "cod" | "bank_transfer" | "vnpay" | "momo";

const paymentMethods: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "cod", label: "Thanh toán khi nhận hàng (COD)", description: "Thanh toán trực tiếp khi nhận được hàng." },
  { value: "bank_transfer", label: "Chuyển khoản ngân hàng", description: "Mô phỏng thanh toán chuyển khoản cho đơn hàng demo." },
  { value: "vnpay", label: "VNPay", description: "Mô phỏng thanh toán VNPay cho đơn hàng demo." },
  { value: "momo", label: "MoMo", description: "Mô phỏng thanh toán MoMo cho đơn hàng demo." },
];

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getLocationSearch() {
  return window.location.search;
}

export default function CartPage() {
  const { items } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromotionQuote | null>(null);
  const [promoMessage, setPromoMessage] = useState("");
  const [validatingPromo, setValidatingPromo] = useState(false);
  useEffect(() => {
    const token = window.localStorage.getItem("shop_token");
    if (!token) return;

    let active = true;
    getCurrentUser(token)
      .then(({ data }) => {
        if (!active) return;
        setCustomerName(data.name);
        setCustomerEmail(data.email);
        setCustomerPhone(data.phone ?? "");
        setCustomerAddress(data.address ?? "");
        setProfileMessage("Đã tự điền thông tin từ tài khoản. Bạn có thể sửa thông tin trước khi đặt hàng.");
      })
      .catch(() => {
        if (active) {
          setProfileMessage("Không tải được thông tin tài khoản. Vui lòng nhập thông tin nhận hàng bên dưới.");
        }
      });

    return () => {
      active = false;
    };
  }, []);
  const search = useSyncExternalStore(subscribeToLocation, getLocationSearch, () => "");
  const searchParams = new URLSearchParams(search);
  const paymentStatus = searchParams.get("payment");
  const orderId = searchParams.get("order_id");
  const orderLabel = orderId ? ` cho đơn hàng #${orderId}` : "";
  const paymentMessage = paymentStatus === "processing"
    ? `VNPay đã nhận kết quả${orderLabel}. Cửa hàng đang xác nhận thanh toán; email xác nhận sẽ được gửi sau khi hoàn tất.`
    : paymentStatus === "failed"
      ? `Thanh toán${orderLabel} chưa hoàn tất. Nếu tài khoản đã bị trừ tiền, vui lòng liên hệ cửa hàng để được hỗ trợ.`
      : paymentStatus === "unverified"
        ? "Không xác minh được kết quả thanh toán. Vui lòng kiểm tra email hoặc liên hệ cửa hàng trước khi thanh toán lại."
        : "";
  const total = items.reduce((sum, item) => sum + getProductPrice(item.product) * item.quantity, 0);
  const discountAmount = appliedPromo?.discount_amount ?? 0;
  const payableTotal = appliedPromo?.total ?? total;

  const clearAppliedPromotion = () => {
    if (appliedPromo) {
      setAppliedPromo(null);
      setPromoMessage("Giỏ hàng đã thay đổi. Vui lòng áp dụng lại mã khuyến mãi.");
    }
  };

  const handleApplyPromo = async () => {
    setValidatingPromo(true);
    setPromoMessage("");
    try {
      const { data } = await validatePromotion(
        promoInput.trim(),
        items.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
      );
      setAppliedPromo(data.data);
      setPromoInput(data.data.code);
      setPromoMessage(`Áp dụng thành công: giảm ${formatPrice(data.data.discount_amount)}.`);
    } catch (validationError: unknown) {
      setAppliedPromo(null);
      setPromoMessage(getApiError(validationError));
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setCheckoutMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await submitOrder({
        customer_name: String(form.get("customer_name") ?? ""),
        customer_email: String(form.get("customer_email") ?? ""),
        customer_phone: String(form.get("customer_phone") ?? ""),
        address: String(form.get("address") ?? ""),
        promo_code: appliedPromo?.code,
        payment_method: paymentMethod,
        items: items.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
      });
      if (response.data.data.payment_mode === "demo" || response.data.data.payment_mode === "cod") {
        const {
          id,
          email_sent: emailSent,
          email_status: emailStatus,
          confirmation_email: confirmationEmail,
          status,
          promo_code: promoCode,
          discount_amount: appliedDiscount,
        } = response.data.data;
        const selectedMethod = paymentMethods.find((method) => method.value === response.data.data.payment_method);
        const statusMessage = paymentMethod === "cod"
          ? "Shop sẽ thu tiền khi giao hàng."
          : status === "paid"
            ? "Giao dịch mô phỏng đã hoàn tất."
            : "";
        const promoStatusMessage = promoCode
          ? ` Mã ${promoCode} đã giảm ${formatPrice(appliedDiscount)}.`
          : "";
        clearCart();
        formElement.reset();
        setAppliedPromo(null);
        setPromoInput("");
        setPromoMessage("");
        const emailFailureMessage = emailStatus === "not_configured"
          ? "máy chủ SMTP chưa được cấu hình."
          : "máy chủ SMTP từ chối đăng nhập hoặc gặp lỗi kết nối. Hãy kiểm tra MAIL_USERNAME và App Password trong backend/.env.";
        setCheckoutMessage(
          emailSent
            ? `Đặt hàng thành công với ${selectedMethod?.label ?? "phương thức đã chọn"}. ${statusMessage}${promoStatusMessage} Đã gửi email xác nhận tới ${confirmationEmail}. Mã đơn hàng #${id}.`
            : `Đặt hàng thành công với ${selectedMethod?.label ?? "phương thức đã chọn"}. ${statusMessage}${promoStatusMessage} Đơn hàng #${id} đã được ghi nhận, nhưng chưa gửi được email tới ${confirmationEmail} vì ${emailFailureMessage}`,
        );
      } else if (response.data.data.payment_url) {
        clearCart();
        setAppliedPromo(null);
        setPromoInput("");
        setPromoMessage("");
        window.location.assign(response.data.data.payment_url);
      } else {
        throw new Error("Máy chủ chưa trả về liên kết thanh toán.");
      }
    } catch (submitError) {
      setError(getApiError(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shop-page">
      <header className="site-header">
        <div className="wrap topbar"><Link href="/" className="logo">thegioididongthongminh</Link></div>
        <ShopNavigation active="products" />
      </header>
      <main className="wrap page-content">
        <section className="editorial-heading">
          <span className="catalog-kicker">VIETNGHE SHOP</span>
          <h1>Giỏ hàng</h1>
        </section>
        {checkoutMessage && <p className="form-feedback success" role="status">{checkoutMessage}</p>}
        {paymentMessage && <p className="form-feedback success" role="status">{paymentMessage}</p>}
        {items.length === 0 ? (
          <div className="catalog-state-card">
            <h2>Giỏ hàng đang trống</h2>
            <p>Chọn sản phẩm bạn yêu thích để bắt đầu đặt hàng.</p>
            <Link className="catalog-retry-button" href="/products">Xem sản phẩm</Link>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-items" aria-label="Sản phẩm trong giỏ hàng">
              {items.map(({ product, quantity }) => (
                <article className="cart-item" key={product.id}>
                  <Image
                    src={product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80"}
                    alt={product.name}
                    width={120}
                    height={120}
                    unoptimized
                  />
                  <div className="cart-item-details">
                    <Link href={`/products/${product.id}`}><strong>{product.name}</strong></Link>
                    <span className="cart-unit-price">
                      <span>Đơn giá:</span> {formatPrice(getProductPrice(product))}
                      {Number(product.discount_percent ?? 0) > 0 && <del>{formatPrice(Number(product.price))}</del>}
                    </span>
                    <div className="cart-quantity">
                      <label htmlFor={`quantity-${product.id}`}>Số lượng</label>
                      <input
                        id={`quantity-${product.id}`}
                        type="number"
                        min="1"
                        max={product.stock}
                        value={quantity}
                        disabled={validatingPromo}
                        onChange={(event) => {
                          clearAppliedPromotion();
                          updateCartQuantity(product.id, Number(event.target.value));
                        }}
                      />
                      <button
                        type="button"
                        disabled={validatingPromo}
                        onClick={() => {
                          clearAppliedPromotion();
                          removeFromCart(product.id);
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                  <strong className="cart-line-total">
                    <span>Thành tiền:</span> {formatPrice(getProductPrice(product) * quantity)}
                  </strong>
                </article>
              ))}
              <div className="cart-total-summary">
                <p className="cart-total"><span>Tạm tính</span><strong>{formatPrice(total)}</strong></p>
                {appliedPromo && <p className="cart-total cart-discount"><span>Ưu đãi {appliedPromo.code} ({appliedPromo.discount_percent}%)</span><strong>-{formatPrice(discountAmount)}</strong></p>}
                <p className="cart-total cart-payable-total"><span>Thành tiền</span><strong>{formatPrice(payableTotal)}</strong></p>
              </div>
            </section>
            <form className="contact-form checkout-form" onSubmit={handleCheckout}>
              <h2>Thông tin nhận hàng và thanh toán</h2>
              <div className="promo-code-field">
                <label htmlFor="promo-code">Mã khuyến mãi</label>
                <div>
                  <input
                    id="promo-code"
                    type="text"
                    autoComplete="off"
                    maxLength={50}
                    value={promoInput}
                    onChange={(event) => {
                      setPromoInput(event.target.value);
                      setAppliedPromo(null);
                      setPromoMessage("");
                    }}
                    placeholder="Nhập mã khuyến mãi"
                  />
                  <button type="button" onClick={() => void handleApplyPromo()} disabled={loading || validatingPromo || !promoInput.trim()}>
                    {validatingPromo ? "Đang kiểm tra..." : "Áp dụng"}
                  </button>
                </div>
                {promoMessage && (
                  <p className={`form-feedback ${appliedPromo ? "success" : "error"}`} role="status">
                    {promoMessage}
                  </p>
                )}
                <small>Nhập mã khuyến mãi cửa hàng cung cấp để xem mức giảm.</small>
              </div>
              {profileMessage && <p className="form-feedback" role="status">{profileMessage}</p>}
              <label>Họ và tên<input name="customer_name" autoComplete="name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} required maxLength={255} /></label>
              <label>Email nhận xác nhận đơn hàng<input name="customer_email" type="email" autoComplete="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} required maxLength={255} /></label>
              <label>Số điện thoại<input name="customer_phone" type="tel" autoComplete="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} required maxLength={30} /></label>
              <label>Địa chỉ nhận hàng<textarea name="address" autoComplete="street-address" rows={3} value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} required maxLength={1000} /></label>
              <fieldset className="checkout-payment-methods">
                <legend>Phương thức thanh toán</legend>
                {paymentMethods.map((method) => (
                  <label className="checkout-payment-option" key={method.value}>
                    <input
                      type="radio"
                      name="payment_method"
                      value={method.value}
                      checked={paymentMethod === method.value}
                      onChange={() => setPaymentMethod(method.value)}
                    />
                    <span>
                      <strong>{method.label}</strong>
                      <small>{method.description}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
              <p>Thanh toán trực tuyến đang ở chế độ demo, không trừ tiền. Email xác nhận sẽ được gửi nếu máy chủ SMTP đã cấu hình.</p>
              {error && <p className="form-feedback error" role="alert">{error}</p>}
              <button type="submit" className="catalog-retry-button" disabled={loading}>
                {loading ? "Đang đặt hàng..." : "Đặt hàng"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
