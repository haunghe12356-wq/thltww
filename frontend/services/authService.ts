import apiClient from "@/lib/apiClient";

export type Credentials = {
  email: string;
  password: string;
};

export type RegisterData = Credentials & {
  name: string;
  password_confirmation: string;
};

export type AuthResponse = {
  token?: string;
  user?: { id: number; name: string; email: string };
};

export const login = (credentials: Credentials) =>
  apiClient.post<AuthResponse>("/login", credentials);

export const register = (data: RegisterData) =>
  apiClient.post<AuthResponse>("/register", data);

export const logout = (token: string) =>
  apiClient.post<{ message: string }>("/logout", undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
