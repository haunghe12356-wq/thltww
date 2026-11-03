"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { getApiError } from "@/lib/apiClient";
import AdminPagination from "../_components/AdminPagination";
import AdminSidebar from "../_components/AdminSidebar";
import {
  deleteAdminMember,
  getAdminMember,
  getAdminMembers,
  updateAdminMemberStatus,
  type AdminMember,
  type AdminMemberDetail,
  type AdminMemberStatus,
} from "@/services/memberService";
import type { PaginationMeta } from "@/services/types";

const emptyMeta: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
};

const orderStatusLabels: Record<string, string> = {
  pending: "Chờ xử lý",
  paid: "Đã thanh toán",
  shipped: "Đang giao",
  cancelled: "Đã hủy",
};

function subscribeToToken(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredToken() {
  return window.localStorage.getItem("shop_token") ?? "";
}

function formatPrice(value: number | string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export default function AdminMembersPage() {
  const token = useSyncExternalStore(subscribeToToken, getStoredToken, () => "");
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>(emptyMeta);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminMemberStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [busyMemberId, setBusyMemberId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMembers = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await getAdminMembers(token, {
        page,
        per_page: perPage,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setMembers(response.data.data);
      setMeta(response.data.meta);
    } catch (loadError: unknown) {
      setError(getApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, search, statusFilter, token]);

  useEffect(() => {
    void Promise.resolve().then(loadMembers);
  }, [loadMembers]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const showMemberDetail = async (memberId: number) => {
    setDetail(null);
    setDetailLoading(true);
    setError("");
    try {
      const response = await getAdminMember(token, memberId);
      setDetail(response.data.data);
    } catch (detailError: unknown) {
      setError(getApiError(detailError));
    } finally {
      setDetailLoading(false);
    }
  };

  const changeMemberStatus = async (member: AdminMember) => {
    const nextIsActive = !member.is_active;
    const action = nextIsActive ? "mở khóa" : "khóa";
    if (!window.confirm(`Xác nhận ${action} tài khoản "${member.name}"?`)) return;

    setBusyMemberId(member.id);
    setError("");
    setNotice("");
    try {
      await updateAdminMemberStatus(token, member.id, nextIsActive);
      setMembers((currentMembers) =>
        currentMembers.map((currentMember) =>
          currentMember.id === member.id
            ? { ...currentMember, is_active: nextIsActive }
            : currentMember,
        ),
      );
      setDetail((currentDetail) =>
        currentDetail?.id === member.id
          ? { ...currentDetail, is_active: nextIsActive }
          : currentDetail,
      );
      setNotice(`Đã ${action} tài khoản ${member.email}.`);
    } catch (statusError: unknown) {
      setError(getApiError(statusError));
    } finally {
      setBusyMemberId(null);
    }
  };

  const removeMember = async (member: AdminMember) => {
    if (!window.confirm(`Xóa tài khoản "${member.name}" (${member.email})? Lịch sử đơn hàng sẽ được giữ lại.`)) return;

    setBusyMemberId(member.id);
    setError("");
    setNotice("");
    try {
      await deleteAdminMember(token, member.id);
      setDetail((currentDetail) => currentDetail?.id === member.id ? null : currentDetail);
      setNotice(`Đã xóa tài khoản ${member.email}. Lịch sử đơn hàng được giữ lại.`);
      await loadMembers();
    } catch (deleteError: unknown) {
      setError(getApiError(deleteError));
    } finally {
      setBusyMemberId(null);
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <AdminSidebar
          section="products"
          contentSection="members"
          trashed={false}
          onTrashOpen={() => undefined}
        />
        <div className="admin-workspace">
          <header className="admin-header">
            <div>
              <span className="admin-eyebrow">TÀI KHOẢN</span>
              <h1>Quản lý thành viên</h1>
              <p>Xem hồ sơ, quản lý trạng thái truy cập và tài khoản thành viên.</p>
            </div>
            <div className="admin-header-status"><span /> Hệ thống quản lý</div>
          </header>
          <div className="admin-content">
            {error && <p className="admin-notice error" role="alert">{error}</p>}
            {notice && <p className="admin-notice success" role="status">{notice}</p>}

            {!token ? (
              <section className="admin-card admin-sign-in">
                <h2>Đăng nhập để tiếp tục</h2>
                <p>Đăng nhập bằng tài khoản admin được cấp quyền để quản lý thành viên.</p>
                <Link href="/login">Đăng nhập</Link>
              </section>
            ) : (
              <section className="admin-card">
                <div className="admin-card-heading">
                  <div>
                    <span className="admin-eyebrow">THÀNH VIÊN</span>
                    <h2>Danh sách thành viên ({meta.total})</h2>
                  </div>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={() => void loadMembers()}
                    disabled={loading}
                  >
                    Tải lại
                  </button>
                </div>

                <form className="admin-member-filters" onSubmit={handleSearch}>
                  <label>
                    Tìm thành viên
                    <input
                      type="search"
                      value={searchInput}
                      maxLength={255}
                      placeholder="Tên, email, số điện thoại hoặc mã thành viên"
                      onChange={(event) => setSearchInput(event.target.value)}
                    />
                  </label>
                  <label>
                    Trạng thái tài khoản
                    <select
                      value={statusFilter}
                      onChange={(event) => {
                        setPage(1);
                        setStatusFilter(event.target.value as AdminMemberStatus | "");
                      }}
                    >
                      <option value="">Tất cả</option>
                      <option value="active">Đang hoạt động</option>
                      <option value="locked">Đã khóa</option>
                    </select>
                  </label>
                  <button type="submit" className="admin-primary-button" disabled={loading}>Tìm kiếm</button>
                </form>

                {loading ? (
                  <p className="admin-empty" role="status">Đang tải danh sách thành viên...</p>
                ) : members.length === 0 ? (
                  <p className="admin-empty">Không tìm thấy thành viên phù hợp.</p>
                ) : (
                  <>
                    <div className="admin-table-wrap">
                      <table className="admin-table admin-members-table">
                        <thead>
                          <tr>
                            <th>Thành viên</th>
                            <th>Liên hệ</th>
                            <th>Đơn hàng</th>
                            <th>Ngày tham gia</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((member) => (
                            <tr key={member.id}>
                              <td>
                                <strong>{member.name}</strong>
                                <small>Thành viên #{member.id}</small>
                              </td>
                              <td>
                                <strong>{member.email}</strong>
                                <small>{member.phone || "Chưa có số điện thoại"}</small>
                              </td>
                              <td>{member.orders_count}</td>
                              <td>{formatDate(member.created_at)}</td>
                              <td>
                                <span className={`admin-member-status ${member.is_active ? "active" : "locked"}`}>
                                  {member.is_active ? "Đang hoạt động" : "Đã khóa"}
                                </span>
                              </td>
                              <td className="admin-row-actions admin-member-actions">
                                <button type="button" onClick={() => void showMemberDetail(member.id)}>
                                  Xem chi tiết
                                </button>
                                <button
                                  type="button"
                                  disabled={busyMemberId !== null}
                                  onClick={() => void changeMemberStatus(member)}
                                >
                                  {member.is_active ? "Khóa" : "Mở khóa"}
                                </button>
                                <button
                                  type="button"
                                  className="admin-member-delete-action"
                                  disabled={busyMemberId !== null}
                                  onClick={() => void removeMember(member)}
                                >
                                  Xóa
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
            )}
          </div>
        </div>
      </div>

      {(detailLoading || detail) && (
        <div
          className="admin-member-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !detailLoading) setDetail(null);
          }}
        >
          <section className="admin-member-dialog" role="dialog" aria-modal="true" aria-labelledby="member-detail-title">
            <header>
              <div>
                <span className="admin-eyebrow">HỒ SƠ THÀNH VIÊN</span>
                <h2 id="member-detail-title">{detailLoading ? "Đang tải..." : detail?.name}</h2>
              </div>
              <button type="button" aria-label="Đóng chi tiết thành viên" onClick={() => setDetail(null)}>×</button>
            </header>
            {detail && (
              <>
                <dl className="admin-member-profile">
                  <div><dt>Mã thành viên</dt><dd>#{detail.id}</dd></div>
                  <div><dt>Email</dt><dd>{detail.email}</dd></div>
                  <div><dt>Số điện thoại</dt><dd>{detail.phone || "Chưa cập nhật"}</dd></div>
                  <div><dt>Địa chỉ</dt><dd>{detail.address || "Chưa cập nhật"}</dd></div>
                  <div><dt>Ngày tham gia</dt><dd>{formatDate(detail.created_at)}</dd></div>
                  <div><dt>Trạng thái</dt><dd>{detail.is_active ? "Đang hoạt động" : "Đã khóa"}</dd></div>
                  <div><dt>Số đơn hàng</dt><dd>{detail.orders_count}</dd></div>
                  <div><dt>Tổng giá trị đơn</dt><dd>{formatPrice(detail.orders_total)}</dd></div>
                </dl>
                <h3>Đơn hàng gần đây</h3>
                {detail.orders.length === 0 ? (
                  <p className="admin-empty">Thành viên chưa có đơn hàng.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead><tr><th>Mã đơn</th><th>Ngày đặt</th><th>Trạng thái</th><th>Tổng tiền</th></tr></thead>
                      <tbody>
                        {detail.orders.map((order) => (
                          <tr key={order.id}>
                            <td>#{order.id}</td>
                            <td>{formatDate(order.created_at)}</td>
                            <td>{orderStatusLabels[order.status] ?? order.status}</td>
                            <td>{formatPrice(order.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
