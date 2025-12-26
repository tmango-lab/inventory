// src/pages/IssueOut.tsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Input, Select, Textarea } from '../components/UI';
import { createOut } from '../lib/api';

const ZONES = ['A', 'B', 'C'] as const;
const CHANNELS = Array.from({ length: 25 }, (_, i) => (i + 1).toString());
const UNITS = ['ชิ้น', 'ใบ', 'กล่อง', 'แถว', 'แพ็ค'] as const;

const IssueOut: React.FC = () => {
  const { state } = useLocation();

  const [itemName, setItemName] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [unit, setUnit] = useState<string>('ชิ้น');
  const [zone, setZone] = useState<string>('A');
  const [channel, setChannel] = useState<string>('1');
  const [requestBy, setRequestBy] = useState('');
  const [type, setType] = useState<'consume' | 'borrow'>('consume');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (state) {
      if (state.itemName) setItemName(state.itemName);
      if (state.zone) setZone(state.zone);
      if (state.channel) setChannel(state.channel);
      if (state.unit) setUnit(state.unit);
    }
  }, [state]);

  const handleSubmit = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!itemName.trim()) {
      setErrorMsg('กรุณากรอกชื่อสินค้า');
      return;
    }
    const nQty = Number(qty);
    if (!nQty || nQty <= 0) {
      setErrorMsg('กรุณากรอกจำนวนที่มากกว่า 0');
      return;
    }
    if (!requestBy.trim()) {
      setErrorMsg('กรุณากรอกชื่อผู้เบิก');
      return;
    }

    setLoading(true);
    try {
      const res = await createOut({
        itemName: itemName.trim(),
        qty: nQty,
        unit,
        zone,
        channel,
        requestBy: requestBy.trim(),
        remark: remark.trim(),
        type, // ส่งค่า type ไปด้วย
      });

      setSuccessMsg(`บันทึกการ${type === 'consume' ? 'เบิก' : 'ยืม'}เรียบร้อย เลขที่เอกสาร: ${res.outId}`);
      setItemName('');
      setQty('');
      setRemark('');
      // reset type? maybe keep it default
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดระหว่างบันทึกการเบิก');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="bg-red-100 text-red-700 px-3 py-2 rounded">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-100 text-green-700 px-3 py-2 rounded">
          {successMsg}
        </div>
      )}

      <div className="space-y-4">
        {/* Type Selection */}
        <div className="flex gap-6 pb-2 border-b">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="outType"
              checked={type === 'consume'}
              onChange={() => setType('consume')}
              className="w-4 h-4 text-blue-600"
            />
            <span className={type === 'consume' ? 'font-semibold text-blue-700' : 'text-slate-600'}>
              เบิกใช้ (ตัดสต็อก)
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="outType"
              checked={type === 'borrow'}
              onChange={() => setType('borrow')}
              className="w-4 h-4 text-blue-600"
            />
            <span className={type === 'borrow' ? 'font-semibold text-blue-700' : 'text-slate-600'}>
              ยืม (คืนภายหลัง)
            </span>
          </label>
        </div>

        {/* ชื่อสินค้า */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">ชื่อสินค้า</label>
          <Input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="เช่น ท่อพีวีซี 1 in 1.5m"
          />
        </div>

        {/* จำนวน + หน่วย */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium">จำนวน</label>
            <Input
              type="number"
              value={qty}
              onChange={(e) =>
                setQty(e.target.value === '' ? '' : Number(e.target.value))
              }
              min={1}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">หน่วย</label>
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* โซน + ช่อง */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium">โซน</label>
            <Select value={zone} onChange={(e) => setZone(e.target.value)}>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">ช่อง</label>
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* ผู้เบิก */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">ผู้เบิก</label>
          <Input
            value={requestBy}
            onChange={(e) => setRequestBy(e.target.value)}
            placeholder="เช่น สมชาย"
          />
        </div>

        {/* หมายเหตุ */}
        <div className="space-y-1">
          <label className="block text-sm font-medium">หมายเหตุ</label>
          <Textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={type === 'borrow' ? 'ระบุวันคืนหรือโปรเจคที่ยืม' : 'เช่น เบิกใช้ในงานติดตั้งโครงการ A'}
          />
        </div>

        <div className="pt-2">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading
              ? 'กำลังบันทึก...'
              : type === 'consume'
                ? 'บันทึกการเบิก'
                : 'บันทึกการยืม'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IssueOut;
