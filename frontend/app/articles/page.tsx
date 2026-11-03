"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiError } from "@/lib/apiClient";
import { getArticles, type Article } from "@/services/articleService";
import { ShopNavigation } from "@/app/shop/ShopNavigation";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN");
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getArticles()
      .then((response) => setArticles(response.data.data))
      .catch((loadError: unknown) => setError(getApiError(loadError)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="shop-page">
      <header className="site-header">
        <div className="wrap topbar"><Link href="/" className="logo">thegioididongthongminh</Link></div>
        <ShopNavigation active="articles" />
      </header>
      <main className="wrap page-content">
        <section className="editorial-heading">
          <span className="catalog-kicker">GÓC CHIA SẺ VIETNGHE</span>
          <h1>Bài viết</h1>
          <p>Tư vấn mua sắm và hướng dẫn sử dụng thiết bị công nghệ.</p>
        </section>
        {loading ? (
          <p className="admin-empty">Đang tải bài viết...</p>
        ) : error ? (
          <p className="form-feedback error" role="alert">{error}</p>
        ) : articles.length === 0 ? (
          <p className="admin-empty">Hiện chưa có bài viết nào.</p>
        ) : (
          <div className="editorial-grid">
            {articles.map((article) => (
              <article className="editorial-card" key={article.id}>
                <span>{article.category} · {formatDate(article.created_at)}</span>
                <h2><Link href={`/articles/${article.slug}`}>{article.title}</Link></h2>
                <p>{article.summary}</p>
                <Link className="editorial-read-more" href={`/articles/${article.slug}`}>Đọc bài viết →</Link>
              </article>
            ))}
          </div>
        )}
      </main>
      <footer className="site-footer"><div className="copy-right">© 2026 VietNghe Shop</div></footer>
    </div>
  );
}
