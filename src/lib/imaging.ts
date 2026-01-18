// src/lib/imaging.ts

export type ProcessedImage = {
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  bytes: number;
  blob: Blob;
  objectUrl: string;
  base64?: string; // Optional property if needed later
};

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
  maxSize: 1200, // Reduce default max size to 1200 for safety
  quality: 0.8,
  prefer: 'image/jpeg', // Force JPEG to ensure quality parameter works (PNG ignores it)
  targetKB: 350,
};

function pickTypes(prefer: 'image/webp' | 'image/jpeg') {
  // Always try JPEG if preferred, or as backup.
  return prefer === 'image/jpeg' ? ['image/jpeg', 'image/webp'] : ['image/webp', 'image/jpeg'];
}

async function resizeOne(file: File, opts: Required<ResizeOptions>): Promise<ProcessedImage> {
  const { maxSize, quality, prefer, targetKB } = opts;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (e) {
    throw new Error('Could not decode image (createImageBitmap failed)');
  }

  const longSide = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(maxSize / longSide, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // White background for transparent images converted to JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  ctx.drawImage(bitmap, 0, 0, w, h);

  const candidates = pickTypes(prefer);

  let q = quality;
  let blob: Blob | null = null;
  let selectedType = '';

  const toBlob = (type: string, q: number) =>
    new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), type, q)
    );

  // Attempt compression
  for (const type of candidates) {
    q = quality; // Reset quality for new type
    selectedType = type;

    try {
      blob = await toBlob(type, q);

      // Reduce quality loop
      while (blob.size / 1024 > targetKB && q > 0.3) {
        q -= 0.1;
        blob = await toBlob(type, q);
      }

      // If satisfy target, break. If not, we still have the last 'blob' (best effort)
      // If it's way too big (e.g. > 1MB), maybe try next type? 
      // JPEG is usually good.
      if (blob) break;

    } catch (e) {
      continue;
    }
  }

  if (!blob) throw new Error('No supported image type created');

  const out: ProcessedImage = {
    fileName:
      file.name.replace(/\.(jpe?g|png|webp|heic|heif)$/i, '') +
      (selectedType === 'image/webp' ? '.webp' : '.jpg'),
    mimeType: selectedType || 'image/jpeg',
    width: w,
    height: h,
    bytes: blob.size,
    blob,
    objectUrl: URL.createObjectURL(blob),
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
