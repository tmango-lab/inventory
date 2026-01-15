// src/pages/ReceiveIn.tsx
import React, { useRef, useState } from 'react';
import { Button, Input, Select, Textarea, Badge } from '../components/UI';
import { processFiles, revokeObjectUrls } from '../lib/imaging';
import { uploadReceive, checkSimilarProducts, getShelfConfigs, type ShelfConfig } from '../lib/api';
import { SimilarItemModal, type ProductCandidate } from '../components/SimilarItemModal';

// ---------- Config ----------
// const ZONES = ['A', 'B', 'C'] as const; // Removed static
const QUICK_UNITS = ['ชิ้น', 'ใบ', 'กล่อง', 'แถว', 'แพ็ค'] as const;

// ---------- Types ----------
type ReceiveForm = {
  name: string;
  unit: (typeof QUICK_UNITS)[number] | string;
  qty: number | '';
  zone: string;
  channel: string;
  detail: string;
  images: File[];
  tags: string;
};

// ---------- Component ----------
export default function ReceiveIn() {
  const [form, setForm] = useState<ReceiveForm>({
    name: '',
    unit: 'ชิ้น',
    qty: '',
    zone: '',
    channel: '',
    detail: '',
    images: [],
    tags: '', // space separated string
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [similarityMatches, setSimilarityMatches] = useState<ProductCandidate[]>([]);

  // Dynamic Shelves
  const [shelves, setShelves] = useState<ShelfConfig[]>([]);

  React.useEffect(() => {
    getShelfConfigs().then(setShelves).catch(console.error);
  }, []);

  // Compute channels based on selected zone
  const activeShelf = shelves.find(s => s.zone === form.zone);
  const availableChannels = activeShelf
    ? Array.from({ length: activeShelf.floors * activeShelf.slots_per_floor }, (_, i) => String(i + 1))
    : [];

  React.useEffect(() => {
    if (!form.images || form.images.length === 0) {
      setPreviews([]);
      return;
    }
    const urls = form.images.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [form.images]);

  // ---------- Helpers ----------
  const setField = <K extends keyof ReceiveForm>(k: K, v: ReceiveForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'กรอกชื่อสินค้า';
    if (form.qty === '' || Number(form.qty) <= 0) e.qty = 'จำนวนต้องมากกว่า 0';
    if (!form.zone) e.zone = 'เลือกโซน';
    if (!form.channel) e.channel = 'เลือกช่อง';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      const processed = await processFiles(form.images);

      // Update: Pass blobs directly to API for storage upload
      // 'processed' contains { blob, fileName, mimeType ... } from imaging.ts
      const imagesPayload = processed.map((p: any) => ({
        blob: p.blob,
        filename: p.fileName,
        mimeType: p.mimeType
      }));

      const payload = {
        name: form.name,
        qty: Number(form.qty),
        unit: form.unit,
        zone: form.zone,
        channel: form.channel,
        detail: form.detail || '',
        images: imagesPayload, // Pass blobs
        tags: form.tags ? form.tags.trim().split(/\s+/).filter(Boolean) : []
      };

      const res = await uploadReceive(payload);

      if (res?.ok) {
        alert('✅ บันทึกสำเร็จ');
        setForm({
          name: '',
          unit: 'ชิ้น',
          qty: '',
          zone: '',
          channel: '',
          detail: '',
          images: [],
          tags: ''
        });
        setErrors({});
      } else {
        alert(`❌ อัปโหลดไม่สำเร็จ: ${res?.error || 'unknown error'}`);
      }

      revokeObjectUrls(processed);
    } catch (err: any) {
      console.error(err);
      alert(`❌ เกิดข้อผิดพลาด: ${err?.message || String(err)}`);
    }
  };

  const handlePickFile = () => fileRef.current?.click();

  const onFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    // ไม่ให้ซ้ำ
    const next = [...form.images, ...files].filter(
      (f, i, arr) => arr.findIndex((g) => g.name === f.name && g.size === f.size) === i
    );

    setField('images', next);
    e.target.value = '';
  };

  const handleCheckSimilarity = async () => {
    const trimmed = form.name.trim();
    if (!trimmed || trimmed.length < 2) return;

    // Check similarity
    const matches = await checkSimilarProducts(trimmed);

    // Filter out if the user typed EXACTLY the same name (case-insensitive) as the top match?
    // Actually, if it's exact match, we STILL want to show it because it might be a DUPLICATE entry the user didn't intend.
    // But if the user clicks "Force Create" (which means ignore), we should respect that.
    // For now, always show if matches found.
    if (matches.length > 0) {
      setSimilarityMatches(matches);
    }
  };

  const handleUseExisting = (item: ProductCandidate) => {
    setField('name', item.product_name);
    setSimilarityMatches([]);
  };

  const handleForceCreate = () => {
    setSimilarityMatches([]);
  };

  const handleCancelCheck = () => {
    setSimilarityMatches([]);
    // Optionally focus back to input if needed
  };

  // ---------- UI ----------
  return (
    <div className="space-y-5">
      {/* ชื่อสินค้า */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">ชื่อสินค้า</label>
        <Input
          placeholder="เช่น สายไฟ 2x2.5mm 90m"
          value={form.name}
          onChange={(e) => setField('name', e.target.value)}
          onBlur={handleCheckSimilarity}
        />
        {errors.name && <div className="text-xs text-red-600">{errors.name}</div>}
      </div>

      {/* หน่วย + ปุ่มลัด */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">หน่วย</label>
        <Select
          value={form.unit}
          onChange={(e) => setField('unit', e.target.value)}
          className="w-44"
        >
          {QUICK_UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>

        <div className="flex flex-wrap gap-2">
          {QUICK_UNITS.map((u) => (
            <Button
              key={u}
              variant={form.unit === u ? 'primary' : 'secondary'}
              onClick={() => setField('unit', u)}
            >
              {u}
            </Button>
          ))}
        </div>
      </div>

      {/* จำนวน */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">จำนวน</label>
        <Input
          type="number"
          value={form.qty}
          onChange={(e) =>
            setField('qty', e.target.value === '' ? '' : Number(e.target.value))
          }
          placeholder="เช่น 10"
          className="w-44"
        />
        {errors.qty && <div className="text-xs text-red-600">{errors.qty}</div>}
      </div>

      {/* โซน + ช่อง */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">โซน</label>
          <Select value={form.zone} onChange={(e) => setField('zone', e.target.value as any)}>
            <option value="">— เลือกโซน —</option>
            {shelves.map((s) => (
              <option key={s.zone} value={s.zone}>
                {s.zone}
              </option>
            ))}
          </Select>
          {errors.zone && <div className="text-xs text-red-600">{errors.zone}</div>}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">ช่อง {activeShelf ? `(1-${availableChannels.length})` : ''}</label>
          <Select value={form.channel} onChange={(e) => setField('channel', e.target.value)}>
            <option value="">— เลือกช่อง —</option>
            {availableChannels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {errors.channel && <div className="text-xs text-red-600">{errors.channel}</div>}
        </div>
      </div>

      {/* รายละเอียด */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">
          รายละเอียด (ถ้ามี) <Badge>สี/สเปก/ล็อต/หมายเหตุ</Badge>
        </label>
        <Textarea
          rows={3}
          value={form.detail}
          onChange={(e) => setField('detail', e.target.value)}
          placeholder="เช่น สี/สเปก/ล็อต/หมายเหตุ"
        />
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Tags (คำค้นหา)</label>
        <Input
          placeholder="ระบุสิ่งที่เกี่ยวกับของ เช่น ช้อน หลอดไฟ ขนม"
          value={form.tags}
          onChange={(e) => setField('tags', e.target.value)}
        />
        <div className="text-xs text-gray-400">ระบุคำที่ต้องการให้ค้นเจอได้ง่ายๆ</div>
      </div>

      {/* แนบรูป */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">รูปภาพสินค้า</label>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handlePickFile}>
            เลือกรูป
          </Button>
          {form.images.length > 0 && (
            <span className="text-sm text-gray-600">{form.images.length} ไฟล์ที่เลือก</span>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={onFilesSelected}
          hidden
        />

        {/* Preview รูป */}
        {previews.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {previews.map((src, i) => (
              <div key={src} className="relative">
                <img
                  src={src}
                  alt={`preview-${i}`}
                  className="w-full h-24 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-white/80 border text-xs px-2 py-1 rounded"
                  onClick={() => {
                    const next = [...form.images];
                    next.splice(i, 1);
                    setField('images', next);
                  }}
                >
                  ลบ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ปุ่มบันทึก */}
      <div className="flex gap-2">
        <Button onClick={handleSave}>บันทึก</Button>
        <Button
          variant="ghost"
          onClick={() =>
            setForm({
              name: '',
              unit: 'ชิ้น',
              qty: '',
              zone: '',
              channel: '',
              detail: '',
              images: [],
              tags: ''
            })
          }
        >
          ล้างฟอร์ม
        </Button>
      </div>

      <p className="text-xs text-gray-500 mt-6">Day 5 demo – ยังไม่เชื่อม Backend</p>

      {similarityMatches.length > 0 && (
        <SimilarItemModal
          matches={similarityMatches}
          onUseExisting={handleUseExisting}
          onForceCreate={handleForceCreate}
          onCancel={handleCancelCheck}
        />
      )}
    </div>
  );
}

// ---------- util ----------
