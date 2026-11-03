import apiClient, { bearerHeaders } from "@/lib/apiClient";
import type { PaginatedResponse } from "./types";

export type Article = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  category: string;
  body: string[];
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type ArticleData = Omit<Article, "id" | "created_at" | "updated_at">;

export const getArticles = () =>
  apiClient.get<{ data: Article[] }>("/articles");

export const getArticle = (slug: string) =>
  apiClient.get<{ data: Article }>(`/articles/${encodeURIComponent(slug)}`);

export const getAdminArticles = (token: string, params: { page: number; per_page: number }) =>
  apiClient.get<PaginatedResponse<Article>>("/admin/articles", {
    headers: bearerHeaders(token),
    params,
  });

export const createArticle = (token: string, data: ArticleData) =>
  apiClient.post<{ data: Article }>("/admin/articles", data, {
    headers: bearerHeaders(token),
  });

export const updateArticle = (token: string, id: number, data: ArticleData) =>
  apiClient.put<{ data: Article }>(`/admin/articles/${id}`, data, {
    headers: bearerHeaders(token),
  });

export const deleteArticle = (token: string, id: number) =>
  apiClient.delete(`/admin/articles/${id}`, { headers: bearerHeaders(token) });
