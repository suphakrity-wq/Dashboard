/* [core] คัดคำตอบที่ดู "ไม่น่าใช่คำตอบจริง" ออกจากผลวิเคราะห์
 *
 * ทำไมต้องมี: แบบฟอร์มเปิดให้พิมพ์เองได้บางช่อง จึงมีคำตอบเล่น ๆ ปนมา
 * (เช่น ช่อง "ได้พบข่าวยังไง" มีคนตอบว่านกพิราบส่งมาให้) ถ้าปล่อยไว้
 * สัดส่วนของทุกกราฟจะเพี้ยนตามไปด้วย
 *
 * หลักการ: ไม่ลบข้อมูลทิ้ง แค่ "ติดธง" ไว้ แล้วให้ผู้ใช้กดเปิด/ปิดเองได้
 * ทุกกฎอ่านได้และแก้ได้ในไฟล์นี้ไฟล์เดียว ไม่ใช่ AI เดา
 *
 * แก้ไฟล์นี้เมื่อ: อยากเพิ่ม/ลดความเข้มของกฎ หรือเจอคำตอบแปลก ๆ แบบใหม่
 */

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

/** ข้อความที่นับว่าไม่มีเนื้อหา ต่อให้พิมพ์มาก็ตอบคำถามไม่ได้ */
const EMPTY_TEXT = ['-', '--', 'ไม่มี', 'ไม่รู้', 'ไม่ทราบ', 'ไม่แน่ใจ', 'ฟหก', 'asdf', 'test', 'ทดสอบ'];

/** ซ้ำตัวเดิมรัว ๆ เช่น "5555" "อออ" "..." */
const isRepeat = t => t.length >= 2 && new Set(t.replace(/[\s.]/g, '')).size <= 1;

/**
 * ตรวจทั้งชุดข้อมูลทีเดียว เพราะกฎ "คำตอบนอกตัวเลือก" ต้องรู้ว่าคนอื่นตอบอะไรบ้าง
 * คืน Map: row -> รายการเหตุผลที่น่าสงสัย (ว่างแปลว่าปกติ)
 */
export function auditRows(rows, analysis = {}) {
  const flags = new Map();
  const add = (row, why) => {
    const list = flags.get(row) || [];
    if (!list.includes(why)) list.push(why);
    flags.set(row, list);
  };

  /* กฎ 1 — ตัวเลือกที่มีคนตอบอยู่คนเดียวในทั้งชุด
     ช่องพวกนี้เลือกจากรายการที่ฟอร์มเตรียมไว้ คำตอบจริงจึงต้องมีคนอื่นตอบซ้ำบ้าง
     ถ้ามีอยู่ข้อความเดียวโดด ๆ แปลว่าถูกพิมพ์เข้ามาเอง (ช่อง “อื่น ๆ”)
     ใช้เฉพาะเมื่อกลุ่มใหญ่พอ (12 คนขึ้นไป) ไม่งั้นกลุ่มเล็กจะโดนธงทั้งชุด */
  if (rows.length >= 12) {
    CHOICE_COLS(analysis).forEach(({ col, multi }) => {
      const count = new Map();
      rows.forEach(r => itemsOf(r[col], multi)
        .forEach(v => count.set(v, (count.get(v) || 0) + 1)));
      rows.forEach(r => itemsOf(r[col], multi)
        .forEach(v => { if (count.get(v) === 1) add(r, `คำตอบนอกตัวเลือก: “${v}”`); }));
    });
  }

  /* กฎ 2 — ช่องพิมพ์เองที่ไม่มีเนื้อหา */
  const textCol = analysis.openTextCol;
  if (textCol) {
    rows.forEach(r => {
      const t = clean(r[textCol]);
      if (!t) return;
      const low = t.toLowerCase();
      if (t.length < 3 || isRepeat(t) || EMPTY_TEXT.includes(low))
        add(r, `ข้อความไม่มีเนื้อหา: “${t}”`);
    });
  }

  /* กฎ 3 — เลือกสุดขั้วทั้งสองฝั่ง (ครบทุกข้อ หรือไม่เลือกเลย)
     ทั้งสองแบบทำให้ผลต่างรายคนเป็นศูนย์ และมักเกิดจากกดผ่าน ๆ */
  const a = analysis.worldCol, b = analysis.dramaCol;
  if (a && b) {
    rows.forEach(r => {
      const x = Number(r[a]), y = Number(r[b]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (x === 0 && y === 0) add(r, 'ไม่เลือกข่าวเลยทั้งสองชุด');
      if (x >= 10 && y >= 10) add(r, 'เลือกครบทุกข่าวทั้งสองชุด');
    });
  }

  return flags;
}

/** คัดเฉพาะแถวที่ไม่ติดธง */
export function cleanRows(rows, analysis) {
  const flags = auditRows(rows, analysis);
  return rows.filter(r => !flags.has(r));
}

/** สรุปให้ UI: กี่แถวที่น่าสงสัย และเพราะอะไรบ้าง */
export function auditSummary(rows, analysis) {
  const flags = auditRows(rows, analysis);
  const reasons = new Map();
  flags.forEach(list => list.forEach(why => {
    const key = why.split(':')[0];
    reasons.set(key, (reasons.get(key) || 0) + 1);
  }));
  return {
    total: rows.length,
    odd: flags.size,
    flags,
    reasons: [...reasons.entries()].map(([label, count]) => ({ label, count }))
      .sort((x, y) => y.count - x.count)
  };
}
