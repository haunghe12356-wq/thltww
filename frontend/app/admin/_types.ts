import type { FormEvent } from "react";
import type { Brand } from "@/services/brandService";
import type { Category } from "@/services/categoryService";
import type { Product } from "@/services/productService";

export type Section = "products" | "categories" | "brands";
export type Entry = Category | Brand | Product;
export type FormValues = {
  name: string;
  slug: string;
  description: string;
  status: string;
  price: string;
  discount_percent: string;
  stock: string;
  category_id: string;
  brand_id: string;
  image: string;
};
export type EntryAction = "restore" | "force" | "delete";

export const emptyForm: FormValues = {
  name: "",
  slug: "",
  description: "",
  status: "1",
  price: "",
  discount_percent: "",
  stock: "0",
  category_id: "",
  brand_id: "",
  image: "",
};

export const sectionNames: Record<Section, string> = {
  products: "Sản phẩm",
  categories: "Danh mục",
  brands: "Thương hiệu",
};

export type EntryFormSubmit = (event: FormEvent<HTMLFormElement>) => void;
