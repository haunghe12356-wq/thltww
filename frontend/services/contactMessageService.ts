import apiClient, { bearerHeaders } from "@/lib/apiClient";
import type { PaginatedResponse } from "./types";

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  is_read: boolean;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
};

export const getAdminContactMessages = (
  token: string,
  params: { page: number; per_page: number },
) =>
  apiClient.get<PaginatedResponse<ContactMessage>>("/admin/contact-messages", {
    headers: bearerHeaders(token),
    params,
  });

export const getAdminContactMessage = (token: string, id: number) =>
  apiClient.get<{ data: ContactMessage }>(`/admin/contact-messages/${id}`, {
    headers: bearerHeaders(token),
  });

export const updateContactMessageReadStatus = (
  token: string,
  id: number,
  is_read: boolean,
) =>
  apiClient.patch<{ data: ContactMessage }>(
    `/admin/contact-messages/${id}`,
    { is_read },
    { headers: bearerHeaders(token) },
  );

export const replyToContactMessage = (token: string, id: number, reply: string) =>
  apiClient.post<{ message: string; data: ContactMessage }>(
    `/admin/contact-messages/${id}/reply`,
    { reply },
    { headers: bearerHeaders(token) },
  );

export const deleteContactMessage = (token: string, id: number) =>
  apiClient.delete(`/admin/contact-messages/${id}`, {
    headers: bearerHeaders(token),
  });
