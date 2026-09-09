/* [core] การคำนวณทั้งหมด — แยกคำตอบ, สรุปค่า, จัดกลุ่ม
   ไม่มีการแตะ DOM ในไฟล์นี้ ทดสอบแยกได้ */

/** แปลงค่าจากชีตเป็นตัวเลข (ตัดคอมมา/สัญลักษณ์สกุลเงิน) — คืน null ถ้าไม่ใช่ตัวเลข */
export function num(v) {
  const n = parseFloat(String(v ?? '').replace(/[, ฿$%]/g, ''));
  return isFinite(n) ? n : null;
}

/**
 * แยกคำตอบแบบเลือกหลายข้อ
 * ข้ามลูกน้ำที่อยู่ในวงเล็บหรือเครื่องหมายคำพูด เพราะตัวเลือกในแบบสอบถามมีลูกน้ำอยู่ข้างใน
 * เช่น "แผ่นดินไหว (ฟิลิปปินส์, ญี่ปุ่น)" ต้องนับเป็นข้อเดียว
 */
export function splitValues(value, multi) {
  const s = String(value ?? '').trim();
  if (!s) return ['ไม่ระบุ'];
  if (!multi) return [s];

  const out = [];
  let buf = '', depth = 0, quoted = false;
  for (const ch of s) {
    if (ch === '"' || ch === '“' || ch === '”') { quoted = !quoted; buf += ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0 && !quoted) { out.push(buf.trim()); buf = ''; }
    else buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

/** คอลัมน์นี้เป็นตัวเลขล้วนหรือไม่ (ใช้จัดชิดขวาในตาราง) */
export function isNumericColumn(rows, col) {
  const sample = rows.slice(0, 30).map(r => r[col]).filter(v => v !== '' && v != null);
  return sample.length > 0 && sample.every(v => num(v) !== null);
}

/** ค่าสรุปของคอลัมน์เดียว */
export function aggregate(rows, col, how = 'sum', opt = {}) {
  const values = rows.map(r => num(r[col])).filter(v => v !== null);
  switch (how) {
    case 'count':    return rows.length;
    case 'distinct': {
      /* ช่องที่เลือกได้หลายข้อเก็บเป็นข้อความคั่นจุลภาค ถ้าไม่แยกก่อนนับ
         จะได้ "จำนวนรูปแบบการเลือก" ไม่ใช่ "จำนวนตัวเลือกที่มีคนใช้" (เคยขึ้น 19 ทั้งที่มี 7 ช่องทาง) */
      const set = new Set();
      rows.forEach(r => splitValues(r[col], opt.multi).forEach(v => {
        if (v !== '' && v != null && v !== 'ไม่ระบุ') set.add(v);
      }));
      return set.size;
    }
    case 'filled':   return rows.length
      ? rows.filter(r => String(r[col] ?? '').trim() !== '').length / rows.length * 100 : null;
    case 'share': {
      const want = [].concat(opt.equals ?? []).map(String);
      if (!rows.length) return null;
      return rows.filter(r => want.some(w => String(r[col] ?? '').includes(w))).length / rows.length * 100;
    }
    case 'avg':  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    case 'max':  return values.length ? Math.max(...values) : null;
    case 'min':  return values.length ? Math.min(...values) : null;
    case 'last': return values.length ? values[values.length - 1] : null;
    default:     return values.reduce((a, b) => a + b, 0);
  }
}

/** ค่าเฉลี่ยแบบสั้น ใช้บ่อยในบทวิเคราะห์ */
export const avgOf = (rows, col) => aggregate(rows, col, 'avg');

/** ค่าที่ไม่ซ้ำในคอลัมน์ (ตัดค่าว่างทิ้ง) */
export function distinctValues(rows, col) {
  return [...new Set(rows.map(r => String(r[col] ?? '').trim()).filter(Boolean))];
}

/**
 * เลือกคอลัมน์สำหรับ "แบ่งกลุ่ม" จากรายการที่เป็นไปได้
 * กลุ่มตัวอย่างจริงอาจแคบ (เช่น มีแต่ 18-20 ปี) การแบ่งตามอายุจะไม่มีความหมาย
 * จึงไล่หาคอลัมน์แรกที่มีค่าไม่ซ้ำอย่างน้อย minGroups ค่า ถ้าไม่มีเลยคืน null
 */
export function pickGroupColumn(rows, candidates, minGroups = 2) {
  for (const col of [].concat(candidates).filter(Boolean)) {
    if (distinctValues(rows, col).length >= minGroups) return col;
  }
  return null;
}

/** จัดกลุ่มตามคอลัมน์ x แล้วสรุปค่า -> { labels, values } */
export function groupBy(rows, cf) {
  const how = cf.agg || (cf.y ? 'sum' : 'count');
  const map = new Map();

  rows.forEach(r => {
    splitValues(r[cf.x], cf.multi).forEach(key => {
      if (cf.multi && key === 'ไม่ระบุ') return;
      const cur = map.get(key) || { sum: 0, n: 0 };
      cur.n += 1;
      cur.sum += (num(r[cf.y]) ?? 0);
      map.set(key, cur);
    });
  });

  let list = [...map.entries()].map(([k, v]) => [
    k, how === 'count' ? v.n : how === 'avg' ? (v.n ? v.sum / v.n : 0) : v.sum
  ]);

  if (cf.sort === 'value') list.sort((a, b) => b[1] - a[1]);
  else if (cf.sort === 'label') list.sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'th'));
  if (cf.top) list = list.slice(0, cf.top);

  return { labels: list.map(e => e[0]), values: list.map(e => e[1]) };
}

