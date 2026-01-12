// src/pages/Stock.tsx

import { useState, useEffect } from 'react';
import { fetchStockSummary } from '../lib/api';
import { useNavigate } from 'react-router-dom';

type Row = {
  ITEM_NAME: string;
  UNIT: string;
  TOTAL_IN: number;
  TOTAL_OUT: number;
  BALANCE: number;
  LAST_IN_DATE: string | null;
  LAST_OUT_DATE: string | null;
};

export default function StockPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchStockSummary();

      // Simplify: Aggregate unique items (though view might already be unique per item if grouping by item only)
      // The current view 'fetchStockSummary' returns aggregated data by item_name from the view.
      // Assuming 'stock_summary' view groups by item_name.
      // If it groups by zone/channel as well, we need to aggregate here.
      // Inspecting api.ts: `fetchStockSummary` maps to `StockRow` which has ZONE/CHANNEL optional.
      // Wait, if the DB view splits by Zone, we get multiple rows per item.
      // We want ONE row per item with TOTAL balance.

      // Let's manually aggregate just in case the API returns split rows.
      const map = new Map<string, Row>();
      data.forEach((r: any) => {
        const existing = map.get(r.ITEM_NAME);
        if (existing) {
          existing.TOTAL_IN += r.TOTAL_IN;
          existing.TOTAL_OUT += r.TOTAL_OUT;
          existing.BALANCE += r.BALANCE;
          // Dates: keep latest?
        } else {
          map.set(r.ITEM_NAME, { ...r });
        }
      });

      const aggregated = Array.from(map.values());
      aggregated.sort((a, b) => b.BALANCE - a.BALANCE);
      setRows(aggregated);
    } catch (err: any) {
      alert(err.message || 'โหลดข้อมูลผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  const filtered = rows.filter((x) => {
    const kw = filter.toLowerCase();
    if (!kw) return true;
    return x.ITEM_NAME.toLowerCase().includes(kw);
  });

  return (
    <div className="space-y-4">
      {/* ช่องค้นหา */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-700">
          ค้นหาชื่อสินค้า (ดูรายละเอียดรายโซน ให้คลิกที่สินค้า)
        </label>
        <input
          className="border rounded-md px-3 py-2 w-full"
          placeholder="ค้นหา..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading && (
        <div className="text-sm text-gray-500">กำลังโหลด...</div>
      )}

      {/* ตาราง */}
      <div className="overflow-auto rounded-lg border">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-100 text-gray-700 text-sm">
            <tr>
              <th className="px-4 py-3 text-left">สินค้า</th>
              <th className="px-4 py-3 text-center">หน่วย</th>
              <th className="px-4 py-3 text-center">รับเข้าทั้งหมด</th>
              <th className="px-4 py-3 text-center">ออกทั้งหมด</th>
              <th className="px-4 py-3 text-center">คงเหลือรวม</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((x, idx) => (
              <tr
                key={idx}
                className="text-sm hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/search?q=${encodeURIComponent(x.ITEM_NAME)}`)}
                title="คลิกเพื่อดูรายละเอียดตำแหน่งเก็บ"
              >
                <td className="px-4 py-3 font-medium text-blue-600">{x.ITEM_NAME}</td>
                <td className="px-4 py-3 text-center text-gray-500">{x.UNIT}</td>
                <td className="px-4 py-3 text-center text-gray-500">{x.TOTAL_IN}</td>
                <td className="px-4 py-3 text-center text-gray-500">{x.TOTAL_OUT}</td>
                <td className={`px-4 py-3 text-center font-bold text-lg ${x.BALANCE <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {x.BALANCE}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && !loading && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-500"
                  colSpan={5}
                >
                  ไม่พบรายการ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
