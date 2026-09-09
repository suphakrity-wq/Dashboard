/* [core] ตรวจคุณภาพคำตอบทีละช่อง ไม่ใช่ทีละคน
 *
 * ทำไมต้องมี: แบบฟอร์มมีช่องให้พิมพ์เอง จึงมีคำตอบเล่น ๆ ปนมา
 * (เช่น ช่อง "ได้พบข่าวยังไง" มีคนตอบว่านกพิราบส่งมาให้)
 *
 * หลักการ 3 ข้อ
 *   1. ตัดเฉพาะ "ช่องที่มีปัญหา" ทิ้ง ช่องอื่นของคนคนนั้นยังนับตามปกติ
 *      (เดิมตัดทั้งแถว ทำให้เสียคำตอบดี ๆ ของคนนั้นไปด้วย)
 *   2. พิมพ์ผิดไม่ใช่คำตอบเสีย — ถ้าข้อความใกล้เคียงตัวเลือกจริงมากพอ
 *      ให้ถือว่าตอบข้อนั้นแล้วแก้คำให้ ไม่ต้องตัดทิ้ง
 *   3. ไม่แก้ข้อมูลต้นทาง ทุกอย่างคำนวณตอนแสดงผล และผู้ใช้ปิดได้ทุกเมื่อ
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

/* ---------- เทียบความใกล้เคียงของข้อความ (ใช้จับคำพิมพ์ผิด) ---------- */

