import type { FormValues, Section } from "../_types";
import { sectionNames } from "../_types";
import type { Brand } from "@/services/brandService";
import type { Category } from "@/services/categoryService";
import type { EntryFormSubmit } from "../_types";

type AdminEntryFormProps = {
  section: Section;
  editingId: number | null;
  form: FormValues;
  categories: Category[];
  brands: Brand[];
  saving: boolean;
  onSubmit: EntryFormSubmit;
  onClose: () => void;
  onFieldChange: (field: keyof FormValues, value: string) => void;
};

export default function AdminEntryForm({
  section,
  editingId,
  form,
  categories,
  brands,
  saving,
  onSubmit,
  onClose,
  onFieldChange,
}: AdminEntryFormProps) {
  return (
    <section className="admin-card">
      <div className="admin-card-heading">
        <div>
          <span className="admin-eyebrow">{editingId ? "CHỈNH SỬA" : "THÊM MỚI"}</span>
          <h2>{editingId ? `Cập nhật ${sectionNames[section].toLocaleLowerCase("vi")}` : `Thêm ${sectionNames[section].toLocaleLowerCase("vi")}`}</h2>
        </div>
        {(editingId || section === "products") && (
          <button type="button" className="admin-secondary-button" onClick={onClose}>
            {editingId ? "Hủy chỉnh sửa" : "Đóng"}
          </button>
        )}
      </div>

      <form className="admin-form" onSubmit={onSubmit}>
        <label>
          {section === "products" ? "Tên sản phẩm" : section === "categories" ? "Tên danh mục" : "Tên thương hiệu"} *
          <input
            value={form.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            maxLength={section === "products" ? 150 : 255}
            required
          />
        </label>

        {section !== "products" && (
          <label>
            Slug *
            <input
              value={form.slug}
              onChange={(event) => onFieldChange("slug", event.target.value)}
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              maxLength={255}
              required
            />
          </label>
        )}

        {section === "products" ? (
          <>
            <label>
              Giá bán (₫) *
              <input type="number" min="0" step="1" value={form.price} onChange={(event) => onFieldChange("price", event.target.value)} required />
            </label>
            <label>
              Giảm giá (%)
              <input
                type="number"
                min="1"
                max="99"
                step="1"
                value={form.discount_percent}
                onChange={(event) => onFieldChange("discount_percent", event.target.value)}
                placeholder="Để trống nếu không khuyến mãi"
              />
            </label>
            <label>
              Tồn kho
              <input type="number" min="0" step="1" value={form.stock} onChange={(event) => onFieldChange("stock", event.target.value)} />
            </label>
            <label>
              Danh mục
              <select value={form.category_id} onChange={(event) => onFieldChange("category_id", event.target.value)}>
                <option value="">Không chọn danh mục</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label>
              Thương hiệu
              <select value={form.brand_id} onChange={(event) => onFieldChange("brand_id", event.target.value)}>
                <option value="">Không chọn thương hiệu</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </label>
            <label className="admin-form-wide">
              Đường dẫn ảnh
              <input type="url" value={form.image} onChange={(event) => onFieldChange("image", event.target.value)} placeholder="https://..." />
            </label>
          </>
        ) : section === "brands" ? (
          <label>
            Đường dẫn logo
            <input type="url" value={form.image} onChange={(event) => onFieldChange("image", event.target.value)} placeholder="https://..." />
          </label>
        ) : (
          <label>
            Trạng thái
            <select value={form.status} onChange={(event) => onFieldChange("status", event.target.value)}>
              <option value="1">Đang hiển thị</option>
              <option value="0">Ẩn</option>
            </select>
          </label>
        )}

        {section === "brands" && (
          <label>
            Trạng thái
            <select value={form.status} onChange={(event) => onFieldChange("status", event.target.value)}>
              <option value="1">Đang hoạt động</option>
              <option value="0">Ẩn</option>
            </select>
          </label>
        )}
        <label className="admin-form-wide">
          Mô tả
          <textarea value={form.description} onChange={(event) => onFieldChange("description", event.target.value)} rows={3} />
        </label>
        <div className="admin-form-actions admin-form-wide">
          <button type="submit" className="admin-primary-button" disabled={saving}>
            {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Thêm mới"}
          </button>
        </div>
      </form>
    </section>
  );
}
