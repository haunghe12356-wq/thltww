"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { getApiError } from "@/lib/apiClient";
import { getCategories, type Category } from "@/services/categoryService";
import { getBrands, type Brand } from "@/services/brandService";
import { getProductPrice, getProducts, type Product } from "@/services/productService";
import { addToCart } from "@/services/cartService";
import { CartBadge, ShopNavigation } from "./ShopNavigation";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80";

const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

async function fetchCatalogData(params: {
  page: number;
  per_page: number;
  brand_id?: number;
  category_id?: number;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  search?: string;
}) {
  const [categoriesResponse, productsResponse, brandsResponse] = await Promise.all([
    getCategories(),
    getProducts(params),
    getBrands(),
  ]);

  const categoryPayload = categoriesResponse.data;
  const productPayload = productsResponse.data;

  const categories = Array.isArray(categoryPayload)
    ? categoryPayload
    : categoryPayload.data ?? [];

  return {
    categories,
    products: productPayload.data,
    brands: brandsResponse.data.data,
    meta: productPayload.meta,
  };
}

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Pick<Brand, "id" | "name" | "slug" | "logo">[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("0");
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const applyData = (data: Awaited<ReturnType<typeof fetchCatalogData>>) => {
    setCategories(data.categories);
    setBrands(data.brands);
    setProducts(data.products);
    setTotalProducts(data.meta.total);
    setTotalPages(data.meta.last_page);
    setError("");
  };

  const loadData = useCallback(async () => {
    const currentRequest = ++requestId.current;
    try {
      setLoading(true);
      const data = await fetchCatalogData({
        page,
        per_page: 4,
        ...(selectedCategory === "all" ? {} : { category_id: selectedCategory }),
        ...(selectedBrand === "all" ? {} : { brand_id: Number(selectedBrand) }),
        ...(minPrice ? { min_price: Number(minPrice) } : {}),
        ...(maxPrice ? { max_price: Number(maxPrice) } : {}),
        ...(minRating === "0" ? {} : { min_rating: Number(minRating) }),
        ...(query.trim() ? { search: query.trim() } : {}),
      });
      if (currentRequest === requestId.current) applyData(data);
    } catch (loadError) {
      if (currentRequest === requestId.current) setError(getApiError(loadError));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [page, selectedCategory, selectedBrand, minPrice, maxPrice, minRating, query]);

  useEffect(() => {
    let isCurrent = true;

    const timeout = window.setTimeout(() => {
      if (isCurrent) void loadData();
    }, query ? 250 : 0);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeout);
    };
  }, [loadData, query]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextQuery = query.trim();
    router.push(`/products${nextQuery ? `?search=${encodeURIComponent(nextQuery)}` : ""}`);
  };

  const hasActiveFilters =
    selectedCategory !== "all" ||
    selectedBrand !== "all" ||
    Boolean(minPrice || maxPrice || query.trim()) ||
    minRating !== "0";

  const clearFilters = () => {
    setQuery("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setMinPrice("");
    setMaxPrice("");
    setMinRating("0");
    setPage(1);
  };

  return (
    <div className="shop-page">
      <header className="site-header">
        <div className="wrap topbar">
          <Link href="/" className="logo">thegioididongthongminh</Link>

          <form className="search-box" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Tìm kiếm sản phẩm..."
              aria-label="Tìm kiếm sản phẩm"
            />
            <button type="submit">Tìm</button>
          </form>

          <div className="contact-info">Liên hệ: <strong>0936.148.348</strong></div>
          <div className="email-box">cskhthegioididongthongminh@gmail.com</div>
          <CartBadge />
        </div>

        <ShopNavigation active="products" />
      </header>

      <main className="wrap page-content products-page-content">
        <section className="products-hero" aria-labelledby="products-hero-title">
          <div className="products-hero-copy">
            <div className="products-breadcrumb"><Link href="/">Trang chủ</Link><span>/</span><span>Sản phẩm</span></div>
            <span className="products-hero-eyebrow"><i /> GIAN HÀNG VIETNGHE</span>
            <h1 id="products-hero-title">Công nghệ tốt,<br /><span>chọn theo cách của bạn.</span></h1>
            <p>Khám phá sản phẩm phù hợp với nhu cầu và ngân sách của bạn.</p>
            <a className="products-hero-cta" href="#catalog-title">Khám phá sản phẩm <span aria-hidden="true">↓</span></a>
          </div>
          <div className="products-hero-art" aria-hidden="true">
            <div className="products-hero-orbit products-hero-orbit-one" />
            <div className="products-hero-orbit products-hero-orbit-two" />
            <div className="products-hero-device"><span /></div>
            <div className="products-hero-tag">VIETNGHE <b>✦</b></div>
          </div>
          <div className="products-hero-note">
            <span>⌖</span>
            <div><small>Ghé thăm cửa hàng</small><strong>Gia Lâm, Hà Nội</strong></div>
          </div>
        </section>

        <section className="catalog-section" aria-labelledby="catalog-title">
          <div className="catalog-section-heading">
            <div>
              <span className="catalog-kicker">TÌM MÓN ĐỒ ƯNG Ý</span>
              <h2 id="catalog-title">Sản phẩm nổi bật</h2>
            </div>
            <span className="catalog-result-count">{loading ? "Đang tải..." : `${totalProducts} sản phẩm`}</span>
          </div>

          <div className="catalog-category-row" aria-label="Lọc theo danh mục">
            <button
              type="button"
              className={`catalog-category-chip ${selectedCategory === "all" ? "active" : ""}`}
              onClick={() => { setSelectedCategory("all"); setPage(1); }}
            >
              Tất cả
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`catalog-category-chip ${selectedCategory === category.id ? "active" : ""}`}
                onClick={() => { setSelectedCategory(category.id); setPage(1); }}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="catalog-filter-panel">
            <div className="catalog-filter-heading">
              <div><span className="catalog-filter-symbol">☷</span><strong>Lọc sản phẩm</strong></div>
              {hasActiveFilters && <button type="button" onClick={clearFilters}>Xóa bộ lọc</button>}
            </div>
            <div className="catalog-filters" aria-label="Bộ lọc sản phẩm">
              <label>
                Giá tối thiểu
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(event) => {
                    const nextMinPrice = event.target.value;
                    setMinPrice(nextMinPrice);
                    if (maxPrice && nextMinPrice && Number(nextMinPrice) > Number(maxPrice)) setMaxPrice("");
                    setPage(1);
                  }}
                  placeholder="0 ₫"
                />
              </label>
              <label>
                Thương hiệu
                <select value={selectedBrand} onChange={(event) => { setSelectedBrand(event.target.value); setPage(1); }}>
                  <option value="all">Tất cả thương hiệu</option>
                  {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </select>
              </label>
              <label>
                Giá tối đa
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(event) => {
                    const nextMaxPrice = event.target.value;
                    setMaxPrice(nextMaxPrice);
                    if (minPrice && nextMaxPrice && Number(nextMaxPrice) < Number(minPrice)) setMinPrice("");
                    setPage(1);
                  }}
                  placeholder="Không giới hạn"
                />
              </label>
              <label>
                Đánh giá tối thiểu
                <select value={minRating} onChange={(event) => { setMinRating(event.target.value); setPage(1); }}>
                  <option value="0">Tất cả đánh giá</option>
                  <option value="4">Từ 4 sao</option>
                  <option value="3">Từ 3 sao</option>
                  <option value="2">Từ 2 sao</option>
                  <option value="1">Từ 1 sao</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="catalog-product-grid" aria-label="Đang tải sản phẩm">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="catalog-skeleton-card" key={index}>
                  <div className="catalog-skeleton-image" />
                  <div className="catalog-skeleton-line" />
                  <div className="catalog-skeleton-line short" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="catalog-state-card" role="alert">
              <h2>Chưa kết nối được với cửa hàng</h2>
              <p>{error}</p>
              <button
                type="button"
                className="catalog-retry-button"
                onClick={() => {
                  setLoading(true);
                  void loadData();
                }}
              >
                Thử kết nối lại
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="catalog-state-card">
              {totalProducts === 0 && !query && selectedBrand === "all" && selectedCategory === "all" && !minPrice && !maxPrice && minRating === "0" ? (
                <>
                  <h2>Cửa hàng chưa có sản phẩm</h2>
                  <p>Backend đã kết nối, nhưng cơ sở dữ liệu hiện chưa có sản phẩm nào.</p>
                  <Link href="/admin" className="catalog-retry-button">
                    Mở quản trị
                  </Link>
                </>
              ) : (
                <>
                  <h2>Chưa tìm thấy sản phẩm phù hợp</h2>
                  <p>Thử từ khóa, thương hiệu, khoảng giá hoặc mức đánh giá khác nhé.</p>
                  <button
                    type="button"
                    className="catalog-retry-button"
                    onClick={() => {
                      clearFilters();
                    }}
                  >
                    Xem tất cả sản phẩm
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="catalog-product-grid">
              {products.map((product) => (
                <article key={product.id} className="catalog-product-card">
                  <Link href={`/products/${product.id}`} className="catalog-product-link">
                    <div className="catalog-product-image">
                      <Image
                        src={product.image || FALLBACK_IMAGE}
                        alt={product.name}
                        width={900}
                        height={720}
                        unoptimized
                      />
                    </div>
                    <div className="catalog-product-info">
                      <span className="catalog-product-category">
                        {product.category?.name || "Sản phẩm"}
                      </span>
                      <h2>{product.name}</h2>
                      {product.description && <p>{product.description}</p>}
                      <span className="catalog-product-rating" aria-label={`Đánh giá ${Number(product.rating ?? 0).toFixed(1)} trên 5 sao`}>
                        {"★".repeat(Math.round(Number(product.rating ?? 0)))}{"☆".repeat(5 - Math.round(Number(product.rating ?? 0)))}
                        <small>{product.reviews_count ? ` (${product.reviews_count})` : " Chưa có đánh giá"}</small>
                      </span>
                      <div className="catalog-product-bottom">
                        <span className="catalog-product-prices">
                          <span className="catalog-product-price">{formatPrice(getProductPrice(product))}</span>
                          {Number(product.discount_percent ?? 0) > 0 && (
                            <del className="catalog-product-original-price">{formatPrice(Number(product.price))}</del>
                          )}
                        </span>
                        <span className={`catalog-stock ${product.stock > 0 ? "" : "out-of-stock"}`}>
                          <i />
                          {product.stock > 0 ? "Còn hàng" : "Hết hàng"}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <button
                    type="button"
                    className="catalog-add-cart"
                    disabled={product.stock < 1}
                    onClick={() => addToCart(product)}
                  >
                    {product.stock > 0 ? "Thêm vào giỏ" : "Hết hàng"}
                  </button>
                  <button
                    type="button"
                    className="catalog-add-cart"
                    disabled={product.stock < 1}
                    onClick={() => {
                      addToCart(product);
                      router.push("/cart");
                    }}
                  >
                    Mua ngay
                  </button>
                </article>
              ))}
            </div>
          )}
          {!loading && !error && totalProducts > 0 && (
            <nav className="catalog-pagination" aria-label="Phân trang sản phẩm">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button>
              <span>Trang {page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau</button>
            </nav>
          )}
        </section>

      </main>

      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div>
            <h5>Thông tin</h5>
            <Link href="/">Giới thiệu</Link>
            <Link href="/articles">Bài viết</Link>
            <Link href="/">Tuyển dụng</Link>
          </div>
          <div>
            <h5>Chính sách mua hàng</h5>
            <Link href="/">Gói bảo hành vàng</Link>
            <Link href="/">Chính sách đổi trả</Link>
          </div>
          <div>
            <h5>Hỗ trợ khách hàng</h5>
            <Link href="/contact">Liên hệ và chi nhánh</Link>
            <Link href="/">Hướng dẫn mua trả góp</Link>
          </div>
          <div className="footer-box">
            <div className="logo footer-logo">thegioididongthongminh</div>
            <p>Hãy là người đầu tiên trong số bạn bè của bạn thích nội dung này</p>
          </div>
        </div>
        <div className="copy-right">© 2019 shopvietnghe24.com</div>
      </footer>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="muted">Đang tải sản phẩm...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
