/* [core] แหล่งข้อมูล — รองรับหลายแหล่งพร้อมกัน เผื่อเก็บข้อมูลเพิ่มในอนาคต
   รองรับ: Google Sheet (sheetId + gid), CSV URL, และไฟล์ CSV ในโปรเจกต์ */

const CACHE_PREFIX = 'dashboard.cache.v2';

/** กุญแจแคชผูกกับแหล่งข้อมูล — เปลี่ยนชีตเมื่อไหร่ แคชเก่าจะไม่ถูกหยิบมาใช้ */
function cacheKey(cfg) {
  const sig = listSources(cfg).map(buildUrl).join('|');
  let hash = 0;
  for (let i = 0; i < sig.length; i++) hash = (hash * 31 + sig.charCodeAt(i)) | 0;
  return `${CACHE_PREFIX}.${hash}`;
}

/** สร้าง URL ดาวน์โหลด CSV จากนิยามแหล่งข้อมูลหนึ่งชุด */
export function buildUrl(src) {
  if (src.csvUrl) return src.csvUrl;
  if (!src.sheetId) return null;
  const q = src.gid ? `&gid=${src.gid}`
          : src.sheetName ? `&sheet=${encodeURIComponent(src.sheetName)}` : '';
  return `https://docs.google.com/spreadsheets/d/${src.sheetId}/gviz/tq?tqx=out:csv${q}`;
}

/** รวมนิยามแหล่งข้อมูลจากคอนฟิก (รองรับทั้งแบบเดี่ยวและ sources: []) */
export function listSources(cfg) {
  if (Array.isArray(cfg.sources) && cfg.sources.length) return cfg.sources;
  return [{ id: 'main', label: cfg.brand || 'ข้อมูลหลัก',
            sheetId: cfg.sheetId, gid: cfg.gid, csvUrl: cfg.csvUrl }];
}

/** ตั้งชื่อคอลัมน์ให้ไม่ซ้ำกัน (ชีตของ Google Form มีหัวคอลัมน์ซ้ำได้) */
function uniqueNames(fields) {
  const used = new Set();
  return fields.map((h, i) => {
    const base = (h || `คอลัมน์ ${i + 1}`).trim();
    let name = base, k = 2;
    while (used.has(name)) name = `${base} (${k++})`;
    used.add(name);
    return name;
  });
}

/** ดึง CSV หนึ่งแหล่ง -> { rows, columns }
    หมายเหตุ: ทำ dedupe หลังพาร์สเสร็จ ไม่ใช้ transformHeader
    เพราะ Papa อาจเรียก transformHeader ซ้ำระหว่างสตรีม ทำให้ชื่อเพี้ยน */
function fetchOne(src) {
  return new Promise((resolve, reject) => {
    const url = buildUrl(src);
    if (!url) return reject(new Error('ไม่พบ sheetId หรือ csvUrl ในแหล่งข้อมูล ' + (src.id || '')));

    window.Papa.parse(url + (url.includes('?') ? '&' : '?') + '_=' + Date.now(), {
      download: true, header: false, skipEmptyLines: true,
      complete: res => {
        const table = res.data.filter(r => r.some(v => String(v ?? '').trim() !== ''));
        if (!table.length) return resolve({ rows: [], columns: [] });

        const columns = uniqueNames(table[0]);
        const rows = table.slice(1).map(cells => {
          const obj = { __source: src.id || 'main' };
          columns.forEach((c, i) => { obj[c] = cells[i] ?? ''; });
          return obj;
        });
        resolve({ rows, columns });
      },
      error: err => reject(err)
    });
  });
}

/**
 * ดึงทุกแหล่งพร้อมกันแล้วรวมเป็นชุดเดียว
 * - แหล่งไหนพัง ไม่ทำให้ทั้งระบบล้ม (คืน errors กลับไปแสดงเป็นคำเตือน)
 * - คอลัมน์รวมกันแบบ union เพื่อให้เพิ่มคำถามใหม่ในอนาคตได้โดยไม่ต้องแก้โค้ด
 */
export async function loadAll(cfg) {
  const sources = listSources(cfg);
  const settled = await Promise.allSettled(sources.map(fetchOne));

  const rows = [];
  const columns = [];
  const errors = [];

  settled.forEach((res, i) => {
    if (res.status === 'rejected') {
      errors.push(`${sources[i].label || sources[i].id || 'แหล่งข้อมูล'} — ${res.reason?.message || 'โหลดไม่สำเร็จ'}`);
      return;
    }
    rows.push(...res.value.rows);
    res.value.columns.forEach(c => { if (!columns.includes(c)) columns.push(c); });
  });

  return { rows, columns, errors, sources };
}

/* ---------- แคชไว้ในเครื่อง เพื่อให้เปิดครั้งถัดไปเห็นข้อมูลทันทีระหว่างรอโหลดใหม่ ---------- */

export function readCache(cfg, maxAgeMinutes = 60) {
  try {
    const raw = localStorage.getItem(cacheKey(cfg));
    if (!raw) return null;
    const cached = JSON.parse(raw);
    const ageMin = (Date.now() - cached.at) / 60000;
    return ageMin <= maxAgeMinutes ? cached : null;
  } catch { return null; }
}

export function writeCache(cfg, rows, columns) {
  try {
    // ล้างแคชของแหล่งอื่นที่ไม่ใช้แล้ว กันพื้นที่เต็ม
    Object.keys(localStorage)
      .filter(k => k.startsWith('dashboard.cache') && k !== cacheKey(cfg))
      .forEach(k => localStorage.removeItem(k));
    localStorage.setItem(cacheKey(cfg), JSON.stringify({ at: Date.now(), rows, columns }));
  } catch { /* พื้นที่เต็มหรือถูกปิดไว้ ไม่ใช่เรื่องคอขาดบาดตาย */ }
}
