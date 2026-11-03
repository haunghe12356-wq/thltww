"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiError } from "@/lib/apiClient";
import { getArticle, type Article } from "@/services/articleService";
import { ShopNavigation } from "@/app/shop/ShopNavigation";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN");
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [result, setResult] = useState<{ slug: string; article: Article | null; error: string }>({
    slug: "",
    article: null,
    error: "",
  });

  useEffect(() => {
    getArticle(slug)
      .then((response) => setResult({ slug, article: response.data.data, error: "" }))
      .catch((loadError: unknown) => setResult({ slug, article: null, error: getApiError(loadError) }));
  }, [slug]);

  const loading = result.slug !== slug;
  const article = loading ? null : result.article;
  const error = loading ? "" : result.error;

  return (
    <div className="shop-page">
      <header className="site-header">
        <div className="wrap topbar"><Link href="/" className="logo">thegioididongthongminh</Link></div>
        <ShopNavigation active="articles" />
      </header>
      <main className="wrap page-content">
        {loading ? (
          <p className="admin-empty">Đang tải bài viết...</p>
        ) : error || !article ? (
          <article className="editorial-article">
            <Link href="/articles" className="editorial-back">← Tất cả bài viết</Link>
            <h1>Không tìm thấy bài viết</h1>
            {error && <p className="form-feedback error" role="alert">{error}</p>}
          </article>
        ) : (
          <article className="editorial-article">
            <Link href="/articles" className="editorial-back">← Tất cả bài viết</Link>
            <span className="catalog-kicker">{article.category} · {formatDate(article.created_at)}</span>
            <h1>{article.title}</h1>
            <p className="editorial-summary">{article.summary}</p>
            {article.body.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
            <Link href="/contact" className="catalog-retry-button">Liên hệ tư vấn</Link>
          </article>
        )}
      </main>
    </div>
  );
}
