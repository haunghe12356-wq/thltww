"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiError } from "@/lib/apiClient";
import { getAdminReferenceData } from "@/services/adminService";
import type { Brand } from "@/services/brandService";
import type { Category } from "@/services/categoryService";
import type { PaginationMeta } from "@/services/types";
import type { Entry, Section } from "../_types";
import { getBrandEntries } from "../brands/adminData";
import { getCategoryEntries } from "../categories/adminData";
import { getProductEntries } from "../products/adminData";

export default function useAdminCatalog(
  section: Section,
  token: string,
  setError: (message: string) => void,
) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [trashed, setTrashed] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async (authToken: string) => {
    setLoading(true);
    setError("");

    try {
      const params = { page, per_page: perPage, ...(trashed ? { trashed: 1 } : {}) };
      const [listResponse, references] = await Promise.all([
        section === "products"
          ? getProductEntries(authToken, params)
          : section === "categories"
            ? getCategoryEntries(authToken, params)
            : getBrandEntries(authToken, params),
        getAdminReferenceData(authToken),
      ]);

      setEntries(listResponse.data.data);
      setMeta(listResponse.data.meta);
      setCategories(references.categories);
      setBrands(references.brands);
    } catch (loadError) {
      setError(getApiError(loadError));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, section, setError, trashed]);

  useEffect(() => {
    if (token) void Promise.resolve().then(() => loadEntries(token));
  }, [loadEntries, token]);

  return {
    entries,
    categories,
    brands,
    meta,
    page,
    setPage,
    perPage,
    setPerPage,
    trashed,
    setTrashed,
    loading,
    loadEntries,
  };
}
