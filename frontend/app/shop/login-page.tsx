"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getApiError } from "@/lib/apiClient";
import { login } from "@/services/authService";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const { data } = await login({ email, password });

      if (typeof window !== "undefined") {
        localStorage.setItem("shop_token", data.token || "");
      }

      setMessage("Đăng nhập thành công. Chào mừng bạn quay lại!");
      setIsError(false);
      setEmail("");
      setPassword("");
      router.push("/");
    } catch (error) {
      setMessage(getApiError(error));
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <header className="login-header">
        <Link href="/" className="login-brand">
          <span className="login-brand-mark">V</span>
          <span>thegioididongthongminh</span>
        </Link>
        <Link href="/" className="login-home-link">← <span>Về trang chủ</span></Link>
      </header>

      <div className="login-main">
        <div className="login-card">
          <aside className="login-promo">
            <span className="login-promo-label"><i /> VIETNGHE SHOP</span>
            <div className="login-promo-copy">
              <h1>Công nghệ tốt,<br /><span>giá thật chất.</span></h1>
              <p>Đăng nhập để tiếp tục khám phá những sản phẩm công nghệ dành riêng cho bạn.</p>
            </div>
            <div className="login-device-art" aria-hidden="true">
              <div className="login-device-screen">V</div>
              <span className="login-device-spark">✦</span>
            </div>
            <div className="login-promo-foot">
              <span>✦</span> Mua sắm dễ dàng · Hỗ trợ tận tâm
            </div>
          </aside>

          <section className="login-form-panel">
            <div className="login-mobile-brand">VIETNGHE SHOP</div>
            <span className="login-overline">CHÀO MỪNG BẠN QUAY LẠI</span>
            <h2>Đăng nhập</h2>
            <p className="login-intro">Nhập thông tin tài khoản để tiếp tục.</p>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="email">Địa chỉ email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="example@email.com"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="password">Mật khẩu</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  required
                />
              </div>

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            {message ? (
              <p className={`login-message ${isError ? "error" : "success"}`} role="status">
                {message}
              </p>
            ) : null}

            <div className="login-register-prompt">
              <span>Chưa có tài khoản?</span>
              <Link href="/register">Tạo tài khoản</Link>
            </div>
          </section>
        </div>
      </div>

      <footer className="login-footer">
        <span>© 2026 VietNghe Shop</span>
        <span>Công nghệ cho mọi nhà</span>
      </footer>
    </main>
  );
}
