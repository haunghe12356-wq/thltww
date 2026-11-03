"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { getApiError } from "@/lib/apiClient";
import { submitContactMessage } from "@/services/storeService";
import { ShopNavigation } from "@/app/shop/ShopNavigation";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await submitContactMessage({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? ""),
        subject: String(form.get("subject") ?? ""),
        message: String(form.get("message") ?? ""),
      });
      setMessage(response.data.message);
      formElement.reset();
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
        <ShopNavigation active="contact" />
      </header>
      <main className="wrap page-content">
        <section className="editorial-heading">
          <span className="catalog-kicker">VIETNGHE SHOP</span>
          <h1>Liên hệ với chúng tôi</h1>
          <p>Gửi câu hỏi hoặc ghé cửa hàng tại 68 Trung Dương, Kiêu Kỵ, Gia Lâm, Hà Nội.</p>
        </section>
        <div className="contact-layout">
          <form className="contact-form" onSubmit={handleSubmit}>
            <h2>Gửi lời nhắn</h2>
            <label>Họ và tên<input name="name" required maxLength={255} /></label>
            <label>Email<input name="email" type="email" required maxLength={255} /></label>
            <label>Số điện thoại<input name="phone" type="tel" maxLength={30} /></label>
            <label>Chủ đề<input name="subject" required maxLength={255} /></label>
            <label>Nội dung<textarea name="message" rows={5} required maxLength={5000} /></label>
            {error && <p className="form-feedback error" role="alert">{error}</p>}
            {message && <p className="form-feedback success" role="status">{message}</p>}
            <button type="submit" className="catalog-retry-button" disabled={loading}>
              {loading ? "Đang gửi..." : "Gửi liên hệ"}
            </button>
          </form>
          <section className="contact-map-section">
            <h2>Địa chỉ cửa hàng</h2>
            <p>68 Trung Dương, Kiêu Kỵ, Gia Lâm, Hà Nội</p>
            <iframe
              title="Bản đồ vị trí cửa hàng VietNghe"
              src="https://www.google.com/maps?q=68%20Trung%20D%C6%B0%C6%A1ng%2C%20Ki%C3%AAu%20K%E1%BB%B5%2C%20Gia%20L%C3%A2m%2C%20H%C3%A0%20N%E1%BB%99i&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
            <a href="https://www.google.com/maps/search/?api=1&query=68+Trung+Duong+Kieu+Ky+Gia+Lam+Ha+Noi" target="_blank" rel="noreferrer">
              Mở chỉ đường trên Google Maps ↗
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
