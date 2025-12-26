// src/pages/OutHistory.tsx
import React, { useEffect, useState } from 'react';
import { getOutHistory } from '../lib/api';

type OutHistoryRow = {
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

const OutHistory: React.FC = () => {
  const [raw, setRaw] = useState<OutHistoryRow[]>([]);
  const [filter, setFilter] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const r = (await getOutHistory()) as OutHistoryRow[];
    r.sort((a, b) => String(b.out_id).localeCompare(String(a.out_id)));
    setRaw(r);
  }

  const rows = raw.filter((x) =>
    x.item_name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* ช่องค้นหา */}
      <div className="flex flex-col gap-2">
        <label className="text-sm text-gray-700" htmlFor="search">
          ค้นหาชื่อสินค้า
        </label>
        <input
          id="search"
          className="border rounded-md px-3 py-2 w-full"
          placeholder="ค้นหาชื่อสินค้า..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* รายการประวัติ */}
      <div className="space-y-4">
        {rows.map((x) => (
          <div
            key={x.out_id}
            className="border rounded-lg shadow-sm px-4 py-3 bg-white"
          >
            <div className="font-semibold mb-1">
              {x.out_id} — {x.item_name}
            </div>

            <div className="text-sm text-gray-700 leading-relaxed">
              วันที่: {String(x.date).slice(0, 10)}
              <br />
              จำนวน: {x.qty} {x.unit}
              <br />
              โซน: {x.zone} ช่อง: {x.channel}
              <br />
              หมายเหตุ{' '}
              {x.remark && x.remark.trim() !== '' ? x.remark : '-'}
            </div>

            {x.images && x.images.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {x.images.map((fileId, idx) => (
                  <img
                    key={idx}
                    src={`https://drive.google.com/thumbnail?id=${fileId}`}
                    className="w-20 h-20 object-cover rounded cursor-pointer"
                    onClick={() => {
                      setImages(x.images);
                      setOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {rows.length === 0 && (
          <div className="text-sm text-gray-500">
            ยังไม่มีประวัติการเบิก/คืน
          </div>
        )}
      </div>

      {/* Modal ดูรูปใหญ่ */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white p-4 rounded-lg max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-3 flex-wrap">
              {images.map((fileId, idx) => (
                <img
                  key={idx}
                  src={`https://drive.google.com/uc?export=view&id=${fileId}`}
                  className="w-[400px] max-w-full rounded"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutHistory;
