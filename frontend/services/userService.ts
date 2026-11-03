import apiClient, { bearerHeaders } from "@/lib/apiClient";

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
};

export const getCurrentUser = (token: string) =>
  apiClient.get<User>("/user", { headers: bearerHeaders(token) });

export const updateCurrentUser = (
  token: string,
  data: Pick<User, "name" | "email" | "phone" | "address">,
) =>
  apiClient.put<User>("/user", data, { headers: bearerHeaders(token) });
