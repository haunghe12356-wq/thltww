import Link from "next/link";
import type { Section } from "../_types";
import { sectionNames } from "../_types";

type AdminSidebarProps = {
  section: Section;
  contentSection?: "articles" | "contacts" | "inventory" | "orders" | "members" | "promotions" | "reviews";
  trashed: boolean;
  onTrashOpen: () => void;
};

export default function AdminSidebar({
  section,
  contentSection,
  trashed,
  onTrashOpen,
}: AdminSidebarProps) {
  return (
    <aside className="admin-sidebar">
      <Link href="/" className="admin-sidebar-brand">
        <span className="admin-sidebar-mark">V</span>
        <span><strong>VIETNGHE</strong><small>SHOP ADMIN</small></span>
      </Link>
      <span className="admin-sidebar-label">QUẢN LÝ CỬA HÀNG</span>
      <nav className="admin-sidebar-nav" aria-label="Quản lý cửa hàng">
        {(Object.keys(sectionNames) as Section[]).map((key) => (
          <Link
            key={key}
            className={!trashed && !contentSection && section === key ? "active" : ""}
            aria-current={!trashed && !contentSection && section === key ? "page" : undefined}
            href={`/admin/${key}`}
          >
            <span className="admin-sidebar-icon" aria-hidden="true">
              {key === "products" ? "SP" : key === "categories" ? "DM" : "TH"}
            </span>
            <span>{sectionNames[key]}</span>
          </Link>
        ))}
        <Link className={contentSection === "articles" ? "active" : ""} aria-current={contentSection === "articles" ? "page" : undefined} href="/admin/articles">
          <span className="admin-sidebar-icon" aria-hidden="true">BV</span>
          <span>Bài viết</span>
        </Link>
        <Link className={contentSection === "contacts" ? "active" : ""} aria-current={contentSection === "contacts" ? "page" : undefined} href="/admin/contacts">
          <span className="admin-sidebar-icon" aria-hidden="true">LH</span>
          <span>Liên hệ</span>
        </Link>
        <Link className={contentSection === "orders" ? "active" : ""} aria-current={contentSection === "orders" ? "page" : undefined} href="/admin/orders">
          <span className="admin-sidebar-icon" aria-hidden="true">DH</span>
          <span>Đơn hàng</span>
        </Link>
        <Link className={contentSection === "inventory" ? "active" : ""} aria-current={contentSection === "inventory" ? "page" : undefined} href="/admin/inventory">
          <span className="admin-sidebar-icon" aria-hidden="true">KHO</span>
          <span>Quản lý kho</span>
        </Link>
        <Link className={contentSection === "reviews" ? "active" : ""} aria-current={contentSection === "reviews" ? "page" : undefined} href="/admin/reviews">
          <span className="admin-sidebar-icon" aria-hidden="true">DG</span>
          <span>Đánh giá</span>
        </Link>
        <Link className={contentSection === "members" ? "active" : ""} aria-current={contentSection === "members" ? "page" : undefined} href="/admin/members">
          <span className="admin-sidebar-icon" aria-hidden="true">TV</span>
          <span>Thành viên</span>
        </Link>
        <Link className={contentSection === "promotions" ? "active" : ""} aria-current={contentSection === "promotions" ? "page" : undefined} href="/admin/promotions">
          <span className="admin-sidebar-icon" aria-hidden="true">KM</span>
          <span>Khuyến mãi</span>
        </Link>
        {!contentSection && (
          <button
            type="button"
            className={trashed ? "active" : ""}
            aria-current={trashed ? "page" : undefined}
            onClick={onTrashOpen}
          >
            <span className="admin-sidebar-icon" aria-hidden="true">TR</span>
            <span>Thùng rác</span>
          </button>
        )}
      </nav>
      <div className="admin-sidebar-footer">
        <Link href="/products">Xem cửa hàng <span aria-hidden="true">↗</span></Link>
        <Link href="/">Về trang chủ</Link>
      </div>
    </aside>
  );
}
