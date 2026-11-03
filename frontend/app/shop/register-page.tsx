"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getApiError } from "@/lib/apiClient";
import { register } from "@/services/authService";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== passwordConfirmation) {
      setMessage("Mật khẩu xác nhận không khớp.");
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const { data } = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        password_confirmation: passwordConfirmation,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("shop_token", data.token || "");
      }

      setMessage("Tài khoản đã được tạo thành công!");
      setIsError(false);
      setName("");
      setEmail("");
      setPassword("");
      setPasswordConfirmation("");
      router.push("/");
    } catch (error) {
      setMessage(getApiError(error));
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page register-page">
      <header className="login-header">
        <Link href="/" className="login-brand">
          <span className="login-brand-mark">V</span>
          <span>thegioididongthongminh</span>
        </Link>
        <Link href="/" className="login-home-link">← <span>Về trang chủ</span></Link>
      </header>

      <div className="login-main">
        <div className="login-card register-card">
          <aside className="login-promo register-promo">
            <span className="login-promo-label"><i /> VIETNGHE SHOP</span>
            <div className="login-promo-copy">
              <h1>Bắt đầu hành trình<br /><span>công nghệ của bạn.</span></h1>
              <p>Tạo tài khoản để khám phá sản phẩm mới và trải nghiệm mua sắm dễ dàng hơn.</p>
            </div>
            <div className="login-device-art" aria-hidden="true">
              <div className="login-device-screen">V</div>
              <span className="login-device-spark">✦</span>
            </div>
            <div className="login-promo-foot">
              <span>✦</span> Hàng chính hãng · Hỗ trợ tận tâm
            </div>
          </aside>

          <section className="login-form-panel register-form-panel">
            <div className="login-mobile-brand">VIETNGHE SHOP</div>
            <span className="login-overline">THAM GIA CÙNG CHÚNG TÔI</span>
            <h2>Tạo tài khoản</h2>
            <p className="login-intro">Điền thông tin bên dưới để đăng ký.</p>

            <form className="login-form register-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="name">Họ và tên</label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                />
              </div>

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
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="password_confirmation">Xác nhận mật khẩu</label>
                <input
                  id="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                />
              </div>

              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>

            {message ? (
              <p className={`login-message ${isError ? "error" : "success"}`} role="status">
                {message}
              </p>
            ) : null}

            <div className="login-register-prompt">
              <span>Đã có tài khoản?</span>
              <Link href="/login">Đăng nhập</Link>
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
