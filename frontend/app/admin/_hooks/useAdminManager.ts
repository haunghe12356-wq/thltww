"use client";

import { useState, useSyncExternalStore } from "react";
import type { Section } from "../_types";
import useAdminCatalog from "./useAdminCatalog";
import useAdminEntryActions from "./useAdminEntryActions";
import useAdminEntryForm from "./useAdminEntryForm";

function subscribeToToken(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredToken() {
  return window.localStorage.getItem("shop_token") ?? "";
}

export default function useAdminManager(section: Section) {
  const token = useSyncExternalStore(subscribeToToken, getStoredToken, () => "");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const catalog = useAdminCatalog(section, token, setError);
  const form = useAdminEntryForm(
    section,
    token,
    catalog.meta.total,
    catalog.loadEntries,
    setError,
    setMessage,
  );
  const { changeEntryState } = useAdminEntryActions(
    section,
    token,
    form.editingId,
    form.resetForm,
    catalog.loadEntries,
    setError,
    setMessage,
  );

  const openTrash = () => {
    catalog.setTrashed(true);
    catalog.setPage(1);
    setMessage("");
    setError("");
    form.resetForm();
  };

  return {
    token,
    ...catalog,
    ...form,
    error,
    message,
    changeEntryState,
    openTrash,
  };
}