/** ระยะแก้ไข (Levenshtein): ต้องเพิ่ม/ลบ/เปลี่ยนตัวอักษรกี่ครั้งถึงจะเหมือนกัน */
function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,                                   // ลบ
        cur[j - 1] + 1,                                // เพิ่ม
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)  // เปลี่ยน
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** ตัดสระ/วรรณยุกต์ไทยและช่องว่างออกก่อนเทียบ — คนพิมพ์ผิดตรงนี้บ่อยที่สุด */
const skeleton = t => t.toLowerCase().replace(/[ัิ-ฺ็-๎\s"'.,!?()]/g, '');

/** ความเหมือน 0–1 (1 = ตรงกันเป๊ะ) */
export function similarity(a, b) {
  const x = skeleton(a), y = skeleton(b);
  if (!x || !y) return 0;
  const d = editDistance(x, y);
  return 1 - d / Math.max(x.length, y.length);
}

/** หาตัวเลือกจริงที่ใกล้เคียงข้อความนี้ที่สุด (คืน null ถ้าไม่ใกล้พอ) */
export function nearestOption(text, options, min = 0.8) {
  let best = null, score = 0;
  options.forEach(o => {
    const s = similarity(text, o);
    if (s > score) { score = s; best = o; }
  });
  return score >= min ? { option: best, score } : null;
}

/* ---------- ตรวจทั้งชุดข้อมูล ---------- */

/**
 * ตรวจทีละช่อง คืน 3 อย่าง
 *   fixes — ช่องที่เป็นคำพิมพ์ผิด พร้อมคำที่ถูกต้อง (ยังนับเป็นคำตอบ)
 *   drops — ช่องที่ใช้ไม่ได้จริง ๆ พร้อมเหตุผล (ไม่นับเฉพาะช่องนั้น)
 * ทั้งสองอันเก็บเป็น Map: row -> Map(ชื่อคอลัมน์ -> ค่า/เหตุผล)
 */
export function auditCells(rows, analysis = {}) {
  const fixes = new Map();
  const drops = new Map();
  const put = (map, row, col, val) => {
    const m = map.get(row) || new Map();
    m.set(col, val);
    map.set(row, m);
  };

  /* กฎ 1 — ช่องที่ต้องเลือกจากรายการ
     ค่าที่มีคนตอบซ้ำกันตั้งแต่ 2 คนขึ้นไป = ตัวเลือกจริงของฟอร์ม
     ค่าที่มีอยู่คนเดียว = พิมพ์เข้ามาเอง ต้องตัดสินต่อว่า "พิมพ์ผิด" หรือ "ไม่เกี่ยว"
     ใช้เฉพาะเมื่อกลุ่มใหญ่พอ (12 คนขึ้นไป) ไม่งั้นกลุ่มเล็กจะโดนธงทั้งชุด */
  if (rows.length >= 12) {
    CHOICE_COLS(analysis).forEach(({ col, multi }) => {
      const count = new Map();
      rows.forEach(r => itemsOf(r[col], multi)
        .forEach(v => count.set(v, (count.get(v) || 0) + 1)));
      const options = [...count.entries()].filter(([, n]) => n >= 2).map(([v]) => v);
      if (!options.length) return;

      rows.forEach(r => {
        const items = itemsOf(r[col], multi);
        let changed = false;
        const kept = [];
        const bad = [];
        items.forEach(v => {
          if (count.get(v) >= 2) { kept.push(v); return; }
          const near = nearestOption(v, options);
          if (near) { kept.push(near.option); changed = true; }   // พิมพ์ผิด — นับเป็นตัวเลือกนั้น
          else bad.push(v);                                       // ไม่ใกล้เคียงอะไรเลย
        });
        if (changed) put(fixes, r, col, kept.join(multi ? ', ' : ''));
        if (bad.length) {
          put(drops, r, col, `คำตอบนอกตัวเลือก: “${bad.join(' / ')}”`);
          // ยังเหลือตัวเลือกที่ใช้ได้อยู่ ก็เก็บเฉพาะส่วนที่ใช้ได้ไว้
          if (kept.length) put(fixes, r, col, kept.join(multi ? ', ' : ''));
        }
      });
    });
  }

  /* กฎ 2 — ช่องพิมพ์เองที่ไม่มีเนื้อหา (ตัดเฉพาะช่องนี้ ไม่กระทบข้ออื่น) */
  const textCol = analysis.openTextCol;
  if (textCol) {
    rows.forEach(r => {
      const t = clean(r[textCol]);
      if (!t) return;
      if (t.length < 3 || isRepeat(t) || EMPTY_TEXT.includes(t.toLowerCase()))
        put(drops, r, textCol, `ข้อความไม่มีเนื้อหา: “${t}”`);
    });
  }

  /* กฎ 3 — ไม่เลือกข่าวเลยสักชุด = ไม่มีคำตอบให้วัด ไม่ใช่คำตอบว่า "ศูนย์"
     ตัดเฉพาะสองช่องที่ใช้นับข่าว คำตอบเรื่องเหตุผลของคนนั้นยังใช้ได้

     หมายเหตุ: จงใจ "ไม่" ตัดคนที่เลือกครบทั้งสองชุด
     ถึงจะดูเหมือนกดผ่าน ๆ แต่คนกลุ่มนี้มีผลต่างเป็นศูนย์ การตัดออกจะทำให้
     ผลลัพธ์เอนไปทางสมมติฐานของเราเอง ซึ่งเป็นการลำเอียงที่ตรวจจับยาก */
  const a = analysis.worldCol, b = analysis.dramaCol;
  if (a && b) {
    rows.forEach(r => {
      const x = Number(r[a]), y = Number(r[b]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (x === 0 && y === 0) {
        put(drops, r, a, 'ไม่เลือกข่าวเลยทั้งสองชุด');
        put(drops, r, b, 'ไม่เลือกข่าวเลยทั้งสองชุด');
      }
    });
  }

  return { fixes, drops };
}

/** คืนแถวชุดใหม่ที่แก้คำพิมพ์ผิดแล้ว และเอาเฉพาะช่องที่ใช้ไม่ได้ออก
    แถวไหนไม่มีอะไรต้องแก้ จะคืนวัตถุเดิมไปเลย (ไม่ต้องคัดลอกโดยไม่จำเป็น) */
export function scrubRows(rows, analysis) {
  const { fixes, drops } = auditCells(rows, analysis);
  if (!fixes.size && !drops.size) return rows;
  return rows.map(r => {
    const f = fixes.get(r), d = drops.get(r);
    if (!f && !d) return r;
    const copy = { ...r };
    if (f) f.forEach((val, col) => { copy[col] = val; });
    if (d) d.forEach((_, col) => { copy[col] = ''; });
    // ติดผลตรวจไว้กับแถวด้วย เพื่อให้หน้าข้อมูลดิบบอกได้ว่าแถวไหนโดนอะไร
    // ตั้งเป็น non-enumerable เพื่อไม่ให้โผล่เป็นคอลัมน์ในตารางหรือการค้นหา
    Object.defineProperty(copy, '__quality', { value: { fixes: f, drops: d }, enumerable: false });
    return copy;
  });
}

/** สรุปให้ UI: มีกี่ช่องที่ถูกตัด กี่ช่องที่แก้คำให้ และเพราะอะไร */
export function auditSummary(rows, analysis) {
  const { fixes, drops } = auditCells(rows, analysis);
  const reasons = new Map();
  let cells = 0;
  drops.forEach(m => m.forEach(why => {
    cells++;
    const key = why.split(':')[0];
    reasons.set(key, (reasons.get(key) || 0) + 1);
  }));
  let fixedCells = 0;
  fixes.forEach(m => { fixedCells += m.size; });
  return {
    total: rows.length,
    rows: drops.size,        // จำนวนคนที่มีอย่างน้อยหนึ่งช่องถูกตัด
    cells,                   // จำนวนช่องที่ถูกตัดจริง ๆ
    fixed: fixedCells,       // จำนวนช่องที่ระบบแก้คำพิมพ์ผิดให้
    drops, fixes,
    reasons: [...reasons.entries()].map(([label, count]) => ({ label, count }))
      .sort((x, y) => y.count - x.count)
  };
}
