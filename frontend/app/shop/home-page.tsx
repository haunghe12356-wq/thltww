"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { getApiError } from "@/lib/apiClient";
import { getCategories, type Category } from "@/services/categoryService";
import { getProductPrice, getProducts, type Product } from "@/services/productService";
import { CartBadge, ShopNavigation } from "./ShopNavigation";
import { addToCart } from "@/services/cartService";
import { getArticles, type Article } from "@/services/articleService";

const formatPrice = (value: number | string) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));

function HomeProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const discount = Number(product.discount_percent ?? 0);

  return (
    <article className="home-product-card" key={product.id}>
      <Link href={`/products/${product.id}`} className="home-product-link">
        <div className="home-product-image">
          <Image
            src={product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80"}
            alt={product.name}
            width={900}
            height={760}
            unoptimized
          />
          <span className={`home-product-badge${discount ? " discount" : ""}`}>
            {discount ? `GIẢM ${discount}%` : product.stock > 0 ? "SẴN SÀNG" : "HẾT HÀNG"}
          </span>
        </div>
        <div className="home-product-info">
          <span>{product.brand?.name || product.category?.name || "VIETNGHE SHOP"}</span>
          <h3>{product.name}</h3>
          <div className="home-product-rating">
            <b>{"★".repeat(Math.round(Number(product.rating ?? 0)))}{"☆".repeat(5 - Math.round(Number(product.rating ?? 0)))}</b>
            <small>{product.reviews_count ? `(${product.reviews_count})` : "Chưa có đánh giá"}</small>
          </div>
          <div className="home-product-prices">
            <strong>{formatPrice(getProductPrice(product))}</strong>
            {discount > 0 && <del>{formatPrice(product.price)}</del>}
          </div>
        </div>
      </Link>
      <button type="button" disabled={product.stock < 1} onClick={() => addToCart(product)}>
        {product.stock > 0 ? "+ Thêm vào giỏ" : "Tạm hết hàng"}
      </button>
      <button
        type="button"
        disabled={product.stock < 1}
        onClick={() => {
          addToCart(product);
          router.push("/cart");
        }}
      >
        Mua ngay
      </button>
    </article>
  );
}

