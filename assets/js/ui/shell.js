/* [ui] เปลือกของแอป: เมนูซ้าย, แถบเครื่องมือ, แถบสรุปด้านบน, สถานะการโหลด */

import { $, el, countUp } from './dom.js';
import { aggregate } from '../core/compute.js';
import { wilsonInterval } from '../core/stats.js';
import { store } from '../core/store.js';
import { sparkline } from './charts.js';

/** เมนูด้านซ้าย */
export function renderNav(pages, activeId) {
  const host = $('#nav');
  host.innerHTML = '';
  pages.forEach(p => {
    const link = el('a', 'nav-item' + (p.id === activeId ? ' on' : ''));
    link.href = '#/' + p.id;
    link.innerHTML =
      `<span class="nav-ico"><i class="ms">${p.icon || 'circle'}</i></span>
       <span class="nav-txt"><b>${p.label}</b><i>${p.navHint || ''}</i></span>`;
    host.append(link);
  });
}

/** แท็บกรองด้านบน */
export function renderTabs(cfg, onChange) {
  const host = $('#tabs');
  host.innerHTML = '';
  const defs = cfg.tabs || [];
  host.hidden = !defs.length;
  defs.forEach((t, i) => {
    const btn = el('button', 'tab' + (i === store.tab ? ' on' : ''), t.label);
    btn.type = 'button';
    btn.onclick = () => {
      store.tab = i; store.page = 0;
      host.querySelectorAll('.tab').forEach((x, j) => x.classList.toggle('on', j === i));
      onChange();
    };
    host.append(btn);
  });
}

/** ตัวกรองแบบเลือกค่า */
export function renderFilters(cfg, onChange) {
  const host = $('#filters');
  host.innerHTML = '';
  const defs = cfg.filters || [];
  host.hidden = !defs.length;
  defs.forEach(f => {
    const label = el('label');
    label.append(el('span', null, f.label || f.column));
    const select = el('select', 'input');
    select.append(new Option('ทั้งหมด', ''));
    [...new Set(store.rows.map(r => r[f.column]).filter(v => v !== '' && v != null))]
      .sort((a, b) => String(a).localeCompare(String(b), 'th'))
      .forEach(v => select.append(new Option(v, v)));
    select.value = store.filters[f.column] || '';
    select.onchange = () => {
      store.filters[f.column] = select.value;
      store.page = 0;
      onChange();
    };
    label.append(select);
    host.append(label);
  });
}

/** แถบตัวเลขสรุปด้านบนของแต่ละหน้า */
export function renderSummary(page, rows) {
  const host = $('#summary');
  host.innerHTML = '';
  const defs = page.summary || [];
  host.hidden = !defs.length;

  defs.forEach(k => {
    const card = el('div', 'stat' + (k.tone ? ' ' + k.tone : ''));
    card.append(el('div', 'stat-label', k.label));

    const value = el('div', 'stat-value');
    if (k.text) { value.textContent = k.text; value.classList.add('is-text'); }
    else countUp(value, aggregate(rows, k.column, k.agg, k));
    if (k.unit) value.append(el('span', 'unit', k.unit));
    card.append(value);

    if (k.spark) {
      const box = el('div', 'stat-spark');
      const svg = sparkline(k.spark, rows);
      if (svg) { box.append(svg); card.append(box); }
    }
    // ตัวเลข % อ่านแล้วเข้าใจผิดง่ายเมื่อฐานน้อย จึงเติมจำนวนคนและช่วงความเชื่อมั่นให้เสมอ
    let auto = null;
    if (k.unit === '%' && rows.length) {
      const value = aggregate(rows, k.column, k.agg, k);
      const ci = value == null ? null : wilsonInterval(Math.round(value / 100 * rows.length), rows.length);
      auto = ci
        ? `จาก ${rows.length} คน · ช่วงเชื่อมั่น 95% ${Math.round(ci.lo)}–${Math.round(ci.hi)}%`
        : `จากผู้ตอบ ${rows.length} คน`;
    }
    const sub = [k.sub, auto].filter(Boolean).join(' · ');
    if (sub) { card.title = `${k.label}: ${sub}`; card.append(el('div', 'stat-sub', sub)); }
    host.append(card);
  });
}

/** ป้ายโหมดทดลอง + ตัวเลือกชุดข้อมูลจำลอง */
export function markDemo(fixture, fixtures = []) {
  const flag = document.querySelector('#demo-flag');
  if (!flag) return;
  flag.hidden = false;
  flag.textContent = 'โหมดทดลอง · ' + (fixture?.label || 'ข้อมูลจำลอง');
  flag.title = fixture?.note || '';

  const picker = el('select', 'input demo-pick');
  fixtures.forEach(f => picker.append(new Option(f.label, f.id)));
  picker.value = fixture?.id || fixtures[0]?.id;
  picker.onchange = () => { location.search = '?demo=' + picker.value; };
  flag.after(picker);
}

/** ข้อความสถานะ + รายการแหล่งข้อมูล */
export function renderStatus() {
  const box = $('#status');
  const parts = [];

  if (store.status === 'loading' && !store.rows.length) parts.push('กำลังโหลดข้อมูล…');
  if (store.status === 'empty') parts.push('เชื่อมต่อชีตสำเร็จ แต่ยังไม่มีใครตอบแบบสอบถาม — ตัวเลขทั้งหมดจะขึ้นเองเมื่อมีคำตอบเข้ามา');
  if (store.status === 'error') parts.push('โหลดข้อมูลไม่สำเร็จ — ตรวจสอบว่าชีตเปิดสิทธิ์ให้เข้าถึงแล้ว');
  store.errors.forEach(e => parts.push('⚠︎ ' + e));
  if (store.fromCache && store.status === 'loading') parts.push('กำลังอัปเดตข้อมูลใหม่…');

  box.textContent = parts.join(' · ');
  box.classList.toggle('error', store.status === 'error' || store.errors.length > 0);
  box.classList.toggle('empty-note', store.status === 'empty');

  const stamp = $('#updated');
  if (store.updatedAt) {
    const many = store.sources.length > 1 ? ` · ${store.sources.length} แหล่ง` : '';
    stamp.textContent = 'อัปเดต ' + store.updatedAt.toLocaleString('th-TH') + many;
  }
}
