export const API_URL =
  "https://script.google.com/macros/s/AKfycbzSY-xrX_eK_sfz4d_mCFls2q7VRKocTl0qmujDWAc2GMgm6q2ftPCrkYCQdNAu42R3lg/exec";
const SCRIPT_URL = import.meta.env.VITE_API_URL || API_URL;
const API_KEY = import.meta.env.VITE_API_KEY || "tmango_Inv_2025_abc123xyz";


if (!SCRIPT_URL || !API_KEY) {
  console.error('ENV missing: VITE_API_URL or VITE_API_KEY');
}

export async function uploadReceive(payload: any) {
  const body = new URLSearchParams();
  body.set('api_key', API_KEY);
  // ส่ง JSON ตรง ๆ ให้ URLSearchParams encode เอง
  body.set('payload', JSON.stringify(payload));

  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: body.toString(),
  });

  // เผื่อกรณี GAS ตอบ error page ให้ลองอ่าน text เพื่อ debug
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: 'Invalid JSON response', raw: text };
  }
}

// src/lib/api.ts
export type ListReceiptsParams = { search?: string; page?: number; limit?: number };

export async function listReceipts({ search = "", page = 1, limit = 20 }: ListReceiptsParams) {
  const base = API_URL; // Use the new bound script URL
  const qs = new URLSearchParams({
    action: "listreceipts",
    search,
    page: String(page),
    limit: String(limit),
  });
  const res = await fetch(`${base}?${qs.toString()}`, { method: "GET" });
  if (!res.ok) throw new Error(`Network ${res.status}`);
  // expected shape: { items, total, page, limit }
  return res.json() as Promise<{ items: any[]; total: number; page: number; limit: number }>;
}

// type ให้ตรงกับที่ OutHistory.tsx ใช้
// ใช้ร่วมกับหน้า OutHistory.tsx
export type OutHistoryRow = {
  out_id: string;
  date: string;
  item_name: string;
  qty: number | string;
  unit: string;
  zone: string;
  channel: string;
  remark?: string;
  images: string[];
};


// ฟังก์ชันดึงประวัติเบิกจาก Apps Script
export async function getOutHistory(): Promise<OutHistoryRow[]> {
  const res = await fetch(`${SCRIPT_URL}?api_key=${API_KEY}`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'OUT_HISTORY',
    }),
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error('OUT_HISTORY raw response:', text);
    throw new Error('API ตอบกลับไม่ใช่ JSON');
  }

  if (!data.ok) {
    throw new Error(data.error || 'โหลดประวัติเบิกไม่สำเร็จ');
  }

  if (!Array.isArray(data.items)) {
    console.warn('OUT_HISTORY: data.items ไม่ใช่ array:', data);
    return [];
  }

  return data.items as OutHistoryRow[];
}


// =========================
// OUT (เบิกสินค้า)
// =========================

export interface OutFormPayload {
  itemName: string;
  qty: number;
  unit: string;
  zone: string;
  channel: string;
  requestBy: string;
  remark: string;
  images?: string;
  type: 'consume' | 'borrow'; // เพิ่ม type
}

export async function createOut(payload: OutFormPayload) {
  const res = await fetch(`${SCRIPT_URL}?api_key=${API_KEY}`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'OUT_CREATE',
      ...payload,
    }),
  });

  const text = await res.text();
  let data: any;

  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Response from server:", text);
    throw new Error("API ตอบไม่ใช่ JSON");
  }

  if (!data.ok) {
    throw new Error(data.error || "ไม่สามารถบันทึกการเบิกได้");
  }

  return data as { ok: true; outId: string; message: string };
}

// =========================
// BORROW / RETURN
// =========================

export type BorrowedItem = {
  outId: string;
  date: string;
  itemName: string;
  qtyKey: number; // จำนวนที่ยืมทั้งหมด
  qtyReturned: number; // คืนแล้ว
  qtyLost: number; // เสีย/หาย
  qtyLeft: number; // คงเหลือที่ต้องคืน
  requestBy: string;
  remark: string;
};

export async function getBorrowedList() {
  const res = await fetch(`${SCRIPT_URL}?api_key=${API_KEY}`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'LIST_BORROWED',
    }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Failed to fetch borrowed list');
  return json.items as BorrowedItem[];
}

export async function returnItem(payload: {
  outId: string;
  returnQty: number;
  lostQty: number;
  reason?: string;
}) {
  const res = await fetch(`${SCRIPT_URL}?api_key=${API_KEY}`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'RETURN_ITEM',
      ...payload,
    }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'Failed to return item');
  return json;
}

// ดึงข้อมูลสต็อกคงเหลือจาก GAS (Day 8)
// =========================
// STOCK SUMMARY (Day 8)
// =========================

export type StockRow = {
  ITEM_NAME: string;
  UNIT: string;
  TOTAL_IN: number;
  TOTAL_OUT: number;
  BALANCE: number;
  LAST_IN_DATE: string | null;
  LAST_OUT_DATE: string | null;
  ZONE?: string;
  CHANNEL?: string;
};

export async function fetchStockSummary(): Promise<StockRow[]> {
  // ❗ ใช้ SCRIPT_URL ไม่ใช่ API_KEY
  const url = `${SCRIPT_URL}?action=stocksummary`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`โหลดข้อมูลสต็อกไม่สำเร็จ (${res.status})`);
  }

  const json = await res.json();

  if (!json.ok) {
    throw new Error(json.error || "เกิดข้อผิดพลาดจาก server");
  }

  return json.data as StockRow[];
}
