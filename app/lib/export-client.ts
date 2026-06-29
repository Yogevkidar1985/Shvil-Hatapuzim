// ייצוא ל-Excel בצד לקוח (SheetJS) — שומר על העמודות הנראות, פורמט עברי ושם קובץ עם תאריך.
import * as XLSX from "xlsx";
import type { HolderDTO, ColumnDefDTO } from "./types";
import { STATUS_LABELS } from "./types";

export function exportToExcel(holders: HolderDTO[], columns: ColumnDefDTO[]) {
  const visible = columns.filter((c) => c.visible).sort((a, b) => a.order - b.order);

  const data = holders.map((h) => {
    const row: Record<string, string> = {};
    for (const col of visible) {
      let val = "";
      if (col.isCustom) {
        val = h.extra?.[col.key] ?? "";
      } else if (col.key === "status") {
        val = STATUS_LABELS[h.status] ?? h.status;
      } else {
        val = String((h as unknown as Record<string, unknown>)[col.key] ?? "");
      }
      row[col.label] = val;
    }
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data, {
    header: visible.map((c) => c.label),
  });
  // כיווניות RTL בגיליון
  ws["!dir"] = "rtl" as unknown as string;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "בעלי זכויות");
  if (wb.Workbook) wb.Workbook.Views = [{ RTL: true }];
  else wb.Workbook = { Views: [{ RTL: true }] };

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `בעלי-זכויות-${date}.xlsx`);
}
