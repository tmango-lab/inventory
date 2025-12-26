import type { ReceiveForm } from '../types';

export function validateReceiveForm(f: ReceiveForm):
  {ok:true} | {ok:false; errors: Record<string,string>}
{
  const errors: Record<string,string> = {};
  if (!f.name?.trim()) errors.name = 'กรุณากรอกชื่อสินค้า';
  const qtyNum = typeof f.qty === 'string' ? Number(f.qty) : f.qty;
  if (!qtyNum || !Number.isFinite(qtyNum) || qtyNum <= 0 || !Number.isInteger(qtyNum)) {
    errors.qty = 'จำนวนต้องเป็นจำนวนเต็ม > 0';
  }
  if (!f.unit) f.unit = 'ชิ้น';
  if (!f.zone) errors.zone = 'เลือกโซน';
  if (!f.channel) errors.channel = 'เลือกช่อง';
  if (!f.images || f.images.length < 1) errors.images = 'ต้องมีรูปอย่างน้อย 1 ไฟล์';
  if (f.images && f.images.length > 3) errors.images = 'อัปโหลดได้สูงสุด 3 รูป';

  return Object.keys(errors).length ? {ok:false, errors} : {ok:true};
}
