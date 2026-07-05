"use client";

import { useMemo, useRef, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import type {
  ColDef,
  CellValueChangedEvent,
  GridReadyEvent,
  GridApi,
  ColumnMovedEvent,
  GetRowIdParams,
  ICellRendererParams,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import type { HolderDTO, ColumnDefDTO } from "@/app/lib/types";
import { STATUS_LABELS, GROUP_STATUS_LABELS } from "@/app/lib/types";
import { formatNumber, formatPhone, formatDateTime, formatDate } from "@/app/lib/format";

// חבילת ag-grid-community רושמת אוטומטית את כל המודולים — אין צורך ב-ModuleRegistry ידני.

interface Props {
  holders: HolderDTO[];
  columns: ColumnDefDTO[];
  quickFilter: string;
  /** זום תצוגה (1 = 100%) — משנה גודל טקסט וגובה שורות */
  zoom?: number;
  /** רווח אופקי בין עמודות בפיקסלים */
  cellPad?: number;
  /** מכפיל גודל פונט (1 = ברירת מחדל) — בלתי תלוי בזום */
  fontScale?: number;
  /** שורות שנבחרו — משוחזרות אחרי שינוי זום (שמרכיב מחדש את הטבלה) */
  selectedIds?: string[];
  onCellChange: (id: string, key: string, value: string, isCustom: boolean, prevValue: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onOpenContact: (holder: HolderDTO) => void;
  onSendWhatsApp: (holder: HolderDTO) => void;
  onColumnMoved: (orderedKeys: string[]) => void;
  onGridApi?: (api: GridApi) => void;
}

function StatusRenderer(p: ICellRendererParams<HolderDTO>) {
  const v = (p.value || "pending") as keyof typeof STATUS_LABELS;
  const cls =
    v === "signed" ? "status-signed" : v === "objected" ? "status-objected" : "status-pending";
  return <span className={`status-pill ${cls}`}>{STATUS_LABELS[v] ?? "ממתין"}</span>;
}

/** תא "הודעות" — כמה נשלחו/התקבלו + תוכן ההודעה האחרונה ב-tooltip. מונע כפילויות במבט אחד. */
function MessagesRenderer(p: ICellRendererParams<HolderDTO>) {
  const s = p.data?.msgStats;
  if (!s || (s.out === 0 && s.in === 0 && s.failed === 0)) {
    return <span className="text-slate-300 text-xs">— לא נשלחה הודעה —</span>;
  }
  const tooltip = s.lastBody
    ? `אחרונה (${s.lastDirection === "in" ? "התקבלה" : "נשלחה"} ${formatDateTime(s.lastAt)}):\n${s.lastBody}`
    : "";
  return (
    <div className="flex items-center gap-1.5 h-full" title={tooltip}>
      <span className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums">
        💬 {s.out}
      </span>
      {s.in > 0 && (
        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums" title="הודעות שהתקבלו ממנו">
          ↩ {s.in}
        </span>
      )}
      {s.failed > 0 && (
        <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums" title="שליחות שנכשלו">
          ⚠ {s.failed}
        </span>
      )}
    </div>
  );
}

/** תא "קבוצה" — סטטוס חברות בקבוצת WhatsApp */
function GroupRenderer(p: ICellRendererParams<HolderDTO>) {
  const st = p.data?.groupStatus ?? "none";
  const label = GROUP_STATUS_LABELS[st] ?? st;
  const cls =
    st === "added"
      ? "bg-green-100 text-green-700"
      : st === "invited"
        ? "bg-amber-100 text-amber-700"
        : st === "left" || st === "failed"
          ? "bg-red-50 text-red-600"
          : "bg-slate-100 text-slate-400";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {st === "added" && "✓ "}
      {label}
    </span>
  );
}

/** תא טלפון — מספר מפורמט + אינדיקציית תקינות (checkWhatsapp) */
function PhoneRenderer(p: ICellRendererParams<HolderDTO>) {
  const phone = String(p.value ?? "");
  if (!phone) return <span className="text-slate-300">—</span>;
  const check = p.data?.waCheck ?? "unknown";
  return (
    <span className="flex items-center gap-1.5 tabular-nums text-slate-600">
      {check === "valid" && <span className="text-green-500 text-xs" title="למספר יש WhatsApp">✔</span>}
      {check === "invalid" && <span className="text-red-500 text-xs" title="למספר אין WhatsApp — לא ניתן לשלוח">✖</span>}
      {formatPhone(phone)}
    </span>
  );
}

function NameRenderer(p: ICellRendererParams<HolderDTO>) {
  const name = String(p.value || "");
  const initials =
    name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("") || "?";
  return (
    <div className="flex items-center gap-2.5 h-full">
      <span className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-300 to-brand-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
        {initials}
      </span>
      <span className="font-semibold text-slate-700 truncate">{name || <span className="text-slate-300">— ללא שם —</span>}</span>
    </div>
  );
}

export default function DataGrid({
  holders,
  columns,
  quickFilter,
  zoom = 1,
  cellPad = 14,
  fontScale = 1,
  selectedIds,
  onCellChange,
  onSelectionChange,
  onOpenContact,
  onSendWhatsApp,
  onColumnMoved,
  onGridApi,
}: Props) {
  const apiRef = useRef<GridApi | null>(null);
  const selectedIdsRef = useRef<string[]>(selectedIds ?? []);
  selectedIdsRef.current = selectedIds ?? [];

  const visibleCols = useMemo(
    () => columns.filter((c) => c.visible).sort((a, b) => a.order - b.order),
    [columns]
  );

  const colDefs = useMemo<ColDef<HolderDTO>[]>(() => {
    const cols: ColDef<HolderDTO>[] = [
      {
        headerName: "",
        colId: "_select",
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 46,
        pinned: "right",
        lockPosition: "right", // תמיד העמודה הימנית ביותר — לפני שם בעל הזכויות
        lockPinned: true,
        suppressMovable: true,
        sortable: false,
        filter: false,
        editable: false,
        resizable: false,
      },
    ];

    // רוחב לפי תוכן העמודה — טקסט ארוך נמתח, מספרים וסטטוסים קומפקטיים
    const WIDTH_HINTS: Record<string, { minWidth?: number; width?: number; flex?: number }> = {
      name: { minWidth: 190, flex: 1.6 },
      "חלקות ושטחים": { minWidth: 210, flex: 1.5 },
      "שטח כ״ס (מ״ר)": { width: 125 },
      phone: { width: 155 },
      status: { width: 115 },
      "מקור": { width: 115 },
      notes: { minWidth: 180, flex: 1.3 },
      "הערות נסח טאבו": { minWidth: 180, flex: 1.3 },
      "שווי מצב יוצא": { width: 135 },
      "מגרש תמורה": { width: 120 },
      "אימייל": { minWidth: 180, flex: 1 },
      relativeValue: { width: 125 },
      state: { minWidth: 140, flex: 1 },
      balancePay: { width: 140 },
      balanceReceive: { width: 140 },
    };

    for (const col of visibleCols) {
      const isStatus = col.type === "status";
      const isFirst = col.key === "name";
      const isNumber = col.type === "number";
      const isPhone = col.type === "phone";
      const hint = WIDTH_HINTS[col.key] ?? { minWidth: 120, flex: 1 };
      const def: ColDef<HolderDTO> = {
        headerName: col.label,
        field: col.isCustom ? (`extra.${col.key}` as never) : (col.key as never),
        editable: !isStatus,
        sortable: true,
        filter: isNumber ? "agNumberColumnFilter" : "agTextColumnFilter",
        resizable: true,
        ...hint,
        pinned: isFirst ? "right" : undefined,
        // עמודת השם היא העוגן — נעולה מימין, לא ניתנת לגרירה החוצה מהנעיצה
        lockPinned: isFirst ? true : undefined,
        suppressMovable: isFirst ? true : undefined,
        colId: col.key,
        headerClass: isFirst ? "ag-header-cell--first" : undefined,
      };

      if (col.isCustom) {
        def.valueGetter = (params) => params.data?.extra?.[col.key] ?? "";
      }

      if (isFirst) {
        def.cellRenderer = NameRenderer;
      } else if (isNumber) {
        def.valueFormatter = (p) => formatNumber(String(p.value ?? ""));
        def.cellClass = "tabular-nums text-slate-700";
      } else if (isPhone) {
        def.cellRenderer = PhoneRenderer;
      }

      if (isStatus) {
        def.cellRenderer = StatusRenderer;
        def.editable = true;
        def.cellEditor = "agSelectCellEditor";
        def.cellEditorParams = { values: ["pending", "signed", "objected"] };
      }
      cols.push(def);
    }

    // ===== עמודות מערכת קבועות: הודעות + קבוצה =====
    cols.push({
      headerName: "הודעות",
      colId: "_messages",
      width: 170,
      sortable: true,
      filter: false,
      editable: false,
      suppressMovable: true,
      valueGetter: (p) => p.data?.msgStats?.out ?? 0, // מיון לפי כמות שנשלחו
      cellRenderer: MessagesRenderer,
      onCellClicked: (e) => e.data && onOpenContact(e.data),
      cellClass: "cursor-pointer",
    });
    cols.push({
      headerName: "קבוצת WhatsApp",
      colId: "_group",
      width: 140,
      sortable: true,
      filter: false,
      editable: false,
      suppressMovable: true,
      valueGetter: (p) => p.data?.groupStatus ?? "none",
      cellRenderer: GroupRenderer,
    });

    // ===== תאריך קבלת הטלפון — מתי הושג/הוזן המספר =====
    cols.push({
      headerName: "תאריך קבלת טלפון",
      colId: "_phoneAddedAt",
      width: 150,
      sortable: true,
      filter: false,
      editable: false,
      suppressMovable: true,
      valueGetter: (p) => p.data?.phoneAddedAt ?? "",
      cellRenderer: (p: ICellRendererParams<HolderDTO>) => {
        const iso = p.data?.phoneAddedAt ?? null;
        if (!iso) return <span className="text-slate-300 text-xs">—</span>;
        return (
          <span className="inline-flex items-center gap-1 text-xs text-slate-600 tabular-nums" title="מתי הוזן/הושג מספר הטלפון">
            📅 {formatDate(iso)}
          </span>
        );
      },
    });

    cols.push({
      headerName: "פעולות",
      colId: "_actions",
      width: 120,
      pinned: "left",
      sortable: false,
      filter: false,
      editable: false,
      resizable: false,
      lockPosition: "left", // תמיד בקצה השמאלי
      lockPinned: true,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<HolderDTO>) => {
        const data = p.data;
        if (!data) return null;
        return (
          <div className="flex gap-1.5 items-center h-full">
            <button
              title="שלח WhatsApp"
              className="grid-action-btn grid-action-wa"
              onClick={(e) => { e.stopPropagation(); onSendWhatsApp(data); }}
            >
              💬
            </button>
            <button
              title="פתח כרטיס"
              className="grid-action-btn grid-action-card"
              onClick={(e) => { e.stopPropagation(); onOpenContact(data); }}
            >
              👁
            </button>
          </div>
        );
      },
    });

    return cols;
  }, [visibleCols, onSendWhatsApp, onOpenContact]);

  const onGridReady = useCallback(
    (e: GridReadyEvent) => {
      apiRef.current = e.api;
      onGridApi?.(e.api);
      // שחזור בחירה אחרי remount (שינוי זום מרכיב את הטבלה מחדש)
      const ids = new Set(selectedIdsRef.current);
      if (ids.size > 0) {
        e.api.forEachNode((node) => {
          if (node.data && ids.has(node.data.id)) node.setSelected(true);
        });
      }
    },
    [onGridApi]
  );

  const handleCellChanged = useCallback(
    (e: CellValueChangedEvent<HolderDTO>) => {
      const colId = e.colDef.colId as string;
      const meta = visibleCols.find((c) => c.key === colId);
      if (!meta || !e.data) return;
      const value = e.newValue == null ? "" : String(e.newValue);
      // הערך הקודם חייב להגיע מהאירוע — AG Grid משנה את אובייקט השורה במקום
      // עוד לפני שהאירוע נורה, כך שקריאה מה-state תחזיר את הערך החדש
      const prevValue = e.oldValue == null ? "" : String(e.oldValue);
      onCellChange(e.data.id, meta.key, value, meta.isCustom, prevValue);
    },
    [visibleCols, onCellChange]
  );

  const handleColumnMoved = useCallback(
    (e: ColumnMovedEvent) => {
      // מגיבים רק בסיום הגרירה — עדכון state באמצע גרירה מבטל אותה
      if (!e.finished) return;
      if (!apiRef.current) return;
      const ordered = apiRef.current
        .getAllGridColumns()
        .map((c) => c.getColId())
        // מסנן עמודות מערכת (_messages, _group, _actions) ועמודות פנימיות של AG Grid
        .filter((id) => id !== "" && !id.startsWith("_") && !id.startsWith("ag-"));
      onColumnMoved(ordered);
    },
    [onColumnMoved]
  );

  const getRowId = useCallback((p: GetRowIdParams<HolderDTO>) => p.data.id, []);

  // זום: טקסט ורווחים דרך משתני CSS (חי); גובה שורות מחייב הרכבה מחדש — לכן key לפי זום
  const gridStyle = {
    "--ag-font-size": `${Math.round(14 * zoom * fontScale)}px`,
    "--ag-cell-horizontal-padding": `${cellPad}px`,
  } as React.CSSProperties;

  return (
    <div className="ag-theme-quartz w-full h-full" style={gridStyle}>
      <AgGridReact<HolderDTO>
        key={`zoom-${zoom}`}
        rowData={holders}
        columnDefs={colDefs}
        enableRtl={true}
        getRowId={getRowId}
        rowSelection="multiple"
        suppressRowClickSelection={true}
        quickFilterText={quickFilter}
        onGridReady={onGridReady}
        onCellValueChanged={handleCellChanged}
        onColumnMoved={handleColumnMoved}
        onSelectionChanged={(e) => onSelectionChange(e.api.getSelectedRows().map((r) => r.id))}
        animateRows={true}
        stopEditingWhenCellsLoseFocus={true}
        rowHeight={Math.round(52 * zoom)}
        headerHeight={Math.round(46 * zoom)}
        defaultColDef={{ filter: true, floatingFilter: false, wrapHeaderText: true, autoHeaderHeight: true }}
        overlayNoRowsTemplate={'<span style="color:#94a3b8;padding:24px">אין תוצאות מתאימות לחיפוש או לסינון הנוכחי</span>'}
      />
    </div>
  );
}