function HomeProductSection({
  id,
  eyebrow,
  title,
  products,
  loading,
  error,
  emptyMessage,
}: {
  id: string;
  eyebrow: string;
  title: string;
  products: Product[];
  loading: boolean;
  error: string;
  emptyMessage: string;
}) {
  return (
    <section
      className={`home-featured home-product-section${id === "home-promotions" ? " promotion" : ""}`}
      aria-labelledby={`${id}-title`}
    >
      <div className="home-section-heading">
        <div><span className="home-eyebrow">{eyebrow}</span><h2 id={`${id}-title`}>{title}</h2></div>
        <Link href="/products">Xem tất cả <span>→</span></Link>
      </div>
      {loading ? (
        <div className="home-product-grid">
          {Array.from({ length: 4 }, (_, index) => <div className="home-product-skeleton" key={index} />)}
        </div>
      ) : error ? (
        <div className="home-empty-state" role="alert"><p>{error}</p></div>
      ) : products.length === 0 ? (
        <div className="home-empty-state"><p>{emptyMessage}</p></div>
      ) : (
        <div className="home-product-grid">
          {products.map((product) => <HomeProductCard key={product.id} product={product} />)}
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesError, setArticlesError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [categoriesResponse, productsResponse] = await Promise.all([
          getCategories(),
          getProducts({ per_page: 100 }),
        ]);

        const categoriesData = categoriesResponse.data;
        setCategories(Array.isArray(categoriesData) ? categoriesData : categoriesData.data ?? []);
        setProducts(productsResponse.data.data);
      } catch (loadError) {
        setError(getApiError(loadError));
      } finally {
        setLoading(false);
      }
    };

    loadData();
    getArticles()
      .then((response) => setArticles(response.data.data))
      .catch((loadError: unknown) => setArticlesError(getApiError(loadError)));
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const categoryMatches =
        selectedCategory === "all" || product.category?.id === selectedCategory;
      const searchMatches =
        !term ||
        product.name.toLowerCase().includes(term) ||
        (product.description ?? "").toLowerCase().includes(term);

      return categoryMatches && searchMatches;
    });
  }, [products, search, selectedCategory]);

  const newProducts = useMemo(() => products.slice(0, 4), [products]);
  const promotionProducts = useMemo(
    () => products
      .filter((product) => Number(product.discount_percent ?? 0) > 0)
      .sort((a, b) => Number(b.discount_percent ?? 0) - Number(a.discount_percent ?? 0))
      .slice(0, 4),
    [products],
  );
  const hotProducts = useMemo(
    () => products
      .filter((product) => product.stock > 0)
      .sort((a, b) =>
        Number(b.rating ?? 0) - Number(a.rating ?? 0) ||
        Number(b.reviews_count ?? 0) - Number(a.reviews_count ?? 0) ||
        Number(a.price) - Number(b.price),
      )
      .slice(0, 4),
    [products],
  );

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    router.push(`/products${query ? `?search=${encodeURIComponent(query)}` : ""}`);
  };

  return (
    <div className="shop-page home-shop-page">
      <header className="site-header">
        <div className="wrap topbar">
          <Link href="/" className="logo">VIETNGHE <span>SHOP</span></Link>

          <form className="search-box" onSubmit={handleSearchSubmit}>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm sản phẩm bạn cần..."
              aria-label="Tìm kiếm sản phẩm"
            />
            <button type="submit">Tìm</button>
          </form>

          <div className="contact-info">
            Liên hệ: <strong>0936.148.348</strong>
          </div>
          <div className="email-box">cskhthegioididongthongminh@gmail.com</div>
          <CartBadge />
        </div>

        <ShopNavigation active="home" />
      </header>

      <main className="home-content">
        <section className="home-hero">
          <div className="home-hero-inner">
            <div className="home-hero-copy">
              <span className="home-eyebrow"><i /> VIETNGHE SHOP · MUA SẮM AN TÂM</span>
              <h1>Công nghệ tốt,<br /><span>giá thật chất.</span></h1>
              <p>Khám phá sản phẩm bạn yêu thích, chọn nhanh món phù hợp và để VietNghe đồng hành trên từng trải nghiệm.</p>
              <div className="home-hero-actions">
                <Link href="/products" className="home-primary-link">Khám phá sản phẩm <span>↗</span></Link>
                <Link href="/articles" className="home-text-link">Góc tư vấn <span>→</span></Link>
              </div>
              <div className="home-hero-proof">
                <span><b>✓</b> Tư vấn tận tâm</span>
                <span><b>✓</b> Đặt hàng dễ dàng</span>
              </div>
            </div>
            <div className="home-hero-visual" aria-label="Sản phẩm công nghệ nổi bật">
              <div className="home-hero-orbit orbit-one" />
              <div className="home-hero-orbit orbit-two" />
              <div className="home-hero-product">
                <Image
                  src={products[0]?.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80"}
                  alt={products[0]?.name || "Sản phẩm VietNghe"}
                  width={760}
                  height={680}
                  priority
                  unoptimized
                />
              </div>
              <div className="home-floating-note"><span>✦</span><div><b>Chọn điều bạn cần</b><small>Khám phá ngay hôm nay</small></div></div>
              <div className="home-floating-sticker">V<br /><small>SHOP</small></div>
            </div>
          </div>
        </section>

        <div className="home-container">
          <div className="home-location">
            <span className="home-location-icon">⌖</span>
            <span><small>Ghé thăm cửa hàng</small><strong>68 Trung Dương · Kiêu Kỵ · Gia Lâm · Hà Nội</strong></span>
            <Link href="/contact">Xem bản đồ <b>↗</b></Link>
          </div>

          <section className="home-categories" aria-labelledby="home-categories-title">
            <div className="home-section-heading">
              <div><span className="home-eyebrow">TÌM THEO NHU CẦU</span><h2 id="home-categories-title">Danh mục nổi bật</h2></div>
              <Link href="/products">Tất cả sản phẩm <span>→</span></Link>
            </div>
            <div className="home-category-list">
              {categories.slice(0, 6).map((category, index) => (
                <button
                  type="button"
                  key={category.id}
                  className={`home-category-card category-tone-${index % 4}`}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    document.getElementById("home-featured-products")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <span className="home-category-symbol" aria-hidden="true">{["✦", "◈", "⌁", "✳"][index % 4]}</span>
                  <strong>{category.name}</strong>
                  <small>Khám phá ngay <span>↗</span></small>
                </button>
              ))}
              {categories.length === 0 && !loading && (
                <Link href="/products" className="home-category-card category-tone-0">
                  <span className="home-category-symbol" aria-hidden="true">✦</span>
                  <strong>Xem sản phẩm</strong>
                  <small>Khám phá ngay <span>↗</span></small>
                </Link>
              )}
            </div>
          </section>

          <HomeProductSection
            id="home-new-products"
            eyebrow="VỪA CẬP BẾN"
            title="Sản phẩm mới"
            products={newProducts}
            loading={loading}
            error={error}
            emptyMessage="Sản phẩm mới sẽ sớm được cập nhật."
          />
          <HomeProductSection
            id="home-promotions"
            eyebrow="ƯU ĐÃI CÓ THẬT"
            title="Sản phẩm khuyến mãi"
            products={promotionProducts}
            loading={loading}
            error={error}
            emptyMessage="Hiện chưa có sản phẩm khuyến mãi. Hãy thêm mức giảm trong trang quản trị sản phẩm."
          />
          <HomeProductSection
            id="home-hot-products"
            eyebrow="ĐƯỢC YÊU THÍCH"
            title="Sản phẩm hot"
            products={hotProducts}
            loading={loading}
            error={error}
            emptyMessage="Chưa có sản phẩm nổi bật."
          />

          <section className="home-featured" id="home-featured-products" aria-labelledby="home-featured-title">
            <div className="home-section-heading">
              <div><span className="home-eyebrow">ĐƯỢC LỰA CHỌN CHO BẠN</span><h2 id="home-featured-title">Sản phẩm nổi bật</h2></div>
              <Link href="/products">Xem tất cả <span>→</span></Link>
            </div>
            <div className="home-category-tabs" aria-label="Lọc theo danh mục sản phẩm">
              <button type="button" className={selectedCategory === "all" ? "active" : ""} onClick={() => setSelectedCategory("all")}>Tất cả</button>
              {categories.map((category) => (
                <button key={category.id} type="button" className={selectedCategory === category.id ? "active" : ""} onClick={() => setSelectedCategory(category.id)}>{category.name}</button>
              ))}
            </div>

            {loading ? (
              <div className="home-product-grid">
                {Array.from({ length: 4 }, (_, index) => <div className="home-product-skeleton" key={index} />)}
              </div>
            ) : error ? (
              <div className="home-empty-state" role="alert"><strong>Chưa tải được sản phẩm</strong><p>{error}</p><Link href="/products">Thử xem danh sách sản phẩm →</Link></div>
            ) : filteredProducts.length === 0 ? (
              <div className="home-empty-state"><strong>Chưa có sản phẩm trong danh mục này</strong><p>Hãy chọn danh mục khác hoặc xem toàn bộ cửa hàng.</p><button type="button" onClick={() => setSelectedCategory("all")}>Xem tất cả sản phẩm</button></div>
            ) : (
              <div className="home-product-grid">
                {filteredProducts.slice(0, 8).map((product) => (
                  <HomeProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </section>

          <section className="home-benefits" aria-label="Lý do chọn VietNghe">
            <div><span>✦</span><p><b>Tư vấn tận tâm</b><small>Hỗ trợ chọn sản phẩm phù hợp</small></p></div>
            <div><span>✓</span><p><b>Thông tin minh bạch</b><small>Giá và tình trạng rõ ràng</small></p></div>
            <div><span>⌖</span><p><b>Cửa hàng gần bạn</b><small>Ghé thăm tại Gia Lâm, Hà Nội</small></p></div>
          </section>

          <section className="home-journal">
            <div className="home-section-heading">
              <div><span className="home-eyebrow">GÓC CHIA SẺ</span><h2>Mẹo hay từ VietNghe</h2></div>
              <Link href="/articles">Xem tất cả bài viết <span>→</span></Link>
            </div>
            {articlesError ? (
              <div className="home-empty-state" role="alert"><p>{articlesError}</p></div>
            ) : articles.length === 0 ? (
              <div className="home-empty-state"><p>Chưa có bài viết mới.</p></div>
            ) : (
              <div className="home-journal-grid">
                {articles.slice(0, 2).map((article, index) => (
                  <Link href={`/articles/${article.slug}`} className={`home-journal-card journal-tone-${index}`} key={article.id}>
                    <span>{article.category} · {new Date(article.created_at).toLocaleDateString("vi-VN")}</span>
                    <h3>{article.title}</h3>
                    <p>{article.summary}</p>
                    <b>Đọc bài viết <span>↗</span></b>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-grid">
          <div>
            <h5>VietNghe Shop</h5>
            <Link href="/">Giới thiệu</Link>
            <Link href="/articles">Bài viết</Link>
          </div>
          <div>
            <h5>Mua sắm</h5>
            <Link href="/products">Tất cả sản phẩm</Link>
            <Link href="/cart">Giỏ hàng</Link>
          </div>
          <div>
            <h5>Hỗ trợ</h5>
            <Link href="/contact">Liên hệ và chi nhánh</Link>
            <Link href="/contact">Bản đồ cửa hàng</Link>
          </div>
          <div className="footer-box">
            <div className="logo footer-logo">VIETNGHE SHOP</div>
            <p>Công nghệ tốt, giá thật chất. Cảm ơn bạn đã ghé thăm cửa hàng.</p>
          </div>
        </div>
        <div className="copy-right">© 2026 VietNghe Shop · Gia Lâm, Hà Nội</div>
      </footer>
    </div>
  );
}
