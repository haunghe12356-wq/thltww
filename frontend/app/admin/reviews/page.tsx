"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getApiError } from "@/lib/apiClient";
import {
  deleteProductReview,
  getAdminProductReviews,
  updateProductReviewApproval,
  type AdminProductReview,
} from "@/services/storeService";
import type { PaginationMeta } from "@/services/types";
import AdminPagination from "../_components/AdminPagination";
import AdminSidebar from "../_components/AdminSidebar";

type ReviewStatus = "pending" | "approved" | "all";

const emptyMeta: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
};

const statusLabels: Record<ReviewStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  all: "Tất cả",
};

function subscribeToToken(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredToken() {
  return window.localStorage.getItem("shop_token") ?? "";
}

function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getLocationSearch() {
  return window.location.search;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export default function AdminReviewsPage() {
  const token = useSyncExternalStore(subscribeToToken, getStoredToken, () => "");
  const search = useSyncExternalStore(subscribeToLocation, getLocationSearch, () => "");
  const requestedProductId = Number(new URLSearchParams(search).get("product_id"));
  const productId = Number.isInteger(requestedProductId) && requestedProductId > 0
    ? requestedProductId
    : undefined;
  const [reviews, setReviews] = useState<AdminProductReview[]>([]);
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);

  const loadReviews = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await getAdminProductReviews(token, {
        page,
        per_page: perPage,
        status,
        ...(productId ? { product_id: productId } : {}),
      });
      setReviews(response.data.data);
      setMeta(response.data.meta);
    } catch (loadError: unknown) {
      setError(getApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, productId, status, token]);

  useEffect(() => {
    void Promise.resolve().then(loadReviews);
  }, [loadReviews]);

  const toggleApproval = async (review: AdminProductReview) => {
    setActingId(review.id);
    setError("");
    setNotice("");
    try {
      const response = await updateProductReviewApproval(token, review.id, !review.is_approved);
      setNotice(response.data.message);
      await loadReviews();
    } catch (actionError: unknown) {
      setError(getApiError(actionError));
    } finally {
      setActingId(null);
    }
  };

  const removeReview = async (review: AdminProductReview) => {
    if (!window.confirm(`Xóa đánh giá của ${review.user.name} cho "${review.product.name}"?`)) return;
    setActingId(review.id);
    setError("");
    setNotice("");
    try {
      const response = await deleteProductReview(token, review.id);
      setNotice(response.data.message);
      if (reviews.length === 1 && page > 1) setPage((current) => current - 1);
      else await loadReviews();
    } catch (actionError: unknown) {
      setError(getApiError(actionError));
    } finally {
      setActingId(null);
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <AdminSidebar section="products" contentSection="reviews" trashed={false} onTrashOpen={() => undefined} />
        <div className="admin-workspace">
          <header className="admin-header">
            <div>
              <span className="admin-eyebrow">ĐÁNH GIÁ SẢN PHẨM</span>
              <h1>Duyệt đánh giá</h1>
              <p>Kiểm duyệt đánh giá trước khi hiển thị công khai trên cửa hàng.</p>
            </div>
            <div className="admin-header-status"><span /> Kiểm duyệt nội dung</div>
          </header>
          <div className="admin-content">
            {error && <p className="admin-notice error" role="alert">{error}</p>}
            {notice && <p className="admin-notice success" role="status">{notice}</p>}
            {!token ? (
              <section className="admin-card admin-sign-in">
                <h2>Đăng nhập để tiếp tục</h2>
                <p>Đăng nhập bằng tài khoản admin để duyệt đánh giá.</p>
                <Link href="/login">Đăng nhập</Link>
              </section>
            ) : (
              <section className="admin-card">
                <div className="admin-card-heading">
                  <div>
                    <span className="admin-eyebrow">KIỂM DUYỆT</span>
                    <h2>
                      {productId ? `Đánh giá sản phẩm #${productId}` : statusLabels[status]} ({meta.total})
                    </h2>
                  </div>
                  <div className="admin-list-actions">
                    {productId && (
                      <Link className="admin-secondary-button" href="/admin/reviews">
                        Tất cả sản phẩm
                      </Link>
                    )}
                    <label className="admin-review-filter">
                      Trạng thái
                      <select
                        value={status}
                        onChange={(event) => {
                          setStatus(event.target.value as ReviewStatus);
                          setPage(1);
                        }}
                      >
                        <option value="pending">Chờ duyệt</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="all">Tất cả</option>
                      </select>
                    </label>
                    <button type="button" className="admin-secondary-button" onClick={() => void loadReviews()} disabled={loading}>
                      Tải lại
                    </button>
                  </div>
                </div>
                {loading ? (
                  <p className="admin-empty" role="status">Đang tải đánh giá...</p>
                ) : reviews.length === 0 ? (
                  <p className="admin-empty">
                    {status === "pending" ? "Không có đánh giá nào đang chờ duyệt." : "Chưa có đánh giá nào."}
                  </p>
                ) : (
                  <>
                    <div className="admin-table-wrap">
                      <table className="admin-table admin-review-table">
                        <thead>
                          <tr><th>Sản phẩm</th><th>Người đánh giá</th><th>Đánh giá</th><th>Ngày gửi</th><th>Trạng thái</th><th>Thao tác</th></tr>
                        </thead>
                        <tbody>
                          {reviews.map((review) => (
                            <tr key={review.id}>
                              <td><strong>{review.product.name}</strong><small>#{review.product.id}</small></td>
                              <td>
                                <strong>{review.user.name}</strong>
                                <small>{review.user.email}</small>
                              </td>
                              <td>
                                <strong>{review.rating}/5 sao</strong>
                                {review.comment && <small className="admin-review-comment">{review.comment}</small>}
                              </td>
                              <td>{formatDate(review.created_at)}</td>
                              <td>{review.is_approved ? "Đã duyệt" : "Chờ duyệt"}</td>
                              <td className="admin-row-actions">
                                <button type="button" disabled={actingId === review.id} onClick={() => void toggleApproval(review)}>
                                  {actingId === review.id ? "Đang lưu..." : review.is_approved ? "Ẩn" : "Duyệt"}
                                </button>
                                <button type="button" disabled={actingId === review.id} onClick={() => void removeReview(review)}>Xóa</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <AdminPagination
                      meta={meta}
                      page={page}
                      perPage={perPage}
                      loading={loading}
                      onPageChange={setPage}
                      onPerPageChange={(value) => {
                        setPerPage(value);
                        setPage(1);
                      }}
                    />
                  </>
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
