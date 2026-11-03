"use client";

import Link from "next/link";
import { useCart } from "@/services/cartService";

export function ShopNavigation({ active }: { active: "home" | "products" | "articles" | "contact" | "orders" | "account" }) {
  const { count } = useCart();

  return (
    <nav className="main-nav">
      <div className="wrap nav-links">
        <Link href="/" aria-current={active === "home" ? "page" : undefined}>Trang chủ</Link>
        <Link href="/products" aria-current={active === "products" ? "page" : undefined}>Sản phẩm</Link>
        <Link href="/articles" aria-current={active === "articles" ? "page" : undefined}>Bài viết</Link>
        <Link href="/contact" aria-current={active === "contact" ? "page" : undefined}>Liên hệ</Link>
        <Link href="/cart" className="nav-cart-link">Giỏ hàng ({count})</Link>
        <Link href="/orders" aria-current={active === "orders" ? "page" : undefined}>Lịch sử mua hàng</Link>
        <Link href="/account" aria-current={active === "account" ? "page" : undefined}>Thông tin khách hàng</Link>
        <Link href="/login">Đăng nhập</Link>
        <Link href="/register">Đăng ký</Link>
        <Link href="/admin">Quản trị</Link>
      </div>
    </nav>
  );
}

export function CartBadge() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="cart-badge" aria-label={`Giỏ hàng có ${count} sản phẩm`}>
      {count}
    </Link>
  );
}
