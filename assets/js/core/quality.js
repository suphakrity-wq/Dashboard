/* [core] ตรวจว่าคำตอบชุดไหน "ใช้ไม่ได้" แล้วคัดออกทั้งชุด
 *
 * ทำไมต้องมี: แบบฟอร์มมีช่องให้พิมพ์เอง จึงมีคำตอบเล่น ๆ และคำตอบมั่ว ๆ ปนมา
 * (เช่น ช่อง "ได้พบข่าวยังไง" มีคนตอบว่านกพิราบส่งมาให้
 *  หรือช่องที่ให้เขียนเหตุผล มีคนพิมพ์แค่ "หัวข้อ" ซึ่งจับใจความไม่ได้)
 *
 * หลักการ
 *   1. ถ้าคำตอบของใคร "มีปัญหา" แม้ข้อเดียว ให้คัดคนนั้นออกทั้งชุด
 *      เพราะคนที่กรอกมั่วข้อหนึ่ง ทำให้คำตอบข้ออื่นของคนเดียวกันน่าสงสัยไปด้วย
 *   2. ไม่แก้คำให้ใคร — ระบบมีหน้าที่ "คัดออก" ไม่ใช่ "เดาแทนผู้ตอบ"
 *   3. ไม่ลบข้อมูลต้นทาง แค่ติดธงไว้ ผู้ใช้กดเปิด/ปิดเองได้ และดูได้ว่าใครติดเพราะอะไร
 *
 * แก้ไฟล์นี้เมื่อ: อยากเพิ่ม/ลดความเข้มของกฎ หรือเจอคำตอบแปลก ๆ แบบใหม่
 */

import { THEMES } from './textAnalysis.js?v=139';

const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();

/** ช่องที่คำตอบมาจากรายการตัวเลือก — คำตอบจริงจึงต้องซ้ำกับคนอื่นได้
    multi = ช่องที่เลือกได้หลายข้อ (ในชีตเก็บเป็นข้อความคั่นด้วยจุลภาค) */
const CHOICE_COLS = a => [
  { col: a.howFoundCol, multi: false },
  { col: a.appealCol,   multi: false },
  { col: a.channelCol,  multi: true }
].filter(c => c.col);
/* หมายเหตุ: ไม่รวมช่อง "เหตุผลที่เลือก/ไม่เลือก" ไว้ในกฎนี้
   เพราะมีตัวเลือกให้เยอะ การที่บางข้อมีคนเลือกคนเดียวเป็นเรื่องปกติ ไม่ใช่คำตอบผิดปกติ */

const itemsOf = (value, multi) =>
  (multi ? String(value ?? '').split(',') : [value]).map(clean).filter(Boolean);

/* ---------- ตรวจข้อความที่ผู้ใช้พิมพ์เอง ---------- */

/** ตอบมาก็เท่ากับไม่ได้ตอบ */
const EMPTY_TEXT = ['-', '--', 'ไม่มี', 'ไม่รู้', 'ไม่ทราบ', 'ไม่แน่ใจ', 'เฉย ๆ', 'เฉยๆ',
                    'ฟหก', 'asdf', 'test', 'ทดสอบ', 'อะไรก็ได้', 'ไม่ตอบ', 'ผ่าน'];

/** ซ้ำตัวเดิมรัว ๆ เช่น "5555" "อออ" "..." */
const isRepeat = t => t.length >= 2 && new Set(t.replace(/[\s.]/g, '')).size <= 1;

