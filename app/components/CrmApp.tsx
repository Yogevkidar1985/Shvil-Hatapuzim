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
import GroupDialog from "./dialogs/GroupDialog";
import TemplatesDialog from "./dialogs/TemplatesDialog";
import SettingsDialog from "./dialogs/SettingsDialog";
import SignersMatchDialog from "./dialogs/SignersMatchDialog";
import { ToastProvider, useToast } from "./ui/Toast";
import { EmptyState } from "./ui/atoms";
import Button from "./ui/Button";
import ViewControls, { ZOOM_DEFAULT, PAD_DEFAULT, FONT_DEFAULT } from "./ui/ViewControls";
import { api } from "@/app/lib/api-client";
import { exportToExcel } from "@/app/lib/export-client";
import type { HolderDTO, ColumnDefDTO } from "@/app/lib/types";
import { isCurrentOwner } from "@/app/lib/types";
import MobileList from "./MobileList";

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
  const [phoneFilter, setPhoneFilter] = useState(""); // "" | "has" | "missing"
  const [sourceFilter, setSourceFilter] = useState("current"); // "current" | "all" | "2015"
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [waState, setWaState] = useState<{ configured: boolean; state: string | null } | null>(null);

  const [contactHolder, setContactHolder] = useState<HolderDTO | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSigners, setShowSigners] = useState(false);
  const [checkingPhones, setCheckingPhones] = useState(false);

  // ===== העדפות תצוגת טבלה (זום + רווח עמודות) — נשמרות ב-localStorage =====
  const [gridZoom, setGridZoom] = useState(ZOOM_DEFAULT);
  const [gridPad, setGridPad] = useState(PAD_DEFAULT);
  const [gridFont, setGridFont] = useState(FONT_DEFAULT);

  useEffect(() => {
    try {
      const z = parseFloat(localStorage.getItem("gridZoom") ?? "");
      const p = parseInt(localStorage.getItem("gridPad") ?? "", 10);
      const f = parseFloat(localStorage.getItem("gridFont") ?? "");
      if (Number.isFinite(z) && z >= 0.7 && z <= 1.5) setGridZoom(z);
      if (Number.isFinite(p) && p >= 4 && p <= 26) setGridPad(p);
      if (Number.isFinite(f) && f >= 0.8 && f <= 1.6) setGridFont(f);
    } catch {
      /* localStorage לא זמין */
    }
  }, []);

  const handleZoom = useCallback((z: number) => {
    setGridZoom(z);
    try { localStorage.setItem("gridZoom", String(z)); } catch {}
  }, []);
  const handlePad = useCallback((p: number) => {
    setGridPad(p);
    try { localStorage.setItem("gridPad", String(p)); } catch {}
  }, []);
  const handleFont = useCallback((f: number) => {
    setGridFont(f);
    try { localStorage.setItem("gridFont", String(f)); } catch {}
  }, []);
  const handleViewReset = useCallback(() => {
    setGridZoom(ZOOM_DEFAULT);
    setGridPad(PAD_DEFAULT);
    setGridFont(FONT_DEFAULT);
    try {
      localStorage.removeItem("gridZoom");
      localStorage.removeItem("gridPad");
      localStorage.removeItem("gridFont");
    } catch {}
  }, []);

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

  // ===== סנכרון חברות קבוצה אוטומטי =====
  // כל עוד המערכת פתוחה ו-WhatsApp מחובר, בודקים ברקע מי נכנס/עזב את הקבוצות
  // ומעדכנים את הסטטוסים אוטומטית — בלי שהמשתמש יצטרך ללחוץ.
  useEffect(() => {
    if (!waState?.configured || waState.state !== "authorized") return;
    let stop = false;
    const tick = async () => {
      try {
        const { groups } = await api.listGroups();
        if (stop || groups.length === 0) return;
        const r = await api.syncGroups();
        if (stop) return;
        if (r.joined > 0 || r.left > 0) {
          reload();
          if (r.joined > 0) toast(`${r.joined} בעלים הצטרפו לקבוצה`, "success");
        }
      } catch {
        /* שקט — סנכרון רקע */
      }
    };
    const id = setInterval(tick, 60_000); // כל דקה
    tick(); // גם מיד עם הטעינה
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [waState, reload, toast]);

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

  // בדיקת תקינות מספרים — קורא בלולאה במנות קטנות עד שכולם נבדקו
  const handleCheckPhones = useCallback(async () => {
    if (checkingPhones) return;
    setCheckingPhones(true);
    toast("בודק מספרים מול WhatsApp…", "info");
    const ids = selectedIds.length > 0 ? selectedIds : undefined;
    let totalChecked = 0;
    let totalValid = 0;
    let totalInvalid = 0;
    try {
      // עד 40 סבבים (200 מספרים) בקריאה אחת של המשתמש
      for (let i = 0; i < 40; i++) {
        const r = await api.checkPhones(ids);
        totalChecked += r.checked;
        totalValid += r.valid;
        totalInvalid += r.invalid;
        if (r.remaining === 0 || r.checked === 0) break;
        await new Promise((res) => setTimeout(res, 800));
      }
      if (totalChecked === 0) {
        toast("כל המספרים כבר נבדקו ✓", "success");
      } else {
        toast(`נבדקו ${totalChecked} מספרים: ${totalValid} תקינים · ${totalInvalid} ללא WhatsApp`, "success");
        reload();
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "בדיקת המספרים נכשלה", "error");
    } finally {
      setCheckingPhones(false);
    }
  }, [checkingPhones, selectedIds, toast, reload]);

  const handleExport = useCallback(() => {
    exportToExcel(statusFilter ? holders.filter((h) => h.status === statusFilter) : holders, columns);
    toast("הקובץ יוצא בהצלחה", "success");
  }, [holders, columns, statusFilter, toast]);

  const filteredHolders = useMemo(() => {
    let result = holders;
    if (sourceFilter === "current") result = result.filter(isCurrentOwner);
    if (sourceFilter === "2015") result = result.filter((h) => !isCurrentOwner(h));
    if (statusFilter) result = result.filter((h) => h.status === statusFilter);
    if (phoneFilter === "missing") result = result.filter((h) => h.phone.trim() === "");
    if (phoneFilter === "has") result = result.filter((h) => h.phone.trim() !== "");
    return result;
  }, [holders, statusFilter, phoneFilter, sourceFilter]);

  const selectedHolders = useMemo(() => holders.filter((h) => selectedIds.includes(h.id)), [holders, selectedIds]);

  // רשימת המובייל מסננת גם לפי החיפוש (בדסקטופ AG Grid עושה זאת עם quickFilter)
  const mobileHolders = useMemo(() => {
    const q = search.trim().replace(/\s+/g, " ").toLowerCase();
    if (!q) return filteredHolders;
    return filteredHolders.filter((h) => {
      const hay = `${h.name} ${h.phone} ${h.notes}`.toLowerCase();
      return hay.includes(q);
    });
  }, [filteredHolders, search]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  async function handleLogout() {
    await api.logout().catch(() => {});
    router.push("/login");
    router.refresh();
  }

  // מובייל: הדף גולל טבעית (dvh — מתחשב בסרגל הכתובת של iOS); דסקטופ: מסך נעול והטבלה ממלאת
  return (
    <div className="app-canvas flex flex-col min-h-[100dvh] md:h-screen md:min-h-0 overflow-x-clip">
      <Toolbar
        holders={holders}
        search={search}
        onSearch={setSearch}
        selectedCount={selectedIds.length}
        saveState={saveState}
        waState={waState}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        phoneFilter={phoneFilter}
        onPhoneFilter={setPhoneFilter}
        sourceFilter={sourceFilter}
        onSourceFilter={setSourceFilter}
        onImport={() => setShowImport(true)}
        onExport={handleExport}
        onAddRow={handleAddRow}
        onAddColumn={() => setShowAddColumn(true)}
        onBulkSend={() => setShowBulk(true)}
        onGroup={() => setShowGroup(true)}
        onTemplates={() => setShowTemplates(true)}
        onSettings={() => setShowSettings(true)}
        onCheckPhones={handleCheckPhones}
        onSigners={() => setShowSigners(true)}
        onSync={handleSync}
        onLogout={handleLogout}
      />

      {selectedIds.length > 0 && (
        <div className="bg-brand-600 text-white px-5 py-2 text-sm flex items-center gap-4 animate-fade-in">
          <span className="font-semibold">{selectedIds.length} שורות נבחרו</span>
          <button onClick={() => setShowBulk(true)} className="hover:underline flex items-center gap-1">💬 שלח WhatsApp</button>
          <button onClick={() => setShowGroup(true)} className="hover:underline flex items-center gap-1">👥 הוסף לקבוצה</button>
          <button onClick={handleDeleteSelected} className="hover:underline flex items-center gap-1 text-white/90">🗑️ מחק</button>
          <button onClick={() => { gridApiRef.current?.deselectAll(); }} className="mr-auto text-white/70 hover:text-white text-xs">בטל בחירה ✕</button>
        </div>
      )}

      <div className="flex-1 px-4 pb-4 pt-2 md:overflow-hidden flex flex-col">
        {/* בקרת תצוגה — זום ורווח עמודות (רלוונטי לטבלת הדסקטופ בלבד) */}
        {!loading && holders.length > 0 && (
          <div className="flex items-center justify-between pb-2 flex-wrap gap-2">
            <div className="hidden md:block">
              <ViewControls
                zoom={gridZoom}
                pad={gridPad}
                font={gridFont}
                onZoom={handleZoom}
                onPad={handlePad}
                onFont={handleFont}
                onReset={handleViewReset}
              />
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-2">
              מציג {filteredHolders.length} מתוך {holders.length}
              {(statusFilter || phoneFilter || sourceFilter !== "current" || search) && (
                <button
                  onClick={() => {
                    setStatusFilter("");
                    setPhoneFilter("");
                    setSourceFilter("current");
                    setSearch("");
                  }}
                  className="text-brand-600 hover:text-brand-800 font-semibold bg-brand-50 hover:bg-brand-100 rounded-full px-2.5 py-0.5 transition-colors"
                  title="ניקוי כל הסינונים והחיפוש"
                >
                  ✕ נקה סינון
                </button>
              )}
            </span>
          </div>
        )}
        {loading ? (
          <div className="flex-1 min-h-0"><GridSkeleton /></div>
        ) : holders.length === 0 ? (
          <div className="card flex-1 min-h-[60dvh]">
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
          <>
            {/* מובייל: רשימת כרטיסים בגלילת דף אחת — בלי גלילה פנימית מקוננת */}
            <div className="md:hidden">
              <MobileList
                holders={mobileHolders}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onOpenContact={setContactHolder}
              />
            </div>
            {/* דסקטופ: הטבלה המלאה ממלאת את שארית המסך */}
            <div className="hidden md:block flex-1 min-h-0">
              <DataGrid
                holders={filteredHolders}
                columns={columns}
                quickFilter={search}
                zoom={gridZoom}
                cellPad={gridPad}
                fontScale={gridFont}
                selectedIds={selectedIds}
                onCellChange={handleCellChange}
                onSelectionChange={setSelectedIds}
                onOpenContact={setContactHolder}
                onSendWhatsApp={setContactHolder}
                onColumnMoved={handleColumnMoved}
                onGridApi={(a) => (gridApiRef.current = a)}
              />
            </div>
          </>
        )}
      </div>

      {/* מובייל: סרגל פעולה צף כשיש נבחרים — שליחה/קבוצה בלי לגלול חזרה למעלה */}
      {selectedIds.length > 0 && (
        <div className="md:hidden fixed bottom-3 inset-x-3 z-30 card shadow-pop px-3 py-2.5 flex items-center gap-2 animate-pop-in">
          <span className="text-sm font-bold text-slate-700 tabular-nums">{selectedIds.length} נבחרו</span>
          <button
            onClick={() => setSelectedIds([])}
            className="text-xs text-slate-400 hover:text-slate-600"
            title="ניקוי בחירה"
          >
            נקה
          </button>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" icon="👥" onClick={() => setShowGroup(true)}>קבוצה</Button>
          <Button variant="whatsapp" size="sm" icon="💬" onClick={() => setShowBulk(true)}>
            שליחה ({selectedIds.length})
          </Button>
        </div>
      )}

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
      {showBulk && (
        <BulkSendDialog
          holders={selectedHolders}
          apiReady={!!(waState?.configured && waState.state === "authorized")}
          onClose={() => setShowBulk(false)}
          onDone={reload}
        />
      )}
      {showGroup && <GroupDialog holders={selectedHolders} onClose={() => setShowGroup(false)} onDone={reload} />}
      {showTemplates && <TemplatesDialog onClose={() => setShowTemplates(false)} onChange={() => {}} />}
      {showSettings && (
        <SettingsDialog
          onClose={() => setShowSettings(false)}
          onSaved={() => api.whatsappStatus().then(setWaState).catch(() => {})}
        />
      )}
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
