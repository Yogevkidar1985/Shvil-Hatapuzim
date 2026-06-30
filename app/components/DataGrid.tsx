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
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import type { HolderDTO, ColumnDefDTO } from "@/app/lib/types";
import { STATUS_LABELS } from "@/app/lib/types";

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

// תא סטטוס צבעוני
function StatusRenderer(p: { value: string }) {
  const v = (p.value || "pending") as keyof typeof STATUS_LABELS;
  const cls =
    v === "signed" ? "status-signed" : v === "objected" ? "status-objected" : "status-pending";
  return <span className={`status-pill ${cls}`}>{STATUS_LABELS[v] ?? "ממתין"}</span>;
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
        width: 48,
        pinned: "right",
        lockPosition: true,
        suppressMovable: true,
        sortable: false,
        filter: false,
        editable: false,
      },
    ];

    for (const col of visibleCols) {
      const isStatus = col.type === "status";
      const isFirst = col.key === "name";
      const def: ColDef<HolderDTO> = {
        headerName: col.label,
        field: col.isCustom ? (`extra.${col.key}` as any) : (col.key as any),
        editable: !isStatus,
        sortable: true,
        filter: col.type === "number" ? "agNumberColumnFilter" : "agTextColumnFilter",
        resizable: true,
        minWidth: 110,
        flex: isFirst ? 1.4 : 1,
        pinned: isFirst ? "right" : undefined, // הקפאת עמודת השם בגלילה
        colId: col.key,
      };

      if (col.isCustom) {
        def.valueGetter = (params) => params.data?.extra?.[col.key] ?? "";
      }

      if (isStatus) {
        def.cellRenderer = StatusRenderer;
        def.editable = true;
        def.cellEditor = "agSelectCellEditor";
        def.cellEditorParams = { values: ["pending", "signed", "objected"] };
        def.refData = STATUS_LABELS as unknown as { [key: string]: string };
      }
      cols.push(def);
    }

    // עמודת פעולות (WhatsApp + פתיחת כרטיס)
    cols.push({
      headerName: "פעולות",
      colId: "_actions",
      width: 130,
      pinned: "left",
      sortable: false,
      filter: false,
      editable: false,
      lockPosition: true,
      suppressMovable: true,
      cellRenderer: (p: { data: HolderDTO }) => {
        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex;gap:6px;align-items:center;height:100%";
        const wa = document.createElement("button");
        wa.innerHTML = "💬";
        wa.title = "שלח WhatsApp";
        wa.style.cssText =
          "background:#16a34a;color:#fff;border:none;border-radius:6px;width:30px;height:28px;cursor:pointer;font-size:14px";
        wa.onclick = (e) => {
          e.stopPropagation();
          onSendWhatsApp(p.data);
        };
        const card = document.createElement("button");
        card.innerHTML = "📋";
        card.title = "פתח כרטיס";
        card.style.cssText =
          "background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;width:30px;height:28px;cursor:pointer;font-size:14px";
        card.onclick = (e) => {
          e.stopPropagation();
          onOpenContact(p.data);
        };
        wrap.appendChild(wa);
        wrap.appendChild(card);
        return wrap;
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
      const col = e.colDef;
      const colId = col.colId as string;
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
        onSelectionChanged={(e) =>
          onSelectionChange(e.api.getSelectedRows().map((r) => r.id))
        }
        onRowDoubleClicked={(e) => e.data && onOpenContact(e.data)}
        animateRows={true}
        stopEditingWhenCellsLoseFocus={true}
        defaultColDef={{ filter: true, floatingFilter: false }}
        localeText={{
          noRowsToShow: "אין נתונים להצגה — ייבאו קובץ או הוסיפו שורה",
        }}
      />
    </div>
  );
}
