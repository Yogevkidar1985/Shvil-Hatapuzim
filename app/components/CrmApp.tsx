"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { GridApi } from "ag-grid-community";
import DataGrid from "./DataGrid";
import Toolbar from "./Toolbar";
import ContactPanel from "./ContactPanel";
import AddColumnDialog from "./dialogs/AddColumnDialog";
import ImportDialog from "./dialogs/ImportDialog";
import BulkSendDialog from "./dialogs/BulkSendDialog";
import SignersMatchDialog from "./dialogs/SignersMatchDialog";
import { ToastProvider, useToast } from "./ui/Toast";
import { EmptyState } from "./ui/atoms";
import Button from "./ui/Button";
import { api } from "@/app/lib/api-client";
import { exportToExcel } from "@/app/lib/export-client";
import type { HolderDTO, ColumnDefDTO } from "@/app/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";
interface EditEntry {
  id: string;
  key: string;
  isCustom: boolean;
  prev: string;
  next: string;
}

export default function CrmApp() {
  return (
    <ToastProvider>
      <CrmContent />
    </ToastProvider>
  );
}

function CrmContent() {
  const router = useRouter();
  const { toast, confirm } = useToast();
  const [holders, setHolders] = useState<HolderDTO[]>([]);
  const [columns, setColumns] = useState<ColumnDefDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [waState, setWaState] = useState<{ configured: boolean; state: string | null } | null>(null);

  const [contactHolder, setContactHolder] = useState<HolderDTO | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showSigners, setShowSigners] = useState(false);

  const gridApiRef = useRef<GridApi | null>(null);
  const undoStack = useRef<EditEntry[]>([]);
  const redoStack = useRef<EditEntry[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [h, c] = await Promise.all([api.listHolders(), api.listColumns()]);
      setHolders(h.holders);
      setColumns(c.columns);
    } catch {
      toast("טעינת הנתונים נכשלה", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    reload();
    api.whatsappStatus().then(setWaState).catch(() => setWaState({ configured: false, state: null }));
  }, [reload]);

  const persistCell = useCallback((id: string, key: string, value: string, isCustom: boolean) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        const payload = isCustom ? { extra: { [key]: value } } : { [key]: value };
        await api.updateHolder(id, payload);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1500);
      } catch {
        setSaveState("error");
      }
    }, 500);
  }, []);

  const applyCellLocal = useCallback((id: string, key: string, value: string, isCustom: boolean) => {
    setHolders((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        if (isCustom) return { ...h, extra: { ...h.extra, [key]: value } };
        return { ...h, [key]: value } as HolderDTO;
      })
    );
  }, []);

  const handleCellChange = useCallback(
    (id: string, key: string, value: string, isCustom: boolean) => {
      const holder = holders.find((h) => h.id === id);
      const prev = holder
        ? isCustom
          ? holder.extra?.[key] ?? ""
          : String((holder as unknown as Record<string, unknown>)[key] ?? "")
        : "";
      undoStack.current.push({ id, key, isCustom, prev, next: value });
      redoStack.current = [];
      applyCellLocal(id, key, value, isCustom);
      persistCell(id, key, value, isCustom);
    },
    [holders, applyCellLocal, persistCell]
  );

  const doUndo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push(entry);
    applyCellLocal(entry.id, entry.key, entry.prev, entry.isCustom);
    persistCell(entry.id, entry.key, entry.prev, entry.isCustom);
    gridApiRef.current?.refreshCells({ force: true });
  }, [applyCellLocal, persistCell]);

  const doRedo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push(entry);
    applyCellLocal(entry.id, entry.key, entry.next, entry.isCustom);
    persistCell(entry.id, entry.key, entry.next, entry.isCustom);
    gridApiRef.current?.refreshCells({ force: true });
  }, [applyCellLocal, persistCell]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        doUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        doRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doUndo, doRedo]);

  const handleColumnMoved = useCallback(
    async (orderedKeys: string[]) => {
      const updates = orderedKeys
        .map((key, idx) => {
          const col = columns.find((c) => c.key === key);
          return col ? { id: col.id, order: idx } : null;
        })
        .filter(Boolean) as { id: string; order: number }[];
      if (updates.length === 0) return;
      setColumns((prev) =>
        [...prev]
          .map((c) => {
            const u = updates.find((x) => x.id === c.id);
            return u ? { ...c, order: u.order } : c;
          })
          .sort((a, b) => a.order - b.order)
      );
      try {
        await api.updateColumns(updates);
      } catch {
        /* נטען מחדש בפעם הבאה */
      }
    },
    [columns]
  );

  const handleAddRow = useCallback(async () => {
    try {
      const { holder } = await api.createHolder({ name: "" });
      setHolders((prev) => [...prev, holder]);
      toast("שורה חדשה נוספה", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "הוספת שורה נכשלה", "error");
    }
  }, [toast]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirm({
      title: `מחיקת ${selectedIds.length} שורות`,
      message: "הפעולה אינה הפיכה. למחוק את השורות שנבחרו?",
      confirmLabel: "מחק",
      danger: true,
    });
    if (!ok) return;
    try {
      await Promise.all(selectedIds.map((id) => api.deleteHolder(id)));
      setHolders((prev) => prev.filter((h) => !selectedIds.includes(h.id)));
      setSelectedIds([]);
      toast("השורות נמחקו", "success");
    } catch {
      toast("מחיקה נכשלה", "error");
    }
  }, [selectedIds, confirm, toast]);

  const handleSync = useCallback(async () => {
    toast("מסנכרן הודעות נכנסות…", "info");
    try {
      const r = await api.syncMessages();
      toast(`סונכרנו ${r.saved} הודעות חדשות (מתוך ${r.processed})`, "success");
      if (r.saved > 0) reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "סנכרון נכשל", "error");
    }
  }, [reload, toast]);

  const handleExport = useCallback(() => {
    exportToExcel(statusFilter ? holders.filter((h) => h.status === statusFilter) : holders, columns);
    toast("הקובץ יוצא בהצלחה", "success");
  }, [holders, columns, statusFilter, toast]);

  const filteredHolders = useMemo(() => {
    if (!statusFilter) return holders;
    return holders.filter((h) => h.status === statusFilter);
  }, [holders, statusFilter]);

  const selectedHolders = useMemo(() => holders.filter((h) => selectedIds.includes(h.id)), [holders, selectedIds]);

  async function handleLogout() {
    await api.logout().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-canvas h-screen flex flex-col">
      <Toolbar
        holders={holders}
        search={search}
        onSearch={setSearch}
        selectedCount={selectedIds.length}
        saveState={saveState}
        waState={waState}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        onImport={() => setShowImport(true)}
        onExport={handleExport}
        onAddRow={handleAddRow}
        onAddColumn={() => setShowAddColumn(true)}
        onBulkSend={() => setShowBulk(true)}
        onSigners={() => setShowSigners(true)}
        onSync={handleSync}
        onLogout={handleLogout}
      />

      {selectedIds.length > 0 && (
        <div className="bg-brand-600 text-white px-5 py-2 text-sm flex items-center gap-4 animate-fade-in">
          <span className="font-semibold">{selectedIds.length} שורות נבחרו</span>
          <button onClick={() => setShowBulk(true)} className="hover:underline flex items-center gap-1">💬 שלח WhatsApp</button>
          <button onClick={handleDeleteSelected} className="hover:underline flex items-center gap-1 text-white/90">🗑️ מחק</button>
          <button onClick={() => { gridApiRef.current?.deselectAll(); }} className="mr-auto text-white/70 hover:text-white text-xs">בטל בחירה ✕</button>
        </div>
      )}

      <div className="flex-1 px-4 pb-4 pt-3 overflow-hidden">
        {loading ? (
          <GridSkeleton />
        ) : holders.length === 0 ? (
          <div className="card h-full">
            <EmptyState
              title="אין עדיין בעלי זכויות"
              subtitle="ייבאו קובץ Excel קיים, או הוסיפו שורה ראשונה כדי להתחיל."
              action={
                <div className="flex gap-2">
                  <Button variant="primary" icon="⬆️" onClick={() => setShowImport(true)}>ייבוא קובץ</Button>
                  <Button variant="secondary" icon="＋" onClick={handleAddRow}>הוסף שורה</Button>
                </div>
              }
            />
          </div>
        ) : (
          <DataGrid
            holders={filteredHolders}
            columns={columns}
            quickFilter={search}
            onCellChange={handleCellChange}
            onSelectionChange={setSelectedIds}
            onOpenContact={setContactHolder}
            onSendWhatsApp={setContactHolder}
            onColumnMoved={handleColumnMoved}
            onGridApi={(a) => (gridApiRef.current = a)}
          />
        )}
      </div>

      {contactHolder && (
        <ContactPanel
          holder={holders.find((h) => h.id === contactHolder.id) ?? contactHolder}
          onClose={() => setContactHolder(null)}
          onHolderUpdated={(h) => {
            setHolders((prev) => prev.map((x) => (x.id === h.id ? h : x)));
            setContactHolder(h);
          }}
        />
      )}

      {showAddColumn && <AddColumnDialog onClose={() => setShowAddColumn(false)} onAdded={(col) => setColumns((prev) => [...prev, col])} />}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} onImported={reload} />}
      {showBulk && <BulkSendDialog holders={selectedHolders} onClose={() => setShowBulk(false)} onDone={reload} />}
      {showSigners && <SignersMatchDialog onClose={() => setShowSigners(false)} onApplied={reload} />}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="card h-full p-4 space-y-2.5">
      <div className="skeleton h-11 w-full" />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" style={{ opacity: 1 - i * 0.06 }} />
      ))}
    </div>
  );
}
