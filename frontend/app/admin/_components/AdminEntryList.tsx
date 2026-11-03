import Link from "next/link";
import type { Entry, EntryAction, Section } from "../_types";
import { sectionNames } from "../_types";
import { formatPrice, isProduct } from "../_utils";
import AdminPagination from "./AdminPagination";
import type { PaginationMeta } from "@/services/types";

type AdminEntryListProps = {
  section: Section;
  entries: Entry[];
  meta: PaginationMeta;
  page: number;
  perPage: number;
  loading: boolean;
  trashed: boolean;
  showProductForm: boolean;
  onAddProduct: () => void;
  onOpenTrash: () => void;
  onReload: () => void;
  onEdit: (entry: Entry) => void;
  onAction: (entry: Entry, action: EntryAction) => void;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

export default function AdminEntryList({
  section,
  entries,
  meta,
  page,
  perPage,
  loading,
  trashed,
  showProductForm,
  onAddProduct,
  onOpenTrash,
  onReload,
  onEdit,
  onAction,
  onPageChange,
  onPerPageChange,
}: AdminEntryListProps) {
  return (
    <section className="admin-card">
      <div className="admin-card-heading">
        <div>
          <span className="admin-eyebrow">{trashed ? "ĐÃ XÓA" : "DANH SÁCH"}</span>
          <h2>{trashed ? `Thùng rác ${sectionNames[section].toLocaleLowerCase("vi")}` : `Danh sách ${sectionNames[section].toLocaleLowerCase("vi")}`} ({meta.total})</h2>
        </div>
        <div className="admin-list-actions">
          {!trashed && section === "products" && !showProductForm && (
            <button type="button" className="admin-primary-button" onClick={onAddProduct}>
              + Thêm sản phẩm
            </button>
          )}
          {!trashed && (
            <button type="button" className="admin-secondary-button" onClick={onOpenTrash}>
              Thùng rác
            </button>
          )}
          <button type="button" className="admin-secondary-button" onClick={onReload} disabled={loading}>
            Tải lại
          </button>
        </div>
      </div>

      {loading ? (
        <p className="admin-empty">Đang tải dữ liệu...</p>
      ) : entries.length === 0 ? (
        <p className="admin-empty">{trashed ? "Thùng rác đang trống." : `Chưa có ${sectionNames[section].toLocaleLowerCase("vi")} nào.`}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{section === "products" ? "Sản phẩm" : "Tên"}</th>
                {section === "products" ? (
                  <>
                    <th>Danh mục</th><th>Thương hiệu</th><th>Giá</th><th>Tồn kho</th>
                  </>
                ) : (
                  <>
                    <th>Slug</th><th>Số sản phẩm</th><th>Trạng thái</th>
                  </>
                )}
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <strong>{entry.name}</strong>
                    {entry.description && <small>{entry.description}</small>}
                    {trashed && entry.deleted_at && <small>Đã xóa: {new Date(entry.deleted_at).toLocaleString("vi-VN")}</small>}
                  </td>
                  {isProduct(entry) ? (
                    <>
                      <td>{entry.category?.name ?? "—"}</td>
                      <td>{entry.brand?.name ?? "—"}</td>
                      <td>
                        {entry.discount_percent ? (
                          <>
                            <strong>{formatPrice(Number(entry.price) * (100 - entry.discount_percent) / 100)}</strong>
                            <small><s>{formatPrice(entry.price)}</s> · giảm {entry.discount_percent}%</small>
                          </>
                        ) : formatPrice(entry.price)}
                      </td>
                      <td>{entry.stock}</td>
                    </>
                  ) : (
                    <>
                      <td>{entry.slug}</td>
                      <td>{entry.products_count}</td>
                      <td>{entry.status === 1 ? "Đang hiển thị" : "Đang ẩn"}</td>
                    </>
                  )}
                  <td className="admin-row-actions">
                    {trashed ? (
                      <>
                        <button type="button" onClick={() => onAction(entry, "restore")}>Khôi phục</button>
                        <button type="button" onClick={() => onAction(entry, "force")}>Xóa vĩnh viễn</button>
                      </>
                    ) : (
                      <>
                        {isProduct(entry) && (
                          <Link href={`/admin/reviews?product_id=${entry.id}`}>Đánh giá</Link>
                        )}
                        <button type="button" onClick={() => onEdit(entry)}>Sửa</button>
                        <button type="button" onClick={() => onAction(entry, "delete")}>Xóa</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination
        meta={meta}
        page={page}
        perPage={perPage}
        loading={loading}
        onPageChange={onPageChange}
        onPerPageChange={onPerPageChange}
      />
    </section>
  );
}
