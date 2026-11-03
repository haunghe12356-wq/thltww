"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiError } from "@/lib/apiClient";
import { getProduct, getProductPrice, getProducts, type Product } from "@/services/productService";
import { addToCart } from "@/services/cartService";
import { getProductReviews, ProductReview, submitProductReview } from "@/services/storeService";
import { CartBadge, ShopNavigation } from "./ShopNavigation";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80";

const formatPrice = (value: number | string) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsError, setReviewsError] = useState("");
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    if (!productId) return;
    let isCurrent = true;

    const loadProduct = async () => {
      setLoading(true);
      setError("");
      setProduct(null);
      setRelatedProducts([]);
      setReviews([]);
      setReviewsError("");
      setRelatedError("");
      setQuantity(1);

      try {
        const response = await getProduct(productId);
        const payload = response.data;
        const currentProduct = "data" in payload ? payload.data : payload;
        if (!isCurrent) return;
        setProduct(currentProduct);
        setRelatedLoading(true);

        const relatedRequests = await Promise.allSettled([
          getProductReviews(currentProduct.id),
          currentProduct.category?.id
            ? getProducts({ category_id: currentProduct.category.id, per_page: 8 })
            : Promise.resolve(null),
          currentProduct.brand?.id
            ? getProducts({ brand_id: currentProduct.brand.id, per_page: 8 })
            : Promise.resolve(null),
        ]);

        if (!isCurrent) return;
        const [reviewsResult, categoryResult, brandResult] = relatedRequests;
        if (reviewsResult.status === "fulfilled") {
          setReviews(reviewsResult.value.data.data);
        } else {
          setReviewsError(getApiError(reviewsResult.reason));
        }

        const categoryProducts =
          categoryResult.status === "fulfilled" && categoryResult.value
            ? categoryResult.value.data.data
            : [];
        const brandProducts =
          brandResult.status === "fulfilled" && brandResult.value
            ? brandResult.value.data.data
            : [];
        const relatedById = new Map<number, Product>();
        [...categoryProducts, ...brandProducts].forEach((relatedProduct) => {
          if (relatedProduct.id !== currentProduct.id && !relatedById.has(relatedProduct.id)) {
            relatedById.set(relatedProduct.id, relatedProduct);
          }
        });
        setRelatedProducts(Array.from(relatedById.values()).slice(0, 4));

        if (
          relatedRequests.some((result) => result.status === "rejected") &&
          relatedById.size === 0
        ) {
          const failedRequest = relatedRequests.find((result) => result.status === "rejected");
          if (failedRequest?.status === "rejected") {
            setRelatedError(getApiError(failedRequest.reason));
          }
        }
      } catch (loadError) {
        if (isCurrent) setError(getApiError(loadError));
      } finally {
        if (isCurrent) {
          setLoading(false);
          setRelatedLoading(false);
        }
      }
    };

    void loadProduct();
    return () => {
      isCurrent = false;
    };
  }, [productId]);

  const averageRating = Number(product?.rating ?? 0);
  const roundedRating = Math.round(averageRating);
  const relatedHeading = product?.category?.name
    ? `Sản phẩm cùng danh mục ${product.category.name}`
    : product?.brand?.name
      ? `Sản phẩm cùng thương hiệu ${product.brand.name}`
      : "Có thể bạn cũng thích";

  const handleReviewSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReviewError("");
    setReviewMessage("");
    const token = window.localStorage.getItem("shop_token") ?? "";
    if (!token) {
      setReviewError("Vui lòng đăng nhập để gửi đánh giá.");
      return;
    }
    if (!product) return;

    try {
      await submitProductReview(product.id, { rating: reviewRating, comment: reviewComment }, token);
      const response = await getProductReviews(product.id);
      setReviews(response.data.data);
      setReviewComment("");
      setReviewMessage("Cảm ơn bạn đã đánh giá sản phẩm.");
      const updated = await getProduct(product.id);
      const payload = updated.data;
      setProduct("data" in payload ? payload.data : payload);
      setReviewMessage("Cảm ơn bạn đã đánh giá. Đánh giá sẽ hiển thị sau khi được duyệt.");
    } catch (submitError) {
      setReviewError(getApiError(submitError));
    }
  };

  if (loading) return <main className="detail-shell"><p className="muted">Đang tải thông tin sản phẩm...</p></main>;
  if (error) return <main className="detail-shell"><div className="detail-state error" role="alert"><h1>Không tải được sản phẩm</h1><p>{error}</p><Link href="/products">Quay lại danh sách sản phẩm</Link></div></main>;
  if (!product) return <main className="detail-shell"><div className="detail-state"><h1>Không tìm thấy sản phẩm</h1><p>Sản phẩm có thể đã bị xóa hoặc không còn được bán.</p><Link href="/products">Xem các sản phẩm khác</Link></div></main>;

  return (
    <div className="shop-page detail-shop-page">
      <header className="site-header">
        <div className="wrap topbar">
          <Link href="/" className="logo">VIETNGHE <span>SHOP</span></Link>
          <div className="detail-header-actions">
            <Link href="/products">Tiếp tục mua sắm</Link>
            <CartBadge />
          </div>
        </div>
        <ShopNavigation active="products" />
      </header>

      <main className="detail-shell">
        <nav className="detail-breadcrumb" aria-label="Điều hướng">
          <Link href="/">Trang chủ</Link><span>/</span>
          <Link href="/products">Sản phẩm</Link><span>/</span>
          {product.category?.id ? (
            <span>{product.category.name}</span>
          ) : <span>Sản phẩm</span>}
          <span>/</span><strong>{product.name}</strong>
        </nav>

      <div className="detail-card">
        <div className="detail-image">
          <Image
            src={product.image || FALLBACK_IMAGE}
            alt={product.name}
            width={1200}
            height={900}
            priority
            unoptimized
          />
          {Number(product.discount_percent ?? 0) > 0 && (
            <span className="detail-image-discount">-{product.discount_percent}%</span>
          )}
        </div>

        <div className="detail-info">
          <div className="detail-meta">
            {product.category?.name && <span className="product-tag">{product.category.name}</span>}
            <span className={`stock${product.stock < 1 ? " out-of-stock" : ""}`}>
              {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Tạm hết hàng"}
            </span>
          </div>

          <h1>{product.name}</h1>
          <div className="detail-rating-summary" aria-label={`Đánh giá ${averageRating.toFixed(1)} trên 5 sao`}>
            <span className="review-stars">{"★".repeat(roundedRating)}{"☆".repeat(5 - roundedRating)}</span>
            <strong>{averageRating > 0 ? averageRating.toFixed(1) : "Chưa có đánh giá"}</strong>
            <span>{product.reviews_count ?? 0} nhận xét</span>
            {product.brand?.name && <><i /> <span>Thương hiệu {product.brand.name}</span></>}
          </div>
          <div className="detail-price-row">
            <div className="detail-price">{formatPrice(getProductPrice(product))}</div>
            {Number(product.discount_percent ?? 0) > 0 && (
              <>
                <del>{formatPrice(product.price)}</del>
                <span className="detail-discount-badge">-{product.discount_percent}%</span>
              </>
            )}
          </div>
          {Number(product.discount_percent ?? 0) > 0 && (
            <p className="detail-savings">Bạn tiết kiệm {formatPrice(Number(product.price) - getProductPrice(product))} cho sản phẩm này.</p>
          )}

          <div className="hero-actions">
            <div className="detail-quantity">
              <span>Số lượng</span>
              <div>
                <button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <output aria-live="polite">{quantity}</output>
                <button type="button" aria-label="Tăng số lượng" disabled={quantity >= product.stock} onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}>+</button>
              </div>
            </div>
            <button
              type="button"
              className="primary-button"
              disabled={product.stock < 1}
              onClick={() => {
                addToCart(product, quantity);
                setCartMessage(`Đã thêm ${quantity} sản phẩm vào giỏ hàng.`);
              }}
            >
              {product.stock > 0 ? "Thêm vào giỏ" : "Hết hàng"}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={product.stock < 1}
              onClick={() => {
                addToCart(product, quantity);
                router.push("/cart");
              }}
            >
              Mua ngay
            </button>
            <Link href="/cart" className="secondary-button detail-cart-link">Xem giỏ hàng</Link>
          </div>
          {cartMessage && <p className="detail-cart-message" role="status">{cartMessage} <Link href="/cart">Xem giỏ hàng</Link></p>}

          <div className="detail-promises">
            <div><span aria-hidden="true">✓</span><p><strong>Thông tin minh bạch</strong><small>Giá và tồn kho cập nhật</small></p></div>
            <div><span aria-hidden="true">↗</span><p><strong>Đặt hàng dễ dàng</strong><small>Kiểm tra lại trước khi thanh toán</small></p></div>
          </div>
        </div>
      </div>

      <section className="detail-description" aria-labelledby="detail-description-title">
        <div>
          <span className="catalog-kicker">THÔNG TIN CHI TIẾT</span>
          <h2 id="detail-description-title">Mô tả sản phẩm</h2>
        </div>
        <p>{product.description || "Sản phẩm chưa có mô tả chi tiết. Vui lòng liên hệ cửa hàng để được tư vấn thêm."}</p>
        <dl>
          <div><dt>Mã sản phẩm</dt><dd>SP-{String(product.id).padStart(5, "0")}</dd></div>
          <div><dt>Danh mục</dt><dd>{product.category?.name || "Chưa phân loại"}</dd></div>
          <div><dt>Thương hiệu</dt><dd>{product.brand?.name || "Đang cập nhật"}</dd></div>
          <div><dt>Tình trạng</dt><dd>{product.stock > 0 ? "Còn hàng" : "Hết hàng"}</dd></div>
        </dl>
      </section>

      <section className="detail-related" aria-labelledby="detail-related-title">
        <div className="detail-section-heading">
          <div><span className="catalog-kicker">KHÁM PHÁ THÊM</span><h2 id="detail-related-title">{relatedHeading}</h2></div>
          <Link href="/products">Xem tất cả <span>→</span></Link>
        </div>
        {relatedLoading ? (
          <div className="detail-related-grid" aria-label="Đang tải sản phẩm liên quan">
            {Array.from({ length: 4 }, (_, index) => <div className="detail-related-skeleton" key={index} />)}
          </div>
        ) : relatedError ? (
          <div className="detail-state error" role="alert"><p>{relatedError}</p><Link href="/products">Xem toàn bộ sản phẩm</Link></div>
        ) : relatedProducts.length > 0 ? (
          <div className="detail-related-grid">
            {relatedProducts.map((relatedProduct) => (
              <article className="detail-related-card" key={relatedProduct.id}>
                <Link href={`/products/${relatedProduct.id}`}>
                  <div className="detail-related-image">
                    <Image src={relatedProduct.image || FALLBACK_IMAGE} alt={relatedProduct.name} width={600} height={480} unoptimized />
                    {Number(relatedProduct.discount_percent ?? 0) > 0 && <span>-{relatedProduct.discount_percent}%</span>}
                  </div>
                  <div className="detail-related-info">
                    <small>{relatedProduct.category?.name || relatedProduct.brand?.name || "VIETNGHE SHOP"}</small>
                    <h3>{relatedProduct.name}</h3>
                    <div className="detail-related-price">
                      <strong>{formatPrice(getProductPrice(relatedProduct))}</strong>
                      {Number(relatedProduct.discount_percent ?? 0) > 0 && <del>{formatPrice(relatedProduct.price)}</del>}
                    </div>
                  </div>
                </Link>
                <button type="button" disabled={relatedProduct.stock < 1} onClick={() => addToCart(relatedProduct)}>
                  {relatedProduct.stock > 0 ? "Thêm vào giỏ" : "Hết hàng"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="detail-state"><p>Chưa có sản phẩm liên quan trong danh mục này.</p><Link href="/products">Khám phá thêm sản phẩm</Link></div>
        )}
      </section>

      <section className="detail-reviews">
        <h2>Đánh giá sản phẩm</h2>
        <form onSubmit={handleReviewSubmit}>
          <label>
            Số sao
            <select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))}>
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} sao</option>)}
            </select>
          </label>
          <label>
            Nhận xét
            <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={3} maxLength={2000} />
          </label>
          {reviewError && <p className="form-feedback error" role="alert">{reviewError}</p>}
          {reviewMessage && <p className="form-feedback success" role="status">{reviewMessage}</p>}
            {reviewsError && <p className="form-feedback error" role="alert">{reviewsError}</p>}
            <button type="submit" className="primary-button">Gửi đánh giá</button>
        </form>
        {reviews.length === 0 ? (
          <p>Chưa có đánh giá. Hãy là người đầu tiên chia sẻ nhận xét.</p>
        ) : (
          <ul>
            {reviews.map((review) => (
              <li key={review.id}>
                <strong>{review.user.name}</strong>
                <span className="review-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                {review.comment && <p>{review.comment}</p>}
                <small>{new Date(review.created_at).toLocaleDateString("vi-VN")}</small>
              </li>
            ))}
          </ul>
        )}
      </section>
      </main>
    </div>
  );
}
