// src/pages/ReceiveHistory.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { listReceipts } from "../lib/api";

// ===============================================
// Day6 – ประวัติรายการ MockUI v1.1 (เวอร์ชันปรับสีแท็บ)
// ===============================================

// ---------- Types ----------
export type TabType = "in" | "return" | "consume";
export type TxKind = "in" | "borrow" | "return" | "consume";

type ReasonType = "broken" | "lost" | "other";

export type TxItem = {
  id: string;
  kind: TxKind;
  date: string; // YYYY-MM-DD
  name: string;
  qty: number;
  unit: string;
  images: string[]; // อนุญาต [] ได้
  actor: string;
  refId?: string;
  borrowedQty?: number;
  returnedQty?: number;
  reason?: string;
  closedAsConsume?: boolean;
};

// ---------- Tab Colors/Labels ----------
const TAB_ACTIVE: Record<"in" | "return" | "consume", string> = {
  in: "bg-emerald-500 text-white border-emerald-500",
  return: "bg-amber-400 text-black border-amber-400",
  consume: "bg-rose-500 text-white border-rose-500",
};
const TAB_INACTIVE: Record<"in" | "return" | "consume", string> = {
  in: "border-emerald-200 text-emerald-700",
  return: "border-amber-200 text-amber-700",
  consume: "border-rose-200 text-rose-700",
};
const TAB_LABEL: Record<"in" | "return" | "consume", string> = {
  in: "รับเข้า",
  return: "เบิกคืน",
  consume: "เบิกจำหน่าย",
};

// ---------- Mock Data ----------
const MOCK_ITEMS_INIT: TxItem[] = [
  // รับเข้า
  {
    id: "IN-20251109-001",
    kind: "in",
    date: "2025-11-09",
    name: "สายไฟ 2x2.5mm 90m (A)",
    qty: 10,
    unit: "ม้วน",
    images: [
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=600&auto=format&fit=crop",
    ],
    actor: "แอดมิน",
  },
  {
    id: "IN-20251108-002",
    kind: "in",
    date: "2025-11-08",
    name: "ท่อพีวีซี 1 นิ้ว x 1.5m",
    qty: 5,
    unit: "เส้น",
    images: [],
    actor: "เสมียน",
  },

  // เบิกเพื่อใช้งาน
  {
    id: "BR-20251109-101",
    kind: "borrow",
    date: "2025-11-09",
    name: "สายไฟ 2x2.5mm 90m (A)",
    qty: 6,
    unit: "ม้วน",
    images: [
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=600&auto=format&fit=crop",
    ],
    actor: "ช่างหนึ่ง",
    borrowedQty: 6,
    returnedQty: 0,
  },
  {
    id: "BR-20251108-102",
    kind: "borrow",
    date: "2025-11-08",
    name: "ท่อพีวีซี 1 นิ้ว x 1.5m",
    qty: 2,
    unit: "เส้น",
    images: [],
    actor: "ช่างสอง",
    borrowedQty: 2,
    returnedQty: 1,
  },
  {
    id: "BR-20251109-103",
    kind: "borrow",
    date: "2025-11-09",
    name: "สายไฟ 2x2.5mm 90m (A)",
    qty: 3,
    unit: "ม้วน",
    images: [
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=600&auto=format&fit=crop",
    ],
    actor: "ช่างสี่",
    borrowedQty: 3,
    returnedQty: 0,
    closedAsConsume: true,
  },

  // เบิกจำหน่าย
  {
    id: "CM-20251106-201",
    kind: "consume",
    date: "2025-11-06",
    name: "สายไฟ 2x1.5mm 90m",
    qty: 1,
    unit: "ม้วน",
    images: [
      "https://images.unsplash.com/photo-1581093458791-9d09ec60cf2a?q=80&w=600&auto=format&fit=crop",
    ],
    actor: "ช่างสาม",
    reason: "ใช้ต่อโครงการ",
  },

  // ประวัติคืน
  {
    id: "RT-20251108-301",
    kind: "return",
    refId: "BR-20251108-102",
    date: "2025-11-08",
    name: "ท่อพีวีซี 1 นิ้ว x 1.5m",
    qty: 1,
    unit: "เส้น",
    images: [],
    actor: "ช่างสอง",
    reason: "คืนตามที่เหลือ",
  },
];