/** ตารางไขว้ 2 มิติ: หัวข้อ × กลุ่ม */
export function crossTab(rows, { x, group, multi, top = 6 }) {
  const groups = [...new Set(rows.map(r => String(r[group] ?? '–')))]
    .sort((a, b) => a.localeCompare(b, 'th'));
  const { labels } = groupBy(rows, { x, multi, agg: 'count', sort: 'value', top });
  const sizes = Object.fromEntries(
    groups.map(g => [g, rows.filter(r => String(r[group] ?? '–') === g).length]));
  const matrix = labels.map(label =>
    groups.map(g => rows.filter(r =>
      String(r[group] ?? '–') === g && String(r[x] ?? '').includes(label)).length));
  return { groups, labels, matrix, sizes, max: Math.max(1, ...matrix.flat()) };
}

/**
 * เทียบ "ช่องว่าง" ระหว่างกลุ่ม — ใช้ตอบว่าอะไรสัมพันธ์กับอะไร
 * เช่น คนที่เจอข่าวโดยบังเอิญ มีช่องว่างข่าวโลก/ดราม่ากว้างกว่าคนที่ตั้งใจหาไหม
 * คืนค่าเป็นข้อมูลล้วน: กลุ่ม, จำนวนคน, ค่าเฉลี่ยสองฝั่ง, ส่วนต่าง
 */
export function compareGroups(rows, { by, matchers, colA, colB, minN = 3 }) {
  // matchers = [{ label, match }] ถ้าไม่ระบุ จะใช้ค่าที่ไม่ซ้ำในคอลัมน์ by
  const defs = matchers && matchers.length
    ? matchers
    : distinctValues(rows, by).map(v => ({ label: v, match: v }));

  return defs.map(d => {
    const sub = rows.filter(r => String(r[by] ?? '').includes(d.match));
    const a = aggregate(sub, colA, 'avg');
    const b = aggregate(sub, colB, 'avg');
    const gap = (a != null && b != null) ? b - a : null;
    return {
      label: d.label,
      n: sub.length,
      a, b, gap,
      gapPct: (a && b) ? Math.round((b / a - 1) * 100) : null,
      enough: sub.length >= minN
    };
  }).filter(g => g.n > 0);
}

/** เพิ่มคอลัมน์คำนวณลงในแถว (แก้ที่ตัวข้อมูลโดยตรง) */
export function addComputedColumns(rows, columns, defs = []) {
  defs.forEach(def => {
    rows.forEach(r => {
      if (def.type === 'countItems') {
        r[def.name] = splitValues(r[def.from], true).filter(v => v && v !== 'ไม่ระบุ').length;
      }
    });
    if (!columns.includes(def.name)) columns.push(def.name);
  });
  return { rows, columns };
}
