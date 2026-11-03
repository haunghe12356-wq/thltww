"use client";

import Link from "next/link";
import type { Section } from "../_types";
import AdminEntryForm from "./AdminEntryForm";
import AdminEntryList from "./AdminEntryList";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import useAdminManager from "../_hooks/useAdminManager";

export default function AdminManager({ initialSection }: { initialSection: Section }) {
  const manager = useAdminManager(initialSection);

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <AdminSidebar
          section={initialSection}
          trashed={manager.trashed}
          onTrashOpen={manager.openTrash}
        />
        <div className="admin-workspace">
          <AdminHeader section={initialSection} trashed={manager.trashed} />
          <div className="admin-content">
            {manager.error && <p className="admin-notice error" role="alert">{manager.error}</p>}
            {manager.message && <p className="admin-notice success" role="status">{manager.message}</p>}

            {!manager.token ? (
              <section className="admin-card admin-sign-in">
                <h2>Đăng nhập để tiếp tục</h2>
                <p>Đăng nhập bằng tài khoản admin được cấp quyền để quản lý cửa hàng.</p>
                <Link href="/login">Đăng nhập</Link>
              </section>
            ) : (
              <>
                {!manager.trashed &&
                  (initialSection !== "products" || manager.showProductForm || manager.editingId !== null) && (
                    <AdminEntryForm
                      section={initialSection}
                      editingId={manager.editingId}
                      form={manager.form}
                      categories={manager.categories}
                      brands={manager.brands}
                      saving={manager.saving}
                      onSubmit={manager.handleSubmit}
                      onClose={manager.resetForm}
                      onFieldChange={manager.setField}
                    />
                  )}
                <AdminEntryList
                  section={initialSection}
                  entries={manager.entries}
                  meta={manager.meta}
                  page={manager.page}
                  perPage={manager.perPage}
                  loading={manager.loading}
                  trashed={manager.trashed}
                  showProductForm={manager.showProductForm}
                  onAddProduct={manager.addProduct}
                  onOpenTrash={manager.openTrash}
                  onReload={() => void manager.loadEntries(manager.token)}
                  onEdit={manager.editEntry}
                  onAction={(entry, action) => void manager.changeEntryState(entry, action)}
                  onPageChange={manager.setPage}
                  onPerPageChange={(nextPerPage) => {
                    manager.setPerPage(nextPerPage);
                    manager.setPage(1);
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
