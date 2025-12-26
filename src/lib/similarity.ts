// กฎ normalize เบื้องต้น: พิมพ์เล็ก, ตัดช่องว่างซ้ำ, แทนที่คำ/สัญลักษณ์ที่สื่อความ "นิ้ว" ให้เป็นมาตรฐานเดียว
// สามารถเพิ่ม dict/regex ได้ภายหลังตามข้อมูลจริงในคลังสินค้า


const inchPatterns = [
  /"/g,           // "  (double-quote)
  /\binch\b/gi,   // inch
  /\bin\b/gi,     // in (คำนามเดี่ยว)
  /นิ้ว/g,        // คำว่า นิ้ว
];


function collapseSpaces(s: string) {
  // ยุบ space ทุกชนิด (รวม non-breaking space)
  return s.replace(/\s+/g, ' ').trim();
}

export function normalizeName(raw: string): string {
  let s = raw.toLowerCase();
  s = collapseSpaces(s);
  // map นิ้ว → " in "
  for (const p of inchPatterns) s = s.replace(p, ' in ');
  s = collapseSpaces(s);
  // unify ×, x, * → x
  s = s.replace(/[×x\*]/g, 'x');
  // ตัดเครื่องหมายปลายคำซ้ำ ๆ
  s = s.replace(/[\.,/\\\-]+$/g, '');
  return s;
}


export function isExactNameMatch(a: string, b: string) {
  return normalizeName(a) === normalizeName(b);
}


export function similarCandidates(query: string, candidates: string[]): string[] {
  const q = normalizeName(query);
  if (!q) return [];
  // กัน false positive จากคำสั้นมาก (เช่น "a", "in")
  if (q.length < 2) return [];

  // ปรับให้ dedupe และเบากว่าดิมด้วยการ normalize รายการก่อน
  const out: string[] = [];
  const seen = new Set<string>(); // กันชื่อซ้ำในผลลัพธ์

  for (const c of candidates) {
    const cn = normalizeName(c);
    if (!cn) continue;
    if (cn.includes(q) || q.includes(cn)) {
      if (!seen.has(c)) {
        out.push(c);
        seen.add(c);
      }
    }
  }
  return out;
}