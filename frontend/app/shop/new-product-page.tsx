"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getApiError } from "@/lib/apiClient";
import { getCategories, type Category } from "@/services/categoryService";
import { createProduct } from "@/services/productService";

export default function NewProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryError, setCategoryError] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [image, setImage] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadCategories = async () => {
      try {
        const response = await getCategories();
        const payload = response.data;
        const data = Array.isArray(payload) ? payload : payload.data;
        const categoryList: Category[] = Array.isArray(data) ? data : [];
        if (!isCurrent) return;
        setCategories(categoryList);
        if (categoryList[0]) setCategoryId(String(categoryList[0].id));
      } catch (error) {
        if (!isCurrent) return;
        setCategoryError(`${getApiError(error)} Kiểm tra backend Laravel đang chạy rồi tải lại trang.`);
      } finally {
        if (isCurrent) setCategoryLoading(false);
      }
    };

    void loadCategories();

    return () => {
      isCurrent = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("shop_token") : null;

      if (!token) {
        throw new Error("Bạn cần đăng nhập trước khi thêm sản phẩm.");
      }

      await createProduct({
        name,
        description,
        price: Number(price),
        stock: Number(stock),
        category_id: categoryId ? Number(categoryId) : null,
        image,
      }, token);

      setMessage("Thêm sản phẩm thành công!");
      setIsError(false);
      setName("");
      setDescription("");
      setPrice("0");
      setStock("0");
      setImage("");
    } catch (error) {
      setMessage(getApiError(error));
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page create-product-page">
      <header className="login-header">
        <Link href="/" className="login-brand">
          <span className="login-brand-mark">V</span>
          <span>thegioididongthongminh</span>
        </Link>
        <nav className="create-product-nav" aria-label="Điều hướng">
          <Link href="/">Trang chủ</Link>
          <Link href="/products">Sản phẩm</Link>
          <Link href="/login">Đăng nhập</Link>
        </nav>
      </header>

      <div className="create-product-main">
        <div className="create-product-heading">
          <span className="login-overline">QUẢN LÝ CỬA HÀNG</span>
          <h1>Thêm sản phẩm mới</h1>
          <p>Điền thông tin sản phẩm để giới thiệu đến khách hàng của VietNghe Shop.</p>
        </div>

        <div className="create-product-card">
          <div className="create-product-card-heading">
            <span className="create-product-icon" aria-hidden="true">＋</span>
            <div>
              <h2>Thông tin sản phẩm</h2>
              <p>Các mục có dấu * là bắt buộc</p>
            </div>
          </div>

          {categoryError && (
            <div className="create-product-notice error" role="alert">
              {categoryError}
            </div>
          )}

          <form className="create-product-form" onSubmit={handleSubmit}>
            <div className="create-product-field full">
              <label htmlFor="name">Tên sản phẩm <span>*</span></label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                id="name"
                placeholder="Ví dụ: Tai nghe không dây"
                maxLength={150}
                required
              />
            </div>

            <div className="create-product-field full">
              <label htmlFor="description">Mô tả sản phẩm</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                id="description"
                placeholder="Mô tả đặc điểm nổi bật của sản phẩm..."
                rows={4}
              />
            </div>

            <div className="create-product-field">
              <label htmlFor="price">Giá bán (₫) <span>*</span></label>
              <input
                type="number"
                min="0"
                step="1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                id="price"
                placeholder="0"
                required
              />
            </div>

            <div className="create-product-field">
              <label htmlFor="stock">Số lượng tồn kho</label>
              <input
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                id="stock"
                placeholder="0"
              />
            </div>

            <div className="create-product-field">
              <label htmlFor="category">Danh mục</label>
              <select
                id="category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                disabled={categoryLoading || categories.length === 0}
              >
                <option value="">
                  {categoryLoading ? "Đang tải danh mục..." : "Chọn danh mục"}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>

            <div className="create-product-field">
              <label htmlFor="image">Đường dẫn ảnh</label>
              <input
                type="url"
                value={image}
                onChange={(event) => setImage(event.target.value)}
                id="image"
                placeholder="https://example.com/product.jpg"
              />
            </div>

            <div className="create-product-actions full">
              <Link href="/products" className="create-product-cancel">Hủy</Link>
              <button type="submit" className="login-submit" disabled={loading}>
                {loading ? "Đang thêm sản phẩm..." : "Thêm sản phẩm"}
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </form>

          {message ? (
            <div className={`create-product-notice ${isError ? "error" : "success"}`} role="status">
              <span>{message}</span>
              {isError && message.includes("đăng nhập") && (
                <Link href="/login">Đăng nhập ngay</Link>
              )}
              {!isError && <Link href="/products">Xem danh sách sản phẩm</Link>}
            </div>
          ) : null}

          <p className="create-product-auth-hint">
            Cần đăng nhập để lưu sản phẩm. <Link href="/login">Đăng nhập tài khoản</Link>
          </p>
        </div>
      </div>

      <footer className="login-footer">
        <span>© 2026 VietNghe Shop</span>
        <span>Công nghệ cho mọi nhà</span>
      </footer>
    </main>
  );
}