// ---------- UI helpers ----------
function Tag({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${className}`}
    >
      {children}
    </span>
  );
}
function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="px-3 py-2 rounded-xl border text-sm hover:shadow-sm active:scale-[.99]"
    >
      {children}
    </button>
  );
}
function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
function Drawer({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white border-l shadow-xl"
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
        >
          <div className="h-full flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <div className="font-semibold">{title || "รายละเอียด"}</div>
              <button
                onClick={onClose}
                className="text-sm px-2 py-1 rounded-md border"
              >
                ปิด
              </button>
            </div>
            <div className="p-3 overflow-auto flex-1">{children}</div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ---------- Logic helpers ----------
function outstandingQty(item: TxItem) {
  if (item.kind !== "borrow") return 0;
  if (item.closedAsConsume) return 0;
  const b = item.borrowedQty ?? item.qty;
  const r = item.returnedQty ?? 0;
  return Math.max(0, b - r);
}
function filterByTab(items: TxItem[], tab: TabType, q: string) {
  const qLower = q.trim().toLowerCase();
  const byName = (it: TxItem) =>
    qLower ? it.name.toLowerCase().includes(qLower) : true;
  if (tab === "in") return items.filter((it) => it.kind === "in" && byName(it));
  if (tab === "consume")
    return items.filter((it) => it.kind === "consume" && byName(it));
  const returns = items.filter((it) => it.kind === "return" && byName(it));
  const borrows = items.filter(
    (it) => it.kind === "borrow" && outstandingQty(it) > 0 && byName(it)
  );
  return { returns, borrows } as const;
}
function buildTimeline(items: TxItem[], name: string) {
  return items
    .filter((i) => i.name === name)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}
function summarizeByName(all: TxItem[], name: string) {
  const byName = all.filter((i) => i.name === name);
  const borrowedTotal = byName
    .filter((i) => i.kind === "borrow")
    .reduce((s, i) => s + (i.borrowedQty ?? i.qty), 0);
  const returnedTotal = byName
    .filter((i) => i.kind === "return")
    .reduce((s, i) => s + i.qty, 0);
  const shortage = Math.max(0, borrowedTotal - returnedTotal);
  return { borrowedTotal, returnedTotal, shortage };
}

// --- Type guard สำหรับแท็บ "เบิกคืน" ---
type ReturnTab = { returns: TxItem[]; borrows: TxItem[] };
const isReturnTab = (x: TxItem[] | ReturnTab): x is ReturnTab =>
  (x as ReturnTab).returns !== undefined &&
  (x as ReturnTab).borrows !== undefined;

// ===============================================
// Component
// ===============================================
export default function ReceiveHistoryPage() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<TabType>("return");
  const [items, setItems] = useState<TxItem[]>(MOCK_ITEMS_INIT);

  // ==== รับเข้าจาก API (Day6.1) ====
  const [loadingIn, setLoadingIn] = useState(false);
  const [errorIn, setErrorIn] = useState<string | null>(null);
  const [pageIn, setPageIn] = useState(1);
  const [hasMoreIn, setHasMoreIn] = useState(false);
  const [itemsIn, setItemsIn] = useState<TxItem[]>([]);

  // debounce คำค้น
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (active !== "in") return; // ดึงเฉพาะแท็บ "รับเข้า"
    let alive = true;
    (async () => {
      setLoadingIn(true);
      setErrorIn(null);
      try {
        const { items, total, limit } = await listReceipts({
          search: qDebounced,
          page: pageIn,
          limit: 20,
        });
        const mapped: TxItem[] = items.map((x: any) => ({
          id: x.id,
          kind: "in",
          date: x.date,
          name: x.name,
          qty: Number(x.qty ?? 0),
          unit: String(x.unit ?? ""),
          images: Array.isArray(x.images) ? x.images : [],
          actor: String(x.actor ?? ""),
        }));
        if (!alive) return;
        setItemsIn((prev) =>
          pageIn === 1 ? mapped : [...prev, ...mapped]
        );
        setHasMoreIn(pageIn * limit < total);
      } catch (err: any) {
        if (!alive) return;
        setErrorIn(err?.message || "load error");
      } finally {
        if (alive) setLoadingIn(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [active, qDebounced, pageIn]);

  useEffect(() => {
    if (active === "in") setPageIn(1);
  }, [qDebounced, active]);

  // preview & return modal
  const [preview, setPreview] = useState<string | null>(null);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTarget, setReturnTarget] = useState<TxItem | null>(null);
  const [returnQty, setReturnQty] = useState<string>("");
  const [returnReasonType, setReturnReasonType] =
    useState<ReasonType>("lost");
  const [returnReasonOther, setReturnReasonOther] = useState<string>("");
  const [closeBorrowAsConsume, setCloseBorrowAsConsume] =
    useState<boolean>(true);
  const [returnError, setReturnError] = useState<string>("");

  // side panel (timeline)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailName, setDetailName] = useState<string>("");

  const filtered = useMemo(
    () => filterByTab(items, active, q),
    [items, active, q]
  );

  // ---------- Tests (dev only) ----------
  useEffect(() => {
    if (import.meta.env.MODE === "production") return;
    const ret = filterByTab(items, "return", "");
    if (isReturnTab(ret)) {
      console.assert(
        Array.isArray(ret.returns) && Array.isArray(ret.borrows),
        "[TEST] return shape ok"
      );
    }
    const s = summarizeByName(items, "ท่อพีวีซี 1 นิ้ว x 1.5m");
    console.assert(
      s.borrowedTotal >= s.returnedTotal,
      "[TEST] shortage ≥ 0"
    );
  }, [items]);

  // ---------- Return flow ----------
  const validateReturn = useCallback(
    (maxOutstanding: number, qty: number, willCloseAsConsume: boolean) => {
      if (!Number.isFinite(qty) || qty < 0)
        return "กรอกจำนวนคืนให้ถูกต้อง";
      if (qty === 0) {
        if (maxOutstanding <= 0) return "ไม่มีของค้างคืนแล้ว";
        if (!willCloseAsConsume)
          return "หากคืน 0 ต้องเลือกปิดงานค้าง (ตัดจำหน่าย)";
        return true;
      }
      if (qty > maxOutstanding) return "จำนวนคืนเกินที่ค้างอยู่";
      return true;
    },
    []
  );

  function openReturnModal(target?: TxItem | null) {
    if (!target) return;
    const out = outstandingQty(target);
    setReturnTarget(target);
    setReturnQty(String(out > 0 ? out : "0"));
    setReturnReasonType("lost");
    setReturnReasonOther("");
    setCloseBorrowAsConsume(true);
    setReturnError("");
    setReturnOpen(true);
  }

  function submitReturn() {
    if (!returnTarget) return;
    const maxOut = outstandingQty(returnTarget);
    const qty = Number(returnQty);
    const valid = validateReturn(maxOut, qty, closeBorrowAsConsume);
    if (valid !== true) {
      setReturnError(String(valid));
      return;
    }

    const reasonComposed =
      returnReasonType === "other"
        ? returnReasonOther.trim() || "เหตุผลอื่น"
        : returnReasonType === "broken"
        ? "พัง/ชำรุด"
        : "หาย/สูญหาย";

    setItems((prev) => {
      const next = [...prev];

      // 1) update borrow
      const idx = next.findIndex((i) => i.id === returnTarget.id);
      if (idx !== -1) {
        const t = { ...next[idx] } as TxItem;
        const b = t.borrowedQty ?? t.qty;
        const r = (t.returnedQty ?? 0) + qty;
        t.returnedQty = Math.min(r, b);
        next[idx] = t;
      }

      // 2) add return tx
      next.unshift({
        id: `RT-${Date.now()}`,
        kind: "return",
        refId: returnTarget.id,
        date: new Date().toISOString().slice(0, 10),
        name: returnTarget.name,
        qty,
        unit: returnTarget.unit,
        images: returnTarget.images,
        actor: "ผู้ใช้ระบบ",
        reason: qty === maxOut ? undefined : reasonComposed,
      });

      // 3) close as consume for the remaining
      const remaining = Math.max(0, maxOut - qty);
      if (remaining > 0 && closeBorrowAsConsume) {
        const idx2 = next.findIndex((i) => i.id === returnTarget.id);
        if (idx2 !== -1) {
          const t2 = { ...next[idx2] } as TxItem;
          const b2 = t2.borrowedQty ?? t2.qty;
          t2.returnedQty = Math.min(
            (t2.returnedQty ?? 0) + remaining,
            b2
          );
          next[idx2] = t2;
        }
        next.unshift({
          id: `CM-${Date.now()}`,
          kind: "consume",
          date: new Date().toISOString().slice(0, 10),
          name: returnTarget.name,
          qty: remaining,
          unit: returnTarget.unit,
          images: returnTarget.images,
          actor: "ระบบ",
          reason: reasonComposed,
        });
      }

      return next;
    });

    setReturnOpen(false);
  }

  // ---------- Rows ----------
  function RowThumb({ it }: { it: TxItem }) {
    return (
      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 grid place-items-center">
        {it?.images?.length ? (
          <img
            src={it.images[0]}
            alt="thumb"
            className="w-full h-full object-cover cursor-zoom-in"
            onClick={() => setPreview(it.images[0])}
          />
        ) : (
          <span className="text-xs text-gray-400">ไม่มีรูป</span>
        )}
      </div>
    );
  }

  function RowSimple({
    it,
    right,
  }: {
    it: TxItem;
    right?: React.ReactNode;
  }) {
    return (
      <li className="rounded-2xl border bg-white px-3 py-2">
        <div className="flex items-center gap-3">
          <RowThumb it={it} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500">{it.date}</div>
            <div className="font-medium truncate">{it.name}</div>
            <div className="text-sm text-gray-700">
              {it.kind === "in"
                ? `รับเข้า ${it.qty.toLocaleString()} ${it.unit}`
                : it.kind === "consume"
                ? `เบิกจำหน่าย ${it.qty.toLocaleString()} ${
                    it.unit
                  }${it.reason ? ` · เหตุผล: ${it.reason}` : ""}`
                : it.kind === "borrow"
                ? `เบิกเพื่อใช้งาน ${it.qty.toLocaleString()} ${it.unit}`
                : `คืน ${it.qty.toLocaleString()} ${
                    it.unit
                  }${it.reason ? ` · เหตุผล: ${it.reason}` : ""}`}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              โดย {it.actor}
            </div>
          </div>
          <div className="flex items-center gap-2">{right}</div>
        </div>
      </li>
    );
  }

  // ค้างคืน (แบบย่อ)
  function RowBorrowOutstanding({ it }: { it: TxItem }) {
    if (!it || typeof it !== "object") return null;
    return (
      <RowSimple
        it={{ ...it, kind: it.kind }}
        right={
          <ToolbarButton
            title="คืนสินค้า"
            onClick={() => openReturnModal(it)}
          >
            คืนสินค้า
          </ToolbarButton>
        }
      />
    );
  }

  // สรุปต่อชื่อ (สำหรับ "ประวัติคืน")
  function RowReturnSummary({
    name,
    sample,
  }: {
    name: string;
    sample: TxItem;
  }) {
    const s = summarizeByName(items, name);
    return (
      <li className="rounded-2xl border bg-white px-3 py-2">
        <div className="flex items-center gap-3">
          <RowThumb it={sample} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-500">{sample.date}</div>
            <div className="font-medium truncate">{name}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              <Tag>เบิก {s.borrowedTotal.toLocaleString()}</Tag>
              <Tag>คืน {s.returnedTotal.toLocaleString()}</Tag>
              {s.shortage > 0 && (
                <Tag className="bg-rose-50 text-rose-700 border-rose-200">
                  ขาด {s.shortage.toLocaleString()}
                </Tag>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ToolbarButton
              title="รายละเอียด"
              onClick={() => {
                setDetailName(name);
                setDetailOpen(true);
              }}
            >
              รายละเอียด
            </ToolbarButton>
          </div>
        </div>
      </li>
    );
  }

  // ---------- Memo / Utils ----------
  const timeline = useMemo(
    () => (detailName ? buildTimeline(items, detailName) : []),
    [items, detailName]
  );

  const returnNames = useMemo(() => {
    const fr = filterByTab(items, "return", q);
    if (!isReturnTab(fr)) return [];
    const seen = new Set<string>();
    const names: string[] = [];
    for (const r of fr.returns) {
      if (!seen.has(r.name)) {
        seen.add(r.name);
        names.push(r.name);
      }
    }
    return names;
  }, [items, q]);

  // ---------- Render ----------
  return (
    <>
      {/* เนื้อหาหลักในหน้า (ให้ MainLayout เป็นคนครอบ card) */}
      <div className="space-y-4">
        {/* Search + Tabs */}
        <section className="space-y-3 mb-4">
          <input
            value={q}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQ(e.target.value)
            }
            placeholder="ค้นหาชื่อของ..."
            className="w-full rounded-2xl border px-4 py-2 outline-none focus:ring-2"
          />
          <div className="inline-flex items-center gap-2 rounded-2xl border p-1 bg-white">
            {(["in", "return", "consume"] as TabType[]).map((t) => {
              const isActive = active === t;
              return (
                <button
                  key={t}
                  onClick={() => setActive(t)}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${
                    isActive ? TAB_ACTIVE[t] : TAB_INACTIVE[t]
                  }`}
                >
                  {TAB_LABEL[t]}
                </button>
              );
            })}
          </div>
        </section>

        {/* Content by tab */}
        {active === "in" && (
          <section>
            <div className="text-sm font-semibold mb-2">ผลลัพธ์รับเข้า</div>

            {loadingIn && (
              <div className="text-sm text-gray-500">กำลังโหลด...</div>
            )}
            {!!errorIn && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {errorIn}
              </div>
            )}
            {!loadingIn && !errorIn && itemsIn.length === 0 && (
              <div className="text-sm text-gray-500">ไม่พบข้อมูล</div>
            )}

            <ul className="space-y-2">
              {itemsIn.map((it) => (
                <li
                  key={it.id}
                  className="rounded-2xl border bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <RowThumb it={it} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">{it.date}</div>
                      <div className="font-medium truncate">{it.name}</div>
                      <div className="text-sm text-gray-700">
                        รับเข้า {it.qty.toLocaleString()} {it.unit}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        โดย {it.actor}
                      </div>
                    </div>
                    <ToolbarButton
                      title="รายละเอียด"
                      onClick={() => {
                        setDetailName(it.name);
                        setDetailOpen(true);
                      }}
                    >
                      รายละเอียด
                    </ToolbarButton>
                  </div>
                </li>
              ))}
            </ul>

            {!loadingIn && !errorIn && hasMoreIn && (
              <div className="mt-3">
                <ToolbarButton onClick={() => setPageIn((p) => p + 1)}>
                  โหลดเพิ่ม
                </ToolbarButton>
              </div>
            )}
          </section>
        )}

        {active === "consume" && (
          <section>
            <div className="text-sm font-semibold mb-2">
              ผลลัพธ์เบิกจำหน่าย
            </div>
            <ul className="space-y-2">
              {(filtered as TxItem[]).map((it) => (
                <li
                  key={it.id}
                  className="rounded-2xl border bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <RowThumb it={it} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">
                        {it.date}
                      </div>
                      <div className="font-medium truncate">
                        {it.name}
                      </div>
                      <div className="text-sm text-gray-700">
                        เบิกจำหน่าย {it.qty.toLocaleString()} {it.unit}
                        {it.reason ? ` · เหตุผล: ${it.reason}` : ""}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        โดย {it.actor}
                      </div>
                    </div>
                    <ToolbarButton
                      title="รายละเอียด"
                      onClick={() => {
                        setDetailName(it.name);
                        setDetailOpen(true);
                      }}
                    >
                      รายละเอียด
                    </ToolbarButton>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {active === "return" && (
          <>
            {/* ค้างคืน */}
            <section className="mb-4">
              <div className="text-sm font-semibold mb-2">ค้างคืน</div>
              <ul className="space-y-2">
                {isReturnTab(filtered) &&
                  filtered.borrows.map((it) => (
                    <RowBorrowOutstanding key={it.id} it={it} />
                  ))}
              </ul>
            </section>

            {/* ประวัติคืน */}
            <section>
              <div className="text-sm font-semibold mb-2">ประวัติคืน</div>
              <ul className="space-y-2">
                {returnNames.map((name) => {
                  const fr = filterByTab(items, "return", q);
                  const sample = isReturnTab(fr)
                    ? fr.returns.find((r) => r.name === name)
                    : undefined;
                  if (!sample) return null;
                  return (
                    <RowReturnSummary
                      key={name}
                      name={name}
                      sample={sample}
                    />
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>

      {/* Image Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)}>
        {preview && (
          <img
            src={preview}
            alt="preview"
            className="w-full h-auto rounded-xl"
          />
        )}
      </Modal>

      {/* Return Modal */}
      <Modal open={returnOpen} onClose={() => setReturnOpen(false)}>
        {returnTarget && (
          <div className="space-y-3">
            <div className="text-lg font-semibold">คืนสินค้า</div>
            <div className="text-sm text-gray-600">
              {returnTarget.name}
            </div>
            <div className="text-sm">
              ค้างคืนทั้งหมด:{" "}
              <b>{returnTarget.borrowedQty ?? returnTarget.qty}</b>{" "}
              {returnTarget.unit} · ค้างอยู่:{" "}
              <b>{outstandingQty(returnTarget)}</b> {returnTarget.unit} ·
              คืนแล้ว: <b>{returnTarget.returnedQty ?? 0}</b>{" "}
              {returnTarget.unit}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm">
                จำนวนที่จะคืน
                <input
                  value={returnQty}
                  onChange={(e) => setReturnQty(e.target.value)}
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                />
              </label>

              {Number(returnQty) < outstandingQty(returnTarget) && (
                <label className="text-sm">
                  เหตุผล (เลือกสาเหตุหลัก)
                  <div className="mt-1 flex flex-col gap-2">
                    <select
                      value={returnReasonType}
                      onChange={(e) =>
                        setReturnReasonType(
                          e.target.value as ReasonType
                        )
                      }
                      className="w-full rounded-xl border px-3 py-2"
                    >
                      <option value="lost">หาย / สูญหาย</option>
                      <option value="broken">พัง / ชำรุด</option>
                      <option value="other">
                        อื่นๆ (พิมพ์รายละเอียด)
                      </option>
                    </select>
                    {returnReasonType === "other" && (
                      <input
                        value={returnReasonOther}
                        onChange={(e) =>
                          setReturnReasonOther(e.target.value)
                        }
                        placeholder="ระบุเหตุผลอื่นๆ"
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    )}
                  </div>
                </label>
              )}

              {Number(returnQty) === 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={closeBorrowAsConsume}
                    onChange={(e) =>
                      setCloseBorrowAsConsume(e.target.checked)
                    }
                  />
                  ปิดงานค้าง และตัดส่วนที่เหลือเป็น "เบิกจำหน่าย"
                </label>
              )}
            </div>

            {returnError && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {returnError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <ToolbarButton onClick={() => setReturnOpen(false)}>
                ยกเลิก
              </ToolbarButton>
              <ToolbarButton onClick={submitReturn}>
                บันทึกการคืน
              </ToolbarButton>
            </div>
          </div>
        )}
      </Modal>

      {/* Timeline Drawer */}
      <Drawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`รายละเอียด: ${detailName || ""}`}
      >
        {!detailName ? (
          <div className="text-sm text-gray-500">ยังไม่เลือกรายการ</div>
        ) : (
          <ul className="space-y-2">
            {timeline.map((t) => (
              <li key={t.id} className="rounded-xl border p-2">
                <div className="text-xs text-gray-500">
                  {t.date} · โดย {t.actor}
                </div>
                <div className="text-sm">
                  {t.kind === "in" && (
                    <>
                      รับเข้า {t.qty.toLocaleString()} {t.unit}
                    </>
                  )}
                  {t.kind === "borrow" && (
                    <>
                      เบิกเพื่อใช้งาน {t.qty.toLocaleString()} {t.unit}
                    </>
                  )}
                  {t.kind === "return" && (
                    <>
                      คืน {t.qty.toLocaleString()} {t.unit}
                      {t.reason ? ` · เหตุผล: ${t.reason}` : ""}
                    </>
                  )}
                  {t.kind === "consume" && (
                    <>
                      เบิกจำหน่าย {t.qty.toLocaleString()} {t.unit}
                      {t.reason ? ` · เหตุผล: ${t.reason}` : ""}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
    </>
  );
}
