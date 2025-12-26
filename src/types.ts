export type ProcessedImage = {
fileName: string;
mimeType: string; // 'image/webp' | 'image/jpeg'
width: number;
height: number;
bytes: number;
blob: Blob; // สำหรับอัปโหลด/พรีวิว
objectUrl?: string; // สำหรับแสดงใน <img>
};


export type ReceiveForm = {
name: string;
qty: number | '';
unit: string;
zone: string;
channel: string;
detail: string;
images: ProcessedImage[]; // เก็บเฉพาะไฟล์ที่ผ่านการย่อแล้ว
};