import type { PaginationMeta } from "@/services/types";
import { getVisiblePages } from "../_utils";

type AdminPaginationProps = {
  meta: PaginationMeta;
  page: number;
  perPage: number;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

export default function AdminPagination({
  meta,
  page,
  perPage,
  loading,
  onPageChange,
  onPerPageChange,
}: AdminPaginationProps) {
  return (
    <div className="admin-pagination">
      <label className="admin-page-size">
        Hiển thị
        <select value={perPage} onChange={(event) => onPerPageChange(Number(event.target.value))}>
          {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        / trang
      </label>
      <span className="admin-page-summary">
        {meta.total === 0 ? 0 : (meta.current_page - 1) * meta.per_page + 1}–{Math.min(meta.current_page * meta.per_page, meta.total)} / {meta.total} mục
      </span>
      <div className="admin-page-controls" aria-label="Phân trang">
        <button
          type="button"
          className="admin-page-arrow"
          aria-label="Trang trước"
          disabled={loading || meta.total === 0 || page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          ←
        </button>
        {getVisiblePages(meta.current_page, meta.last_page).map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={pageNumber === meta.current_page ? "current" : ""}
            aria-label={`Trang ${pageNumber}`}
            aria-current={pageNumber === meta.current_page ? "page" : undefined}
            disabled={loading || meta.total === 0 || meta.last_page <= 1}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          className="admin-page-arrow"
          aria-label="Trang sau"
          disabled={loading || meta.total === 0 || page >= meta.last_page}
          onClick={() => onPageChange(Math.min(meta.last_page, page + 1))}
        >
          →
        </button>
      </div>
    </div>
  );
}
