import apiClient, { bearerHeaders } from "@/lib/apiClient";

export type AdminMember = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  orders_count: number;
  created_at: string;
};

export type AdminMemberOrder = {
  id: number;
  total: string | number;
  status: string;
  payment_method: string | null;
  created_at: string;
};

export type AdminMemberDetail = AdminMember & {
  address: string | null;
  orders_total: number;
  orders: AdminMemberOrder[];
};

export type AdminMemberStatus = "active" | "locked";

export const getAdminMembers = (
  token: string,
  params: { page: number; per_page: number; search?: string; status?: AdminMemberStatus | "" },
) =>
  apiClient.get<{
    data: AdminMember[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>("/admin/members", {
    headers: bearerHeaders(token),
    params,
  });

export const getAdminMember = (token: string, memberId: number) =>
  apiClient.get<{ data: AdminMemberDetail }>(`/admin/members/${memberId}`, {
    headers: bearerHeaders(token),
  });

export const updateAdminMemberStatus = (
  token: string,
  memberId: number,
  isActive: boolean,
) =>
  apiClient.patch<{ data: { id: number; is_active: boolean } }>(
    `/admin/members/${memberId}/status`,
    { is_active: isActive },
    { headers: bearerHeaders(token) },
  );

export const deleteAdminMember = (token: string, memberId: number) =>
  apiClient.delete<{ message: string }>(`/admin/members/${memberId}`, {
    headers: bearerHeaders(token),
  });
