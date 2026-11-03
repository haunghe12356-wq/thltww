"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { getApiError } from "@/lib/apiClient";
import AdminPagination from "../_components/AdminPagination";
import AdminSidebar from "../_components/AdminSidebar";
import {
  createPromotion,
  deletePromotion,
  getAdminPromotions,
  updatePromotion,
  type Promotion,
  type PromotionData,
  type PromotionStatus,
} from "@/services/promotionService";
import { getAdminProducts, type Product } from "@/services/productService";
import type { PaginationMeta } from "@/services/types";

const emptyMeta: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
};

const emptyForm: PromotionData = {
  code: "",
  discount_percent: 10,
  is_active: true,
  starts_at: null,
  ends_at: null,
  minimum_order_amount: null,
  maximum_discount_amount: null,
  usage_limit: null,
  product_ids: [],
};

function subscribeToToken(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredToken() {
  return window.localStorage.getItem("shop_token") ?? "";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIsoDateTime(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

export default function AdminPromotionsPage() {
  const token = useSyncExternalStore(subscribeToToken, getStoredToken, () => "");
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PromotionStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyPromotionId, setBusyPromotionId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PromotionData>(emptyForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) return;
    let active = true;
    const loadProducts = async () => {
      setProductsLoading(true);
      setError("");
      try {
        const firstPage = await getAdminProducts(token, { page: 1, per_page: 100 });
        const allProducts = [...firstPage.data.data];
        for (let currentPage = 2; currentPage <= firstPage.data.meta.last_page; currentPage += 1) {
          const response = await getAdminProducts(token, { page: currentPage, per_page: 100 });
          allProducts.push(...response.data.data);
        }
        if (active) {
          setProducts(allProducts);
          setProductsLoaded(true);
        }
      } catch (loadError: unknown) {
        if (active) setError(getApiError(loadError));
      } finally {
        if (active) setProductsLoading(false);
      }
    };
    void loadProducts();
    return () => {
      active = false;
    };
  }, [token]);

  const loadPromotions = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await getAdminPromotions(token, {
        page,
        per_page: perPage,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setPromotions(response.data.data);
      setMeta(response.data.meta);
    } catch (loadError: unknown) {
      setError(getApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter, token]);

  useEffect(() => {
    void Promise.resolve().then(loadPromotions);
  }, [loadPromotions]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const editPromotion = (promotion: Promotion) => {
    setForm({
      code: promotion.code,
      discount_percent: promotion.discount_percent,
      is_active: promotion.is_active,
      starts_at: formatDateTimeInput(promotion.starts_at),
      ends_at: formatDateTimeInput(promotion.ends_at),
      minimum_order_amount: promotion.minimum_order_amount === null ? null : String(promotion.minimum_order_amount),
      maximum_discount_amount: promotion.maximum_discount_amount === null ? null : String(promotion.maximum_discount_amount),
      usage_limit: promotion.usage_limit,
      product_ids: promotion.product_ids,
    });
    setEditingId(promotion.id);
    setShowForm(true);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const data: PromotionData = {
      ...form,
      code: form.code.trim().toUpperCase(),
      starts_at: toIsoDateTime(form.starts_at),
      ends_at: toIsoDateTime(form.ends_at),
      minimum_order_amount: form.minimum_order_amount === "" ? null : form.minimum_order_amount,
      maximum_discount_amount: form.maximum_discount_amount === "" ? null : form.maximum_discount_amount,
      usage_limit: form.usage_limit,
    };

    try {
      if (editingId === null) {
        await createPromotion(token, data);
        setNotice("Đã thêm mã khuyến mãi.");
      } else {
        await updatePromotion(token, editingId, data);
        setNotice("Đã cập nhật mã khuyến mãi.");
      }
      resetForm();
      await loadPromotions();
    } catch (saveError: unknown) {
      setError(getApiError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const removePromotion = async (promotion: Promotion) => {
    if (!window.confirm(`Xóa mã khuyến mãi ${promotion.code}? Mã này sẽ không dùng được cho đơn hàng mới.`)) return;
    setBusyPromotionId(promotion.id);
    setError("");
    setNotice("");
    try {
      await deletePromotion(token, promotion.id);
      setNotice(`Đã xóa mã khuyến mãi ${promotion.code}.`);
      await loadPromotions();
    } catch (deleteError: unknown) {
      setError(getApiError(deleteError));
    } finally {
      setBusyPromotionId(null);
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <AdminSidebar
          section="products"
          contentSection="promotions"
          trashed={false}
          onTrashOpen={() => undefined}
        />
        <div className="admin-workspace">
          <header className="admin-header">
            <div>
              <span className="admin-eyebrow">BÁN HÀNG</span>
              <h1>Quản lý khuyến mãi</h1>
              <p>Tạo mã giảm giá, điều chỉnh ưu đãi và quản lý trạng thái áp dụng.</p>
            </div>
            <div className="admin-header-status"><span /> Hệ thống quản lý</div>
          </header>
          <div className="admin-content">
            {error && <p className="admin-notice error" role="alert">{error}</p>}
            {notice && <p className="admin-notice success" role="status">{notice}</p>}

            {!token ? (
              <section className="admin-card admin-sign-in">
                <h2>Đăng nhập để tiếp tục</h2>
                <p>Đăng nhập bằng tài khoản admin được cấp quyền để quản lý khuyến mãi.</p>
                <Link href="/login">Đăng nhập</Link>
              </section>
            ) : (
              <>
                {showForm && (
                  <section className="admin-card">
                    <div className="admin-card-heading">
                      <div>
                        <span className="admin-eyebrow">MÃ ƯU ĐÃI</span>
                        <h2>{editingId === null ? "Thêm khuyến mãi" : "Sửa khuyến mãi"}</h2>
                      </div>
                    </div>
                    <form className="admin-form admin-promotion-form" onSubmit={handleSubmit}>
                      <label>
                        Mã khuyến mãi
                        <input
                          required
                          minLength={3}
                          maxLength={50}
                          pattern="[A-Za-z0-9_-]+"
                          value={form.code}
                          onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                          placeholder="VD: GIAM10"
                        />
                      </label>
                      <label>
                        Mức giảm (%)
                        <input
                          required
                          type="number"
                          min={1}
                          max={100}
                          step={1}
                          value={form.discount_percent}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            discount_percent: Number(event.target.value),
                          }))}
                        />
                      </label>
                      <label>
                        Bắt đầu áp dụng
                        <input
                          type="datetime-local"
                          value={form.starts_at ?? ""}
                          onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value || null }))}
                        />
                      </label>
                      <label>
                        Kết thúc áp dụng
                        <input
                          type="datetime-local"
                          value={form.ends_at ?? ""}
                          onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value || null }))}
                        />
                      </label>
                      <label>
                        Giá trị đơn tối thiểu (₫)
                        <input
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={form.minimum_order_amount ?? ""}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            minimum_order_amount: event.target.value || null,
                          }))}
                          placeholder="Không giới hạn"
                        />
                      </label>
                      <label>
                        Mức giảm tối đa (₫)
                        <input
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={form.maximum_discount_amount ?? ""}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            maximum_discount_amount: event.target.value || null,
                          }))}
                          placeholder="Không giới hạn"
                        />
                      </label>
                      <label>
                        Giới hạn lượt sử dụng
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={form.usage_limit ?? ""}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            usage_limit: event.target.value ? Number(event.target.value) : null,
                          }))}
                          placeholder="Không giới hạn"
                        />
                      </label>
                      <fieldset className="admin-promotion-products admin-form-wide">
                        <legend>Sản phẩm áp dụng (để trống: áp dụng cho toàn bộ sản phẩm)</legend>
                        {productsLoading ? (
                          <p role="status">Đang tải danh sách sản phẩm...</p>
                        ) : products.length === 0 ? (
                          <p>Chưa có sản phẩm khả dụng.</p>
                        ) : (
                          <div>
                            {products.map((product) => (
                              <label key={product.id}>
                                <input
                                  type="checkbox"
                                  checked={form.product_ids.includes(product.id)}
                                  onChange={(event) => setForm((current) => ({
                                    ...current,
                                    product_ids: event.target.checked
                                      ? [...current.product_ids, product.id]
                                      : current.product_ids.filter((id) => id !== product.id),
                                  }))}
                                />
                                {product.name}
                              </label>
                            ))}
                          </div>
                        )}
                      </fieldset>
                      <label className="admin-content-publish">
                        <input
                          type="checkbox"
                          checked={form.is_active}
                          onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                        />
                        Đang hoạt động
                      </label>
                      <div className="admin-form-actions admin-form-wide">
                        <button type="button" className="admin-secondary-button" onClick={resetForm}>Hủy</button>
                        <button type="submit" className="admin-primary-button" disabled={saving || productsLoading || !productsLoaded}>
                          {saving ? "Đang lưu..." : editingId === null ? "Thêm mã" : "Lưu thay đổi"}
                        </button>
                      </div>
                    </form>
                  </section>
                )}

                <section className="admin-card">
                  <div className="admin-card-heading">
                    <div>
                      <span className="admin-eyebrow">ƯU ĐÃI</span>
                      <h2>Danh sách khuyến mãi ({meta.total})</h2>
                    </div>
                    <div className="admin-list-actions">
                      {!showForm && (
                        <button
                          type="button"
                          className="admin-primary-button"
                          onClick={() => {
                            setForm(emptyForm);
                            setEditingId(null);
                            setShowForm(true);
                            setError("");
                            setNotice("");
                          }}
                        >
                          + Thêm khuyến mãi
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={() => void loadPromotions()}
                        disabled={loading}
                      >
                        Tải lại
                      </button>
                    </div>
                  </div>

                  <form className="admin-promotion-filters" onSubmit={handleSearch}>
                    <label>
                      Tìm mã
                      <input
                        type="search"
                        value={searchInput}
                        maxLength={255}
                        placeholder="Nhập mã khuyến mãi"
                        onChange={(event) => setSearchInput(event.target.value)}
                      />
                    </label>
                    <label>
                      Trạng thái
                      <select
                        value={statusFilter}
                        onChange={(event) => {
                          setPage(1);
                          setStatusFilter(event.target.value as PromotionStatus | "");
                        }}
                      >
                        <option value="">Tất cả</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="inactive">Đã tắt</option>
                      </select>
                    </label>
                    <button type="submit" className="admin-primary-button" disabled={loading}>Tìm kiếm</button>
                  </form>

                  {loading ? (
                    <p className="admin-empty" role="status">Đang tải khuyến mãi...</p>
                  ) : promotions.length === 0 ? (
                    <p className="admin-empty">Chưa có mã khuyến mãi phù hợp.</p>
                  ) : (
                    <>
                      <div className="admin-table-wrap">
                        <table className="admin-table admin-promotions-table">
                          <thead>
                            <tr><th>Mã</th><th>Mức giảm</th><th>Điều kiện</th><th>Thời hạn</th><th>Lượt dùng</th><th>Trạng thái</th><th>Thao tác</th></tr>
                          </thead>
                          <tbody>
                            {promotions.map((promotion) => (
                              <tr key={promotion.id}>
                                <td><strong>{promotion.code}</strong></td>
                                <td>{promotion.discount_percent}%</td>
                                <td>
                                  {promotion.minimum_order_amount !== null && <div>Đơn tối thiểu: {formatPrice(Number(promotion.minimum_order_amount))}</div>}
                                  {promotion.maximum_discount_amount !== null && <div>Giảm tối đa: {formatPrice(Number(promotion.maximum_discount_amount))}</div>}
                                  {promotion.product_ids.length > 0 && <div>{promotion.product_ids.length} sản phẩm</div>}
                                  {promotion.minimum_order_amount === null && promotion.maximum_discount_amount === null && promotion.product_ids.length === 0 && <span>Không giới hạn</span>}
                                </td>
                                <td>
                                  <div>{promotion.starts_at ? formatDate(promotion.starts_at) : "Không giới hạn bắt đầu"}</div>
                                  <div>{promotion.ends_at ? `Đến ${formatDate(promotion.ends_at)}` : "Không giới hạn kết thúc"}</div>
                                </td>
                                <td>{promotion.used_count}{promotion.usage_limit === null ? " / ∞" : ` / ${promotion.usage_limit}`}</td>
                                <td>
                                  <span className={`admin-member-status ${promotion.is_active ? "active" : "locked"}`}>
                                    {promotion.is_active ? "Đang hoạt động" : "Đã tắt"}
                                  </span>
                                </td>
                                <td className="admin-row-actions admin-promotion-actions">
                                  <button type="button" onClick={() => editPromotion(promotion)}>Sửa</button>
                                  <button
                                    type="button"
                                    className="admin-member-delete-action"
                                    disabled={busyPromotionId !== null}
                                    onClick={() => void removePromotion(promotion)}
                                  >
                                    {busyPromotionId === promotion.id ? "Đang xóa..." : "Xóa"}
                                  </button>
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
                          setPage(1);
                          setPerPage(value);
                        }}
                      />
                    </>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
