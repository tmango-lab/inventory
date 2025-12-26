// src/pages/Stock.tsx

import { useState, useEffect } from 'react';
import { fetchStockSummary } from '../lib/api';

type Row = {
  ITEM_NAME: string;
  UNIT: string;
  TOTAL_IN: number;
  TOTAL_OUT: number;
  BALANCE: number;
  LAST_IN_DATE: string | null;
  LAST_OUT_DATE: string | null;
  ZONE?: string | null;
  CHANNEL?: string | null;
};

export default function StockPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchStockSummary();
      data.sort((a, b) => b.BALANCE - a.BALANCE);
      setRows(data);
    } catch (err: any) {
      alert(err.message || 'โหลดข้อมูลผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  const filtered = rows.filter((x) => {
    const kw = filter.toLowerCase();
    if (!kw) return true;
    return (
      x.ITEM_NAME.toLowerCase().includes(kw) ||
      (x.ZONE || '').toLowerCase().includes(kw) ||
      (x.CHANNEL || '').toLowerCase().includes(kw)
    );
  });

  return (
    <div className="space-y-4">
      {/* ช่องค้นหา */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-700">
          ค้นหา ชื่อสินค้า / โซน / ช่อง
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
      <div className="overflow-auto">
        <table className="min-w-full border mt-2 bg-white">
          <thead className="bg-gray-100 text-gray-700 text-sm">
            <tr>
              <th className="border px-3 py-2 text-left">สินค้า</th>
              <th className="border px-3 py-2 text-center">โซน</th>
              <th className="border px-3 py-2 text-center">ช่อง</th>
              <th className="border px-3 py-2">หน่วย</th>
              <th className="border px-3 py-2">รับเข้า</th>
              <th className="border px-3 py-2">เบิกออก</th>
              <th className="border px-3 py-2">คงเหลือ</th>
              <th className="border px-3 py-2">รับเข้าล่าสุด</th>
              <th className="border px-3 py-2">เบิกล่าสุด</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((x, idx) => (
              <tr key={idx} className="text-sm">
                <td className="border px-3 py-2">{x.ITEM_NAME}</td>
                <td className="border px-3 py-2 text-center">
                  {x.ZONE || '-'}
                </td>
                <td className="border px-3 py-2 text-center">
                  {x.CHANNEL || '-'}
                </td>
                <td className="border px-3 py-2 text-center">{x.UNIT}</td>
                <td className="border px-3 py-2 text-center">
                  {x.TOTAL_IN}
                </td>
                <td className="border px-3 py-2 text-center">
                  {x.TOTAL_OUT}
                </td>
                <td
                  className={`border px-3 py-2 text-center font-semibold ${x.BALANCE < 0 ? 'text-red-600' : 'text-green-700'
                    }`}
                >
                  {x.BALANCE}
                </td>
                <td className="border px-3 py-2 text-center">
                  {x.LAST_IN_DATE ? x.LAST_IN_DATE.slice(0, 10) : '-'}
                </td>
                <td className="border px-3 py-2 text-center">
                  {x.LAST_OUT_DATE ? x.LAST_OUT_DATE.slice(0, 10) : '-'}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && !loading && (
              <tr>
                <td
                  className="px-3 py-4 text-center text-gray-500"
                  colSpan={9}
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
