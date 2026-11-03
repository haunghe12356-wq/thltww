import type { Entry } from "./_types";
import type { Product } from "@/services/productService";

export function createSlug(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function formatPrice(value: number | string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function isProduct(entry: Entry): entry is Product {
  return "price" in entry;
}

export function getEntryName(entry: Entry) {
  return entry.name;
}

export function getVisiblePages(currentPage: number, lastPage: number) {
  const firstPage = Math.max(1, Math.min(currentPage - 2, lastPage - 4));
  const finalPage = Math.min(lastPage, firstPage + 4);
  return Array.from({ length: finalPage - firstPage + 1 }, (_, index) => firstPage + index);
}
