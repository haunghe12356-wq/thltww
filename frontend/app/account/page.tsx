"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { getApiError } from "@/lib/apiClient";
import { getCurrentUser, updateCurrentUser } from "@/services/userService";
import { ShopNavigation } from "@/app/shop/ShopNavigation";

type CustomerProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

function subscribeToShopToken(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getShopToken() {
  return window.localStorage.getItem("shop_token") ?? "";
}

const emptyProfile: CustomerProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

export default function AccountPage() {
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const token = useSyncExternalStore(subscribeToShopToken, getShopToken, () => "");

  useEffect(() => {
    if (!token) return;

    let active = true;
    getCurrentUser(token)
      .then(({ data }) => {
        if (active) {
          setProfile({
            name: data.name,
            email: data.email,
            phone: data.phone ?? "",
            address: data.address ?? "",
          });
        }
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
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await updateCurrentUser(token, {
        ...profile,
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase(),
        phone: profile.phone.trim(),
        address: profile.address.trim(),
      });
      setProfile({
        name: data.name,
        email: data.email,
        phone: data.phone ?? "",
        address: data.address ?? "",
      });
      setMessage("Đã lưu thông tin khách hàng. Checkout sẽ tự điền thông tin này.");
    } catch (saveError: unknown) {
      setError(getApiError(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="shop-page">
      <header className="site-header">
        <div className="wrap topbar"><Link href="/" className="logo">VIETNGHE SHOP</Link></div>
        <ShopNavigation active="account" />
      </header>
      <main className="wrap page-content">
        <section className="editorial-heading">
          <span className="catalog-kicker">TÀI KHOẢN CỦA BẠN</span>
          <h1>Thông tin khách hàng</h1>
          <p>Lưu thông tin liên hệ và địa chỉ để tự điền khi đặt hàng.</p>
        </section>

        {!token ? (
          <div className="catalog-state-card">
            <h2>Đăng nhập để quản lý thông tin</h2>
            <p>Thông tin khách hàng được lưu theo tài khoản của bạn.</p>
            <Link className="catalog-retry-button" href="/login">Đăng nhập</Link>
          </div>
        ) : loading ? (
          <div className="catalog-state-card" role="status">Đang tải thông tin khách hàng...</div>
        ) : (
          <form className="contact-form customer-profile-form" onSubmit={handleSubmit}>
            <h2>Thông tin tài khoản</h2>
            <label>
              Họ và tên
              <input
                autoComplete="name"
                maxLength={150}
                required
                value={profile.name}
                onChange={(event) => setProfile({ ...profile, name: event.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                maxLength={255}
                required
                value={profile.email}
                onChange={(event) => setProfile({ ...profile, email: event.target.value })}
              />
            </label>
            <label>
              Số điện thoại
              <input
                type="tel"
                autoComplete="tel"
                maxLength={30}
                value={profile.phone}
                onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
              />
            </label>
            <label>
              Địa chỉ nhận hàng
              <textarea
                autoComplete="street-address"
                rows={3}
                maxLength={1000}
                value={profile.address}
                onChange={(event) => setProfile({ ...profile, address: event.target.value })}
              />
            </label>
            {error && <p className="form-feedback error" role="alert">{error}</p>}
            {message && <p className="form-feedback success" role="status">{message}</p>}
            <button type="submit" className="catalog-retry-button" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thông tin"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
