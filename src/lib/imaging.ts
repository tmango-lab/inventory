// src/lib/imaging.ts
import type { ProcessedImage } from '../types';

export type ResizeOptions = {
  /** ด้านยาวสุดสูงสุด (px) */
  maxSize?: number;
  /** คุณภาพ 0..1 (เฉพาะ image/webp|image/jpeg) */
  quality?: number;
  /** ประเภทไฟล์ที่อยากได้มากที่สุด */
  prefer?: 'image/webp' | 'image/jpeg';
  /** เพดานขนาดไฟล์ KB (จะลดคุณภาพลงอัตโนมัติจนกว่าจะต่ำกว่าเพดาน) */
  targetKB?: number;
};

const defaultOpts: Required<ResizeOptions> = {
  maxSize: 1600,
  quality: 0.8,
  prefer: 'image/webp',
  targetKB: 350,
};

function pickTypes(prefer: 'image/webp' | 'image/jpeg') {
  return prefer === 'image/webp' ? ['image/webp', 'image/jpeg'] : ['image/jpeg', 'image/webp'];
}

async function resizeOne(file: File, opts: Required<ResizeOptions>): Promise<ProcessedImage> {
  const { maxSize, quality, prefer, targetKB } = opts;

  const bitmap = await createImageBitmap(file);
  const longSide = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(maxSize / longSide, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, w, h);

  const candidates = pickTypes(prefer);

  let q = quality;
  let blob: Blob | null = null;
  let typeIdx = 0;

  const toBlob = (type: string, q: number) =>
    new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), type, q)
    );

  while (typeIdx < candidates.length) {
    blob = await toBlob(candidates[typeIdx], q);

    // ลดคุณภาพลงทีละ 0.05 จนกว่าจะ <= targetKB หรือ q ต่ำกว่า 0.45
    while (blob.size / 1024 > targetKB && q > 0.45) {
      q -= 0.05;
      blob = await toBlob(candidates[typeIdx], q);
    }
    if (blob) break;
    typeIdx += 1;
  }

  if (!blob) throw new Error('No supported image type');

  const out: ProcessedImage = {
    fileName:
      file.name.replace(/\.(jpe?g|png|webp|heic|heif)$/i, '') +
      (blob.type === 'image/webp' ? '.webp' : '.jpg'),
    mimeType: blob.type || 'image/jpeg',
    width: w,
    height: h,
    bytes: blob.size,
    blob,
    objectUrl: URL.createObjectURL(blob), // ใช้ใน <img src={...}>
  };

  return out;
}

/** Resize & compress หลายไฟล์ (+ สร้าง objectUrl สำหรับพรีวิว) */
export async function processFiles(
  fileList: FileList | File[] | null,
  opts: ResizeOptions = {}
): Promise<ProcessedImage[]> {
  if (!fileList) return [];
  const arr = Array.from(fileList as any as File[]);
  const options = { ...defaultOpts, ...opts };

  const tasks = arr
    .filter((f) => /^image\//.test(f.type))
    .map((f) => resizeOne(f, options));

  return await Promise.all(tasks);
}

/** Blob → base64 (เตรียมไว้ใช้ Day 4 ส่ง Apps Script) */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bin = String.fromCharCode(...new Uint8Array(buf));
  return btoa(bin);
}

/** ล้าง objectUrl เมื่อไม่ใช้แล้ว */
export function revokeObjectUrls(images: ProcessedImage[]) {
  for (const im of images) {
    if (im.objectUrl) URL.revokeObjectURL(im.objectUrl);
  }
}
