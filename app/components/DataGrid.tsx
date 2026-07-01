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
import { STATUS_LABELS } from "@/app/lib/types";
import { formatNumber, formatPhone } from "@/app/lib/format";

// חבילת ag-grid-community רושמת אוטומטית את כל המודולים — אין צורך ב-ModuleRegistry ידני.

interface Props {
  holders: HolderDTO[];
  columns: ColumnDefDTO[];
  quickFilter: string;
  onCellChange: (id: string, key: string, value: string, isCustom: boolean) => void;
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
  onCellChange,
  onSelectionChange,
  onOpenContact,
  onSendWhatsApp,
  onColumnMoved,
  onGridApi,
}: Props) {
  const apiRef = useRef<GridApi | null>(null);

  const visibleCols = useMemo(
    () => columns.filter((c) => c.visible).sort((a, b) => a.order - b.order),
    [columns]
  );

  const colDefs = useMemo<ColDef<HolderDTO>[]>(() => {
    const cols: ColDef<HolderDTO>[] = [
      {
        headerName: "",
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 46,
        pinned: "right",
        lockPosition: true,
        suppressMovable: true,
        sortable: false,
        filter: false,
        editable: false,
        resizable: false,
      },
    ];

    for (const col of visibleCols) {
      const isStatus = col.type === "status";
      const isFirst = col.key === "name";
      const isNumber = col.type === "number";
      const isPhone = col.type === "phone";
      const def: ColDef<HolderDTO> = {
        headerName: col.label,
        field: col.isCustom ? (`extra.${col.key}` as never) : (col.key as never),
        editable: !isStatus,
        sortable: true,
        filter: isNumber ? "agNumberColumnFilter" : "agTextColumnFilter",
        resizable: true,
        minWidth: isFirst ? 180 : 110,
        flex: isFirst ? 1.6 : 1,
        pinned: isFirst ? "right" : undefined,
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
        def.valueFormatter = (p) => formatPhone(String(p.value ?? ""));
        def.cellClass = "tabular-nums text-slate-600";
      }

      if (isStatus) {
        def.cellRenderer = StatusRenderer;
        def.editable = true;
        def.cellEditor = "agSelectCellEditor";
        def.cellEditorParams = { values: ["pending", "signed", "objected"] };
      }
      cols.push(def);
    }

    cols.push({
      headerName: "פעולות",
      colId: "_actions",
      width: 120,
      pinned: "left",
      sortable: false,
      filter: false,
      editable: false,
      resizable: false,
      lockPosition: true,
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
    },
    [onGridApi]
  );

  const handleCellChanged = useCallback(
    (e: CellValueChangedEvent<HolderDTO>) => {
      const colId = e.colDef.colId as string;
      const meta = visibleCols.find((c) => c.key === colId);
      if (!meta || !e.data) return;
      const value = e.newValue == null ? "" : String(e.newValue);
      onCellChange(e.data.id, meta.key, value, meta.isCustom);
    },
    [visibleCols, onCellChange]
  );

  const handleColumnMoved = useCallback(
    (_e: ColumnMovedEvent) => {
      if (!apiRef.current) return;
      const ordered = apiRef.current
        .getAllGridColumns()
        .map((c) => c.getColId())
        .filter((id) => id !== "_actions" && id !== "" && !id.startsWith("ag-"));
      onColumnMoved(ordered);
    },
    [onColumnMoved]
  );

  const getRowId = useCallback((p: GetRowIdParams<HolderDTO>) => p.data.id, []);

  return (
    <div className="ag-theme-quartz w-full h-full">
      <AgGridReact<HolderDTO>
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
        onRowDoubleClicked={(e) => e.data && onOpenContact(e.data)}
        animateRows={true}
        stopEditingWhenCellsLoseFocus={true}
        rowHeight={52}
        headerHeight={46}
        defaultColDef={{ filter: true, floatingFilter: false }}
        overlayNoRowsTemplate={'<span style="color:#94a3b8;padding:24px">אין נתונים להצגה — ייבאו קובץ או הוסיפו שורה</span>'}
      />
    </div>
  );
}
