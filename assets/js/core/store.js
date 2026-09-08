/* [core] เก็บสถานะของข้อมูลและตัวกรอง + แจ้งเตือนเมื่อมีการเปลี่ยนแปลง
   ฝั่งหน้าตาไม่ต้องรู้ว่าโหลดมาจากไหน แค่ subscribe แล้วอ่าน visibleRows() */

import { loadAll, readCache, writeCache, listSources } from './source.js?v=55';
import { addComputedColumns } from './compute.js?v=55';

export const store = {
  rows: [],        // ข้อมูลดิบทุกแถว (รวมทุกแหล่ง)
  columns: [],     // ชื่อคอลัมน์แบบ union
  sources: [],     // แหล่งข้อมูลที่ตั้งค่าไว้
  errors: [],      // แหล่งที่โหลดไม่สำเร็จ
  status: 'idle',  // idle | loading | ready | empty | error
  updatedAt: null,
  fromCache: false,

  // สถานะการกรอง (ฝั่ง UI เปลี่ยนค่าพวกนี้)
  tab: 0,
  filters: {},
  search: '',
  page: 0
};

const listeners = new Set();
export const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
const notify = () => listeners.forEach(fn => fn(store));

/** โหลดข้อมูลใหม่จากทุกแหล่ง (ใช้แคชแสดงก่อนถ้ามี) */
export async function refresh(cfg, { useCache = true } = {}) {
  store.sources = listSources(cfg);

  if (useCache && !store.rows.length) {
    const cached = readCache(cfg, cfg.cacheMinutes ?? 60);
    if (cached) {
      store.rows = cached.rows;
      store.columns = cached.columns;
      store.updatedAt = new Date(cached.at);
      store.fromCache = true;
      store.status = 'ready';
      notify();
    }
  }

  store.status = 'loading';
  notify();

  const { rows, columns, errors } = await loadAll(cfg);

  // โหลดสำเร็จแต่ยังไม่มีใครตอบ — ไม่ใช่ error ต้องล้างข้อมูลเก่าทิ้งด้วย
  if (!rows.length && !errors.length) {
    store.rows = [];
    store.columns = columns;
    store.errors = [];
    store.updatedAt = new Date();
    store.fromCache = false;
    store.status = 'empty';
    notify();
    return store;
  }

  if (!rows.length) {
    store.errors = errors;
    store.status = store.rows.length ? 'ready' : 'error';
    notify();
    return store;
  }

  addComputedColumns(rows, columns, cfg.computed || []);
  store.rows = rows;
  store.columns = columns;
  store.errors = errors;
  store.updatedAt = new Date();
  store.fromCache = false;
  store.status = 'ready';
  writeCache(cfg, rows, columns);
  notify();
  return store;
}

/** แถวที่ผ่านแท็บ + ตัวกรอง + คำค้น */
export function visibleRows(cfg) {
  let rows = store.rows;

  const tab = (cfg.tabs || [])[store.tab];
  if (tab?.column && tab.value != null) {
    rows = rows.filter(r => String(r[tab.column] ?? '').includes(tab.value));
  }
  Object.entries(store.filters).forEach(([col, val]) => {
    if (val) rows = rows.filter(r => String(r[col]) === val);
  });
  const q = store.search.trim().toLowerCase();
  if (q) rows = rows.filter(r => Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q)));

  return rows;
}
