"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { getApiError } from "@/lib/apiClient";
import { createSlug, isProduct } from "../_utils";
import { emptyForm, sectionNames, type Entry, type FormValues, type Section } from "../_types";
import { saveBrandEntry } from "../brands/adminData";
import { saveCategoryEntry } from "../categories/adminData";
import { saveProductEntry } from "../products/adminData";

export default function useAdminEntryForm(
  section: Section,
  token: string,
  totalEntries: number,
  loadEntries: (token: string) => Promise<void>,
  setError: (message: string) => void,
  setMessage: (message: string) => void,
) {
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [form, setForm] = useState<FormValues>(emptyForm);

  const resetForm = () => {
    setEditingId(null);
    setShowProductForm(false);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (section === "products") {
        await saveProductEntry(token, editingId, form);
      } else if (section === "categories") {
        await saveCategoryEntry(token, editingId, form, totalEntries);
      } else {
        await saveBrandEntry(token, editingId, form);
      }

      setMessage(`${editingId ? "Đã cập nhật" : "Đã thêm"} ${sectionNames[section].toLocaleLowerCase("vi")}.`);
      resetForm();
      await loadEntries(token);
    } catch (saveError) {
      setError(getApiError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: Entry) => {
    setEditingId(entry.id);
    if (section === "products") setShowProductForm(true);
    setForm({
      ...emptyForm,
      name: entry.name,
      slug: "slug" in entry ? entry.slug : "",
      description: entry.description ?? "",
      status: "status" in entry ? String(entry.status) : "1",
      price: isProduct(entry) ? String(entry.price) : "",
      discount_percent: isProduct(entry) && entry.discount_percent
        ? String(entry.discount_percent)
        : "",
      stock: isProduct(entry) ? String(entry.stock) : "0",
      category_id: isProduct(entry) && entry.category ? String(entry.category.id) : "",
      brand_id: isProduct(entry) && entry.brand ? String(entry.brand.id) : "",
      image: isProduct(entry) ? entry.image ?? "" : "logo" in entry ? entry.logo ?? "" : "",
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setField = (field: keyof FormValues, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "name" && section !== "products" && !editingId
        ? { slug: createSlug(value) }
        : {}),
    }));
  };

  const addProduct = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowProductForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return {
    saving,
    editingId,
    showProductForm,
    form,
    resetForm,
    handleSubmit,
    editEntry,
    setField,
    addProduct,
  };
}
