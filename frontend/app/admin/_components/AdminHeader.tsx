import type { Section } from "../_types";
import { sectionNames } from "../_types";

type AdminHeaderProps = {
  section: Section;
  trashed: boolean;
};

export default function AdminHeader({ section, trashed }: AdminHeaderProps) {
  return (
    <header className="admin-header">
      <div>
        <span className="admin-eyebrow">BẢNG ĐIỀU KHIỂN</span>
        <h1>Quản trị cửa hàng</h1>
        <p>{trashed ? "Quản lý dữ liệu đã xóa." : `Đang quản lý ${sectionNames[section].toLocaleLowerCase("vi")}.`}</p>
      </div>
      <div className="admin-header-status"><span /> Hệ thống quản lý</div>
    </header>
  );
}