/** พิมพ์มั่ว: มีแต่ตัวเลข/สัญลักษณ์ หรือพยัญชนะรัวโดยไม่มีสระเลย */
const looksRandom = t => {
  if (/^[\d\s.,!?@#$%^&*()_+=-]+$/.test(t)) return true;
  const thai = (t.match(/[ก-ฮ]/g) || []).length;
  const vowels = (t.match(/[ะ-ู็-๎]/g) || []).length;
  return thai >= 6 && vowels === 0;
};

/** คำสำคัญทั้งหมดที่ระบบใช้จัดหมวดคำตอบปลายเปิด — ใช้ดูว่าข้อความเกี่ยวกับเรื่องนี้ไหม */
const ALL_KEYWORDS = THEMES.flatMap(t => t.keywords);

/**
 * ข้อความที่ใช้ประเมินไม่ได้ คืนเหตุผล (null = ใช้ได้)
 * เกณฑ์ "สั้นจนจับใจความไม่ได้": สั้นกว่า 12 ตัวอักษร และไม่มีคำสำคัญของเรื่องนี้เลย
 *   "หัวข้อ" / "เงิน" / "น่าสนใจ" -> สั้นและไม่ได้บอกเหตุผล = ใช้ไม่ได้
 *   "พาดหัวข่าวน่าสนใจ" -> มีคำสำคัญ (พาดหัว) = ใช้ได้ ถึงจะไม่ยาว
 */
/** คำเชื่อมที่บอกว่าประโยคกำลัง "อธิบายเหตุผล" ไม่ใช่โยนคำเดี่ยวมา */
const CONNECTORS = ['เพราะ', 'เพื่อ', 'ทำให้', 'เนื่องจาก', 'ถ้า', 'เวลา', 'ตอนที่', 'ที่มี', 'ที่ทำให้'];

function textProblem(raw) {
  const t = clean(raw);
  if (!t) return null;                        // ไม่ตอบ = ไม่ผิด แค่ไม่มีข้อมูล
  const low = t.toLowerCase();

  if (t.length < 3 || isRepeat(t) || EMPTY_TEXT.includes(low))
    return `ข้อความไม่มีเนื้อหา: “${t}”`;
  if (looksRandom(t))
    return `ข้อความอ่านไม่ออก: “${t}”`;

  /* คำเดี่ยว ๆ สั้น ๆ อย่าง "หัวข้อ" "พาดหัว" "น่าสนใจ" "เงิน"
     ถึงจะเป็นคำที่เกี่ยวกับเรื่องนี้ แต่ไม่ได้บอกเหตุผลอะไรเลย ใช้ประเมินไม่ได้
     ยกเว้นประโยคที่มีคำเชื่อมอธิบายเหตุผล ซึ่งถือว่าสื่อความได้แล้ว */
  const words = t.split(' ').filter(Boolean).length;
  const explains = CONNECTORS.some(c => t.includes(c));
  if (!explains && words <= 2 && t.length < 14)
    return `สั้นจนจับใจความไม่ได้: “${t}”`;

  /* ยาวขึ้นมาหน่อยแต่ยังกว้างลอย ๆ และไม่มีคำไหนเกี่ยวกับเรื่องที่ถามเลย
     เช่น "เนื้อหาน่าสนใจ" — ตอบแล้วก็ยังไม่รู้ว่าอะไรทำให้หยุดดู */
  if (!ALL_KEYWORDS.some(k => low.includes(k.toLowerCase())) && t.length < 20)
    return `กว้างเกินจนใช้ประเมินไม่ได้: “${t}”`;
  return null;
}

/* ---------- ตรวจทั้งชุดข้อมูล ---------- */

/** ตรวจทีละคน คืน Map: row -> รายการเหตุผลที่คำตอบชุดนั้นใช้ไม่ได้ */
export function auditRows(rows, analysis = {}) {
  const bad = new Map();
  const flag = (row, why) => {
    const list = bad.get(row) || [];
    if (!list.includes(why)) list.push(why);
    bad.set(row, list);
  };

  /* กฎ 1 — ช่องที่ต้องเลือกจากรายการ แต่มีข้อความที่ไม่มีใครตอบซ้ำเลย
     ช่องพวกนี้เลือกจากรายการที่ฟอร์มเตรียมไว้ คำตอบจริงจึงต้องมีคนอื่นตอบซ้ำบ้าง
     ใช้เฉพาะเมื่อกลุ่มใหญ่พอ (12 คนขึ้นไป) ไม่งั้นกลุ่มเล็กจะโดนธงทั้งชุด */
  if (rows.length >= 12) {
    CHOICE_COLS(analysis).forEach(({ col, multi }) => {
      const count = new Map();
      rows.forEach(r => itemsOf(r[col], multi)
        .forEach(v => count.set(v, (count.get(v) || 0) + 1)));
      rows.forEach(r => itemsOf(r[col], multi).forEach(v => {
        if (count.get(v) === 1) flag(r, `คำตอบนอกตัวเลือก: “${v}”`);
      }));
    });
  }

  /* กฎ 2 — ช่องที่ให้พิมพ์เอง มีข้อความที่ใช้ประเมินไม่ได้ */
  const textCol = analysis.openTextCol;
  if (textCol) rows.forEach(r => {
    const why = textProblem(r[textCol]);
    if (why) flag(r, why);
  });

  /* กฎ 3 — ไม่เลือกข่าวเลยสักชุด = ไม่มีคำตอบให้วัด

     หมายเหตุ: จงใจ "ไม่" ตัดคนที่เลือกครบทั้งสองชุด
     ถึงจะดูเหมือนกดผ่าน ๆ แต่คนกลุ่มนี้มีผลต่างเป็นศูนย์ การตัดออกจะทำให้
     ผลลัพธ์เอนไปทางสมมติฐานของเราเอง ซึ่งเป็นการลำเอียงที่ตรวจจับยาก */
  const a = analysis.worldCol, b = analysis.dramaCol;
  if (a && b) rows.forEach(r => {
    const x = Number(r[a]), y = Number(r[b]);
    if (Number.isFinite(x) && Number.isFinite(y) && x === 0 && y === 0)
      flag(r, 'ไม่เลือกข่าวเลยทั้งสองชุด');
  });

  return bad;
}

/** คัดเฉพาะคำตอบที่ใช้ได้ (ตัดทั้งชุดของคนที่ติดธง) */
export function cleanRows(rows, analysis) {
  const bad = auditRows(rows, analysis);
  if (!bad.size) return rows;
  return rows.filter(r => !bad.has(r));
}

/** สรุปให้ UI: มีกี่คนที่ถูกคัดออก และเพราะอะไรบ้าง */
export function auditSummary(rows, analysis) {
  const bad = auditRows(rows, analysis);
  const reasons = new Map();
  bad.forEach(list => list.forEach(why => {
    const key = why.split(':')[0];
    reasons.set(key, (reasons.get(key) || 0) + 1);
  }));
  return {
    total: rows.length,
    excluded: bad.size,
    bad,
    reasons: [...reasons.entries()].map(([label, count]) => ({ label, count }))
      .sort((x, y) => y.count - x.count)
  };
}
