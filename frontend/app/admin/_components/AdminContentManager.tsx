"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { getApiError } from "@/lib/apiClient";
import {
  createArticle,
  deleteArticle,
  getAdminArticles,
  updateArticle,
  type Article,
  type ArticleData,
} from "@/services/articleService";
import {
  deleteContactMessage,
  getAdminContactMessage,
  getAdminContactMessages,
  replyToContactMessage,
  updateContactMessageReadStatus,
  type ContactMessage,
} from "@/services/contactMessageService";
import type { PaginationMeta } from "@/services/types";
import { createSlug } from "../_utils";
import AdminPagination from "./AdminPagination";
import AdminSidebar from "./AdminSidebar";

type ContentSection = "articles" | "contacts";
type ArticleForm = Omit<ArticleData, "body"> & { body: string };
const emptyArticleForm: ArticleForm = {
  title: "",
  slug: "",
  summary: "",
  category: "",
  body: "",
  published: false,
};
const emptyMeta: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
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

export default function AdminContentManager({ section }: { section: ContentSection }) {
  const token = useSyncExternalStore(subscribeToToken, getStoredToken, () => "");
  const [articles, setArticles] = useState<Article[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);
  const [contactDetailLoading, setContactDetailLoading] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replying, setReplying] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ArticleForm>(emptyArticleForm);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadEntries = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (section === "articles") {
        const response = await getAdminArticles(token, { page, per_page: perPage });
        setMeta(response.data.meta);
        setArticles(response.data.data);
      } else {
        const response = await getAdminContactMessages(token, { page, per_page: perPage });
        setMeta(response.data.meta);
        setContacts(response.data.data);
      }
    } catch (loadError) {
      setError(getApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, section, token]);

  useEffect(() => {
    void Promise.resolve().then(loadEntries);
  }, [loadEntries]);

  const resetForm = () => {
    setForm(emptyArticleForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleArticleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    const data: ArticleData = {
      ...form,
      slug: form.slug.trim() || createSlug(form.title),
      body: form.body.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
    };

    try {
      if (editingId === null) await createArticle(token, data);
      else await updateArticle(token, editingId, data);
      setNotice(editingId === null ? "Đã tạo bài viết." : "Đã cập nhật bài viết.");
      resetForm();
      await loadEntries();
    } catch (saveError) {
      setError(getApiError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const editArticle = (article: Article) => {
    setForm({
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      category: article.category,
      body: article.body.join("\n\n"),
      published: article.published,
    });
    setEditingId(article.id);
    setShowForm(true);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeArticle = async (article: Article) => {
    if (!window.confirm(`Xóa bài viết "${article.title}"?`)) return;
    setError("");
    setNotice("");
    try {
      await deleteArticle(token, article.id);
      setNotice("Đã xóa bài viết.");
      await loadEntries();
    } catch (actionError) {
      setError(getApiError(actionError));
    }
  };

  const toggleArticlePublished = async (article: Article) => {
    setError("");
    setNotice("");
    try {
      await updateArticle(token, article.id, {
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        category: article.category,
        body: article.body,
        published: !article.published,
      });
      setNotice(article.published ? "Đã chuyển bài viết sang bản nháp." : "Đã xuất bản bài viết.");
      await loadEntries();
    } catch (actionError) {
      setError(getApiError(actionError));
    }
  };

  const toggleContactRead = async (contact: ContactMessage) => {
    setError("");
    setNotice("");
    try {
      await updateContactMessageReadStatus(token, contact.id, !contact.is_read);
      setNotice(contact.is_read ? "Đã đánh dấu chưa đọc." : "Đã đánh dấu đã đọc.");
      await loadEntries();
    } catch (actionError) {
      setError(getApiError(actionError));
    }
  };

  const viewContact = async (contact: ContactMessage) => {
    setSelectedContact(null);
    setReplyDraft("");
    setContactDetailLoading(true);
    setError("");
    try {
      const response = await getAdminContactMessage(token, contact.id);
      setSelectedContact(response.data.data);
    } catch (detailError) {
      setError(getApiError(detailError));
    } finally {
      setContactDetailLoading(false);
    }
  };

  const submitContactReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedContact) return;
    setReplying(true);
    setError("");
    setNotice("");
    try {
      const response = await replyToContactMessage(token, selectedContact.id, replyDraft.trim());
      setSelectedContact(response.data.data);
      setReplyDraft("");
      setNotice(response.data.message);
      await loadEntries();
    } catch (replyError) {
      setError(getApiError(replyError));
    } finally {
      setReplying(false);
    }
  };

  const removeContact = async (contact: ContactMessage) => {
    if (!window.confirm(`Xóa liên hệ từ "${contact.name}"?`)) return;
    setError("");
    setNotice("");
    try {
      await deleteContactMessage(token, contact.id);
      setNotice("Đã xóa liên hệ.");
      await loadEntries();
    } catch (actionError) {
      setError(getApiError(actionError));
    }
  };

  const isArticleSection = section === "articles";

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <AdminSidebar
          section="products"
          contentSection={section}
          trashed={false}
          onTrashOpen={() => undefined}
        />
        <div className="admin-workspace">
          <header className="admin-header">
            <div>
              <span className="admin-eyebrow">BẢNG ĐIỀU KHIỂN</span>
              <h1>Quản trị cửa hàng</h1>
              <p>{isArticleSection ? "Quản lý nội dung và trạng thái xuất bản bài viết." : "Tiếp nhận và xử lý tin nhắn khách hàng gửi đến cửa hàng."}</p>
            </div>
            <div className="admin-header-status"><span /> Hệ thống quản lý</div>
          </header>
          <div className="admin-content">
            {error && <p className="admin-notice error" role="alert">{error}</p>}
            {notice && <p className="admin-notice success" role="status">{notice}</p>}

            {!token ? (
              <section className="admin-card admin-sign-in">
                <h2>Đăng nhập để tiếp tục</h2>
                <p>Đăng nhập bằng tài khoản admin được cấp quyền để quản lý cửa hàng.</p>
                <Link href="/login">Đăng nhập</Link>
              </section>
            ) : (
              <>
                {isArticleSection && showForm && (
                  <section className="admin-card">
                    <div className="admin-card-heading">
                      <div>
                        <span className="admin-eyebrow">NỘI DUNG</span>
                        <h2>{editingId === null ? "Thêm bài viết" : "Chỉnh sửa bài viết"}</h2>
                      </div>
                    </div>
                    <form className="admin-form" onSubmit={handleArticleSubmit}>
                      <label>
                        Tiêu đề
                        <input
                          required
                          maxLength={255}
                          value={form.title}
                          onChange={(event) => setForm((current) => ({
                            ...current,
                            title: event.target.value,
                            ...(editingId === null ? { slug: createSlug(event.target.value) } : {}),
                          }))}
                        />
                      </label>
                      <label>
                        Đường dẫn (slug)
                        <input
                          required
                          maxLength={255}
                          pattern="[A-Za-z0-9-]+"
                          value={form.slug}
                          onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                        />
                      </label>
                      <label>
                        Chuyên mục
                        <input
                          required
                          maxLength={100}
                          value={form.category}
                          onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                        />
                      </label>
                      <label>
                        Tóm tắt
                        <input
                          required
                          maxLength={500}
                          value={form.summary}
                          onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                        />
                      </label>
                      <label className="admin-form-wide">
                        Nội dung (cách đoạn bằng một dòng trống)
                        <textarea
                          required
                          rows={9}
                          value={form.body}
                          onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                        />
                      </label>
                      <label className="admin-content-publish">
                        <input
                          type="checkbox"
                          checked={form.published}
                          onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
                        />
                        Xuất bản ngay
                      </label>
                      <div className="admin-form-actions admin-form-wide">
                        <button type="button" className="admin-secondary-button" onClick={resetForm}>Hủy</button>
                        <button type="submit" className="admin-primary-button" disabled={saving}>
                          {saving ? "Đang lưu..." : editingId === null ? "Tạo bài viết" : "Lưu thay đổi"}
                        </button>
                      </div>
                    </form>
                  </section>
                )}

                <section className="admin-card">
                  <div className="admin-card-heading">
                    <div>
                      <span className="admin-eyebrow">{isArticleSection ? "NỘI DUNG" : "HỘP THƯ ĐẾN"}</span>
                      <h2>{isArticleSection ? `Danh sách bài viết (${meta.total})` : `Tin nhắn liên hệ (${meta.total})`}</h2>
                    </div>
                    <div className="admin-list-actions">
                      {isArticleSection && !showForm && (
                        <button
                          type="button"
                          className="admin-primary-button"
                          onClick={() => {
                            setForm(emptyArticleForm);
                            setEditingId(null);
                            setShowForm(true);
                          }}
                        >
                          + Thêm bài viết
                        </button>
                      )}
                      <button type="button" className="admin-secondary-button" onClick={() => void loadEntries()} disabled={loading}>
                        Tải lại
                      </button>
                    </div>
                  </div>

                  {loading ? (
                    <p className="admin-empty">Đang tải dữ liệu...</p>
                  ) : isArticleSection ? articles.length === 0 ? (
                    <p className="admin-empty">Chưa có bài viết nào.</p>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead><tr><th>Bài viết</th><th>Chuyên mục</th><th>Ngày tạo</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                        <tbody>
                          {articles.map((article) => (
                            <tr key={article.id}>
                              <td><strong>{article.title}</strong><small>/{article.slug}</small><small>{article.summary}</small></td>
                              <td>{article.category}</td>
                              <td>{formatDate(article.created_at)}</td>
                              <td>{article.published ? "Đã xuất bản" : "Bản nháp"}</td>
                              <td className="admin-row-actions">
                                <button type="button" onClick={() => editArticle(article)}>Sửa</button>
                                <button type="button" onClick={() => void toggleArticlePublished(article)}>{article.published ? "Ẩn" : "Xuất bản"}</button>
                                <button type="button" onClick={() => void removeArticle(article)}>Xóa</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : contacts.length === 0 ? (
                    <p className="admin-empty">Chưa có tin nhắn liên hệ nào.</p>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead><tr><th>Người gửi</th><th>Chủ đề</th><th>Ngày nhận</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                        <tbody>
                          {contacts.map((contact) => (
                            <tr key={contact.id}>
                              <td>
                                <strong>{contact.name}</strong>
                                <small><a href={`mailto:${contact.email}`}>{contact.email}</a></small>
                                {contact.phone && <small><a href={`tel:${contact.phone}`}>{contact.phone}</a></small>}
                              </td>
                              <td>
                                <strong>{contact.subject}</strong>
                                {contact.replied_at && <small>Đã phản hồi {formatDate(contact.replied_at)}</small>}
                              </td>
                              <td>{formatDate(contact.created_at)}</td>
                              <td>{contact.is_read ? "Đã đọc" : "Chưa đọc"}</td>
                              <td className="admin-row-actions">
                                <button type="button" onClick={() => void viewContact(contact)}>Chi tiết / phản hồi</button>
                                <button type="button" onClick={() => void toggleContactRead(contact)}>{contact.is_read ? "Chưa đọc" : "Đã đọc"}</button>
                                <button type="button" onClick={() => void removeContact(contact)}>Xóa</button>
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
                    onPageChange={setPage}
                    onPerPageChange={(value) => {
                      setPerPage(value);
                      setPage(1);
                    }}
                  />
                </section>
                {contactDetailLoading && (
                  <section className="admin-card" role="status">Đang tải chi tiết liên hệ...</section>
                )}
                {selectedContact && (
                  <section className="admin-card admin-contact-detail" aria-labelledby="contact-detail-heading">
                    <div className="admin-card-heading">
                      <div>
                        <span className="admin-eyebrow">CHI TIẾT LIÊN HỆ</span>
                        <h2 id="contact-detail-heading">{selectedContact.subject}</h2>
                      </div>
                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={() => setSelectedContact(null)}
                      >
                        Đóng
                      </button>
                    </div>
                    <dl>
                      <div><dt>Người gửi</dt><dd>{selectedContact.name}</dd></div>
                      <div><dt>Email</dt><dd><a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a></dd></div>
                      {selectedContact.phone && <div><dt>Điện thoại</dt><dd><a href={`tel:${selectedContact.phone}`}>{selectedContact.phone}</a></dd></div>}
                      <div><dt>Ngày nhận</dt><dd>{formatDate(selectedContact.created_at)}</dd></div>
                    </dl>
                    <div className="admin-contact-message">
                      <h3>Nội dung khách gửi</h3>
                      <p>{selectedContact.message}</p>
                    </div>
                    {selectedContact.admin_reply && (
                      <div className="admin-contact-message admin-contact-reply">
                        <h3>Phản hồi đã gửi {selectedContact.replied_at ? `- ${formatDate(selectedContact.replied_at)}` : ""}</h3>
                        <p>{selectedContact.admin_reply}</p>
                      </div>
                    )}
                    <form className="admin-contact-reply-form" onSubmit={submitContactReply}>
                      <label htmlFor="contact-reply">{selectedContact.admin_reply ? "Gửi phản hồi cập nhật" : "Soạn phản hồi"}</label>
                      <textarea
                        id="contact-reply"
                        required
                        maxLength={5000}
                        rows={5}
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value)}
                        placeholder="Nội dung email gửi khách hàng"
                      />
                      <button type="submit" className="admin-primary-button" disabled={replying || !replyDraft.trim()}>
                        {replying ? "Đang gửi..." : "Gửi phản hồi qua email"}
                      </button>
                    </form>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
