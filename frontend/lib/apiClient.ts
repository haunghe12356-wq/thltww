import axios from "axios";
import type { AxiosInstance } from "axios";
import configuredApiClient from "./axios";

const apiClient: AxiosInstance = configuredApiClient;

export function bearerHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined;
    const validationErrors = payload?.errors
      ? Object.values(payload.errors).flat().join(" ")
      : "";

    if (!error.response) {
      return "Không thể kết nối máy chủ. Vui lòng kiểm tra backend và thử lại.";
    }

    return payload?.message || validationErrors || error.message || "Yêu cầu không thành công.";
  }

  return error instanceof Error ? error.message : "Yêu cầu không thành công.";
}

export default apiClient;
