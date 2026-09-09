/* [ui] บล็อกที่ใช้ประกอบเป็นหน้า — หนึ่งบล็อก = หนึ่งฟีเจอร์
 *
 * แก้ไฟล์นี้เมื่อ: อยากเพิ่ม/แก้ "ชนิดของบล็อก" ที่หน้าเรียกใช้ได้
 * วิธีเพิ่มบล็อกใหม่:
 *   1. เขียนฟังก์ชัน myBlock(host, b, rows, cfg) — host คือ element ที่ให้ใส่ผลลัพธ์
 *   2. เติมชื่อลงใน BLOCKS ท้ายไฟล์
 *   3. เรียกใช้ในไฟล์หน้า: { type: "myBlock", title: "…" }
 * ห้าม: ใส่สูตรคำนวณในไฟล์นี้ — ให้เรียกจาก core/ แทน
 */

import { $, el, growBar, segmentBars } from './dom.js?v=139';
import { fmt, round1, pct } from '../core/format.js?v=139';
import { splitValues, isNumericColumn } from '../core/compute.js?v=139';
import { store } from '../core/store.js?v=139';
import { verdict as calcVerdict, causes as calcCauses, pulls as calcPulls } from '../core/insight.js?v=139';
import { recommend } from '../core/recommend.js?v=139';
import { analyzeText } from '../core/textAnalysis.js?v=139';
import { auditRows } from '../core/quality.js?v=139';
import { wilsonInterval } from '../core/stats.js?v=139';
import { SOURCES, CONTEXT_FACTS, compareBenchmarks } from '../core/benchmarks.js?v=139';
import { aggregate, groupBy as groupRows } from '../core/compute.js?v=139';
import { CHARTS } from './charts.js?v=139';

let rerender = () => {};
export const onRerender = fn => { rerender = fn; };

/** โครงของแต่ละส่วน: หัวข้อ + คำอธิบาย */
function section(host, b) {
  const sec = el('section', 'sec');
  if (b.title) {
    const head = el('div', 'sec-head');
    head.append(el('h2', null, b.title));
    if (b.desc) head.append(el('p', 'sec-desc', b.desc));
    sec.append(head);
  }
  host.append(sec);
  return sec;
}

/* ---------- กลุ่มกราฟ ---------- */
function charts(host, b, rows) {
  const sec = section(host, b);
  const grid = el('div', 'grid');
  (b.charts || []).forEach(cf => {
    const draw = CHARTS[cf.type];
    if (!draw) return;

    const card = el('article', `card lv${cf.level || 2}`);
    if (cf.wide) card.classList.add('span-all');
    if (cf.accent) card.style.setProperty('--accent', cf.accent);

    const head = el('div', 'card-head');
    head.append(el('h3', null, cf.title || ''));
    if (cf.note) head.append(el('p', 'card-note', cf.note));

    const body = el('div', 'card-body');
    card.append(head, body);
    grid.append(card);

    draw(body, cf, rows);
    if (cf.hint) body.append(el('p', 'hint', cf.hint));
    /* ทุกกราฟต้องบอกฐานของตัวเองเสมอ อ่านการ์ดใบเดียวก็รู้ว่ามาจากคนกี่คน
       (ปิดเป็นรายกราฟได้ด้วย base:false เช่นกราฟที่นับ 'คำตอบ' ไม่ใช่ 'คน') */
    if (cf.base !== false)
      body.append(el('p', 'chart-base', `ฐานข้อมูล: ผู้ตอบ ${fmt(rows.length)} คน`));
  });
  sec.append(grid);
}

/* ---------- การ์ดคำตอบของคำถามวิจัย ---------- */
function verdict(host, b, rows, cfg) {
  const v = calcVerdict(rows, cfg.analysis || {});

  const card = el('section', 'verdict ' + v.tone);
  card.innerHTML =
    `<span class="vd-cap">คำถามวิจัย</span>
     <p class="vd-q">${b.question || '“คนไทยชอบเสพสื่อดราม่า แต่ไม่เสพข่าวโลก จริงหรือไม่?”'}</p>
     <div class="vd-answer">${v.answer}</div>
     <p class="vd-why">${v.why}</p>`;

  const bars = el('div', 'vd-bars');
  const max = Math.ceil(Math.max(v.world || 0, v.drama || 0, 1));
  const segs = [];   // แบ่งช่องเหมือนหลอดอื่นในเว็บ (ดู segmentBars ใน ui/dom.js)
  [[b.worldLabel || 'ข่าวโลก', v.world, 'var(--gray-on-dark)'],
   [b.dramaLabel || 'ข่าวดราม่า', v.drama, 'var(--purple-2)']].forEach(([label, value, color]) => {
    const row = el('div', 'vd-bar');
    row.append(el('span', 'vd-name', label));
    const track = el('div', 'vd-track');
    const fill = el('i');
    fill.style.setProperty('--c', color);
    track.append(fill);
    row.append(track, el('b', null, fmt(round1(value))));
    bars.append(row);
    segs.push({ track, value: value || 0, color });
    growBar(fill, (value || 0) / max * 100);
  });
  card.append(bars);
  segmentBars(segs, max, b.unit || 'ข่าว/คน');

  /* แถบตัวเลขสถิติ — บอกทั้งขนาดของผลต่าง ความแม่น และความน่าจะเป็นที่จะเกิดจากความบังเอิญ */
  if (v.stats) {
    const st = v.stats;
    const strip = el('div', 'vd-stats');
    const item = (label, value, note) => {
      const box = el('div', 'vd-stat');
      box.append(el('span', 'vd-stat-label', label));
      box.append(el('b', null, value));
      if (note) box.append(el('span', 'vd-stat-note', note));
      return box;
    };
    strip.append(item('ผลต่างเฉลี่ย',
      (st.meanDiff > 0 ? '+' : '') + st.meanDiff.toFixed(1) + ' ข่าว/คน',
      `ช่วงความเชื่อมั่น 95%: ${st.ci[0].toFixed(1)} ถึง ${st.ci[1].toFixed(1)}`));
    strip.append(item('โอกาสเกิดจากความบังเอิญ',
      st.p < 0.001 ? 'น้อยกว่า 0.1%' : (st.p * 100).toFixed(1) + '%',
      `p = ${st.p < 0.001 ? '<.001' : st.p.toFixed(3)} · เกณฑ์ ${st.alpha}`));
    strip.append(item('ขนาดของผลต่าง', st.effect,
      `Cohen's dz = ${st.dz == null ? '–' : st.dz.toFixed(2)}`));
    card.append(strip);

    const method = el('p', 'vd-method');
    method.textContent = `วิธีคำนวณ: Paired t-test (t = ${st.t?.toFixed(2)}, df = ${st.df})` +
      (st.wilcoxonP != null ? ` · ตรวจซ้ำด้วย Wilcoxon signed-rank (p = ${st.wilcoxonP < 0.001 ? '<.001' : st.wilcoxonP.toFixed(3)})` : '') +
      (st.needN
        ? (st.needN > 1000
            // ผลต่างเล็กมากจนต้องใช้ตัวอย่างมหาศาล = ในทางปฏิบัติถือว่าไม่ต่างกัน
            ? ' · ผลต่างเล็กมากจนแทบไม่มีความหมายในทางปฏิบัติ ต่อให้เก็บข้อมูลเพิ่มก็ไม่น่าเปลี่ยนข้อสรุป'
            : ` · ถ้าต้องการยืนยันผลต่างขนาดนี้ ควรมีผู้ตอบราว ${st.needN} คน`)
        : '');
    card.append(method);
  }

  if (v.warn) card.append(el('p', 'vd-warn', v.warn));
  host.append(card);
}

/* ---------- สาเหตุ + ทางแก้ ---------- */
function causes(host, b, rows, cfg) {
  const sec = section(host, b);
  const list = calcCauses(rows, cfg.analysis || {}, { column: b.column, top: b.top || 4 });

  if (!list.length) {
    sec.append(el('p', 'empty', 'ยังไม่มีคำตอบในข้อนี้'));
    return;
  }

  const grid = el('div', 'grid');
  const segs = [];          // ทุกการ์ดใช้สเกลเดียวกัน จึงตัดสินใจแบ่งช่องพร้อมกัน
  const people = rows.length || 1;
  list.forEach(c => {
    const card = el('article', 'card cause' + (c.rank === 1 ? ' is-top' : ''));

    const head = el('div', 'cause-head');
    head.append(el('span', 'cause-no', String(c.rank)));
    head.append(el('h3', 'cause-name', c.label));

    const figure = el('div', 'cause-figure');
    figure.append(el('b', null, c.share + '%'));
    figure.append(el('span', null, `ของผู้ตอบ (${fmt(c.count)} คน)`));

    const track = el('div', 'cause-track');
    const fill = el('i');
    track.append(fill);

    card.append(head, figure, track);
    segs.push({ track, value: c.count, color: 'var(--accent)' });
    if (c.fix) {
      const fix = el('div', 'cause-fix');
      fix.append(el('span', 'fix-cap', 'ทางแก้'));
      fix.append(el('p', null, c.fix));
      card.append(fix);
    }
    grid.append(card);
    growBar(fill, c.share);
  });
  sec.append(grid);
  segmentBars(segs, people, 'คน');   // 1 ช่อง = กี่คน (สเกลเดียวกันทุกการ์ด = เทียบกันได้)
}

/* ---------- แรงดึงฝั่งดราม่า ---------- */
function pull(host, b, rows, cfg) {
  const list = calcPulls(rows, cfg.analysis || {}, { column: b.column, top: b.top || 3 });
  if (!list.length) return;

  const sec = section(host, b);
  const grid = el('div', 'grid');
  list.forEach(p => {
    const card = el('article', 'card pull');
    card.append(el('span', 'pull-no', String(p.rank)));
    card.append(el('p', 'pull-name', p.label));
    card.append(el('b', 'pull-value', p.share + '%'));
    grid.append(card);
  });
  sec.append(grid);
  if (b.note) sec.append(el('p', 'sec-note', b.note));
}

/* ---------- ตารางข้อมูลดิบ ---------- */
/* คลิกที่แถวเพื่อกางรายละเอียดของคนนั้นแบบเต็ม ๆ ทุกคำถาม ไม่มีตัดข้อความ */
function table(host, b, rows, cfg = {}) {
  const sec = section(host, b);
  const card = el('article', 'card');

  /* ผลตรวจคุณภาพรายคน — บอกได้ว่าคำตอบชุดไหนถูกคัดออกเพราะอะไร
     ตรวจจาก store.rows เสมอ จะได้เห็นครบทั้งตอนเปิดและปิดตัวกรอง */
  const audit = auditRows(store.rows, cfg.analysis || {});
  const problemsOf = r => audit.get(r) || null;

  const cols = (b.columns?.length ? b.columns : store.columns);
  const size = b.pageSize || 20;
  const pageCount = Math.max(1, Math.ceil((store.onlyFlagged
    ? rows.filter(r => problemsOf(r)).length : rows.length) / size));
  store.page = Math.min(store.page, pageCount - 1);
  let view = rows;
  if (store.onlyFlagged) view = rows.filter(r => problemsOf(r));
  const pages2 = Math.max(1, Math.ceil(view.length / size));
  store.page = Math.min(store.page, pages2 - 1);
  const slice = view.slice(store.page * size, store.page * size + size);

  /* --- แถบเครื่องมือ --- */
  const tools = el('div', 'table-tools');
  const search = el('input', 'input');
  search.type = 'search';
  search.placeholder = 'ค้นหาในข้อมูล…';
  search.value = store.search;
  search.addEventListener('input', e => {
    store.search = e.target.value;
    store.page = 0;
    rerender();
    const next = document.querySelector('.table-tools input');
    if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
  });
  const info = el('span', 'table-info',
    `${fmt(view.length)} แถว · ${cols.length} คอลัมน์ · หน้า ${store.page + 1}/${pageCount}`);

  // ปุ่มดูเฉพาะแถวที่ติดตัวกรอง — นับจากข้อมูลทั้งชุด ไม่ใช่เฉพาะหน้านี้
  const flagged = rows.filter(r => problemsOf(r)).length;
  const only = el('button', 'odd-btn' + (store.onlyFlagged ? ' on' : ''));
  only.type = 'button';
  only.hidden = !flagged;
  only.innerHTML = `<i class="ms">rule</i><span class="odd-txt">เฉพาะคำตอบที่ใช้ไม่ได้</span>` +
                   `<span class="odd-n">${flagged}</span>`;
  only.title = 'แสดงเฉพาะคนที่ระบบคัดออก พร้อมเหตุผล';
  only.onclick = () => { store.onlyFlagged = !store.onlyFlagged; store.page = 0; rerender(); };
  tools.append(search, only, info);

  /* --- ตาราง --- */
  const scroll = el('div', 'table-scroll');
  const tbl = el('table');
  const thead = el('thead');
  const headRow = el('tr');
  headRow.append(el('th', 'th-toggle'));
  headRow.append(el('th', 'th-flag', 'ตัวกรอง'));
  cols.forEach(c => headRow.append(el('th', isNumericColumn(store.rows, c) ? 'num' : '', c)));
  thead.append(headRow);

  const tbody = el('tbody');
  slice.forEach((r, i) => {
    const tr = el('tr', 'row-main');
    tr.append(el('td', 'td-toggle', '›'));

    const problems = problemsOf(r);
    const st = el('td', 'td-flag');
    if (problems) {
      const chip = el('span', 'flag-chip is-drop', 'ใช้ไม่ได้');
      chip.title = problems.join('\n');
      st.append(chip);
    } else {
      st.append(el('span', 'flag-chip is-ok', 'ใช้ได้'));
    }
    tr.append(st);
    if (problems) tr.classList.add('is-excluded');

    cols.forEach(c => {
      const td = el('td', isNumericColumn(store.rows, c) ? 'num' : '', r[c] ?? '');
      // ช่องที่เป็นต้นเหตุ ให้เห็นชัดว่าเพราะอะไรถึงโดนคัด
      const why = problems && problems.find(p => String(r[c] ?? '').trim() &&
        p.includes(String(r[c] ?? '').trim().slice(0, 24)));
      if (why) { td.classList.add('is-dropped'); td.title = why; }
      else td.title = r[c] ?? '';
      tr.append(td);
    });

    // แถวรายละเอียด — ซ่อนไว้ กางเมื่อคลิก
    const detail = el('tr', 'row-detail');
    detail.hidden = true;
    const cell = el('td');
    cell.colSpan = cols.length + 2;
    cell.append(recordDetail(r, i + store.page * size + 1));
    detail.append(cell);

    tr.onclick = () => {
      const open = !detail.hidden;
      detail.hidden = open;
      tr.classList.toggle('is-open', !open);
    };

    tbody.append(tr, detail);
  });
  tbl.append(thead, tbody);
  scroll.append(tbl);

  /* --- แบ่งหน้า --- */
  const foot = el('div', 'table-foot');
  const pager = el('div', 'pager');
  const prev = el('button', 'btn btn-ghost', 'ก่อนหน้า');
  const next = el('button', 'btn btn-ghost', 'ถัดไป');
  prev.disabled = store.page === 0;
  next.disabled = store.page >= pageCount - 1;
  prev.onclick = () => { store.page--; rerender(); };
  next.onclick = () => { store.page++; rerender(); };
  pager.append(prev, next);
  foot.append(el('span', 'muted small', 'คลิกที่แถวเพื่อดูคำตอบทั้งหมดของคนนั้น'), pager);

  card.append(tools, scroll, foot);
  sec.append(card);
}

/** รายละเอียดของผู้ตอบหนึ่งคน — ทุกคำถาม ข้อความเต็ม คำตอบหลายข้อแยกเป็นชิป */
function recordDetail(row, no) {
  const box = el('div', 'record');
  box.append(el('div', 'record-no', 'ผู้ตอบคนที่ ' + no));

  const list = el('div', 'record-list');
  store.columns.forEach(col => {
    const raw = String(row[col] ?? '').trim();
    if (!raw) return;

    const item = el('div', 'record-item');
    item.append(el('div', 'record-q', col));

    const parts = splitValues(raw, true).filter(v => v && v !== 'ไม่ระบุ');
    if (parts.length > 1) {
      const chips = el('div', 'chips');
      parts.forEach(p => chips.append(el('span', 'chip', p)));
      item.append(chips);
    } else {
      item.append(el('p', 'record-a', raw));
    }
    list.append(item);
  });

  box.append(list);
  return box;
}

/* ---------- ข้อความอธิบาย ---------- */
function notes(host, b) {
  const sec = section(host, b);
  const grid = el('div', 'grid');
  (b.items || []).forEach(item => {
    const card = el('article', 'card note');
    card.append(el('h3', null, item.title));
    card.append(el('p', null, item.body));
    if (item.source) card.append(el('cite', null, item.source));
    grid.append(card);
  });
  sec.append(grid);
}

export 


/* ---------- เสียงจากคำตอบปลายเปิด ---------- */
function textThemes(host, b, rows, cfg) {
  const sec = section(host, b);
  const res = analyzeText(rows, b.column);

  if (!res.total) {
    sec.append(el('p', 'empty', 'ยังไม่มีคำตอบปลายเปิดให้วิเคราะห์'));
    return;
  }

  const meta = el('p', 'sec-note',
    `วิเคราะห์คำตอบ ${fmt(res.total)} ข้อความ · จัดหมวดได้ ${res.coverage}% ` +
    `(ที่เหลือเป็นคำตอบสั้นหรือกำกวม)`);
  sec.append(meta);

  const grid = el('div', 'grid');
  const segs = [];
  res.themes.slice(0, b.top || 6).forEach((t, i) => {
    const card = el('article', 'card theme' + (i === 0 ? ' is-top' : ''));
    card.classList.add(t.kind === 'barrier' ? 'is-barrier' : 'is-pull');

    const head = el('div', 'theme-head');
    head.append(el('span', 'theme-tag', t.kind === 'barrier' ? 'อุปสรรค' : 'แรงดึง'));
    head.append(el('h3', null, t.label));
    card.append(head);

    const fig = el('div', 'theme-figure');
    fig.append(el('b', null, t.share + '%'));
    fig.append(el('span', null, `${fmt(t.count)} จาก ${fmt(res.total)} คำตอบ`));
    card.append(fig);

    const track = el('div', 'cause-track');
    const fill = el('i');
    track.append(fill);
    card.append(track);
    segs.push({ track, value: t.count, color: 'var(--accent)' });
    growBar(fill, t.share);

    if (t.samples.length) {
      const quotes = el('div', 'quotes');
      t.samples.forEach(q => quotes.append(el('span', 'quote', '“' + q + '”')));
      card.append(quotes);
    }

    const fix = el('div', 'cause-fix');
    fix.append(el('span', 'fix-cap', 'วิธีทำ'));
    fix.append(el('p', null, t.method));
    const src = SOURCES[t.source];
    if (src) fix.append(el('cite', null, 'อ้างอิง: ' + src.full));
    card.append(fix);

    grid.append(card);
  });
  sec.append(grid);
  segmentBars(segs, res.total, 'คำตอบ');   // 1 ช่อง = กี่คำตอบ

  if (res.unmatched.length) {
    const rest = el('details', 'unmatched');
    rest.append(Object.assign(el('summary'), { textContent: `คำตอบที่ยังจัดหมวดไม่ได้ (${res.unmatched.length})` }));
    const list = el('div', 'quotes');
    res.unmatched.forEach(q => list.append(el('span', 'quote', '“' + q + '”')));
    rest.append(list);
    sec.append(rest);
  }
}

/* ---------- เทียบกับค่าอ้างอิงภายนอก ---------- */
function benchmarks(host, b, rows, cfg) {
  const sec = section(host, b);
  const A = cfg.analysis || {};

  // คำนวณค่าฝั่งเราให้ตรงกับนิยามของค่าอ้างอิงแต่ละตัว
  const channelShare = kw => rows.length
    ? rows.filter(r => String(r[A.channelCol] ?? '').includes(kw)).length / rows.length * 100 : null;
  const measures = {
    'social-first': aggregate(rows, A.howFoundCol, 'share', { equals: 'บังเอิญ' }),
    tiktok: channelShare('TikTok'),
    facebook: channelShare('Facebook')
  };

  const list = compareBenchmarks(rows, measures);
  const table = el('div', 'bm-list');
  list.forEach(item => {
    const row = el('article', 'card bm-row is-' + item.status);
    const left = el('div', 'bm-main');
    left.append(el('h3', null, item.label));
    left.append(el('p', 'bm-note', item.externalNote || ''));
    left.append(el('cite', null, 'ค่าอ้างอิง: ' + SOURCES[item.source].full));

    const nums = el('div', 'bm-nums');
    const ours = el('div', 'bm-num');
    ours.append(el('span', null, 'กลุ่มตัวอย่างเรา'));
    ours.append(el('b', null, item.ours == null ? '–' : item.ours + item.unit));
    const ext = el('div', 'bm-num is-ext');
    ext.append(el('span', null, 'ค่าอ้างอิง'));
    ext.append(el('b', null, item.external + item.unit));
    nums.append(ours, ext);

    row.append(left, nums);
    row.append(el('p', 'bm-read', item.reading));
    table.append(row);
  });
  sec.append(table);

  if (b.showFacts !== false) {
    const facts = el('div', 'fact-list');
    CONTEXT_FACTS.forEach(f => {
      const item = el('div', 'fact-item');
      item.append(el('p', null, f.text));
      item.append(el('cite', null, SOURCES[f.source].full));
      facts.append(item);
    });
    sec.append(el('h3', 'fact-head', 'ข้อเท็จจริงประกอบจากงานวิจัย'));
    sec.append(facts);
  }
}

/* ---------- สรุปเหตุผล: รวมหลักฐาน 3 ชั้นแล้วบอกว่าต้องทำอะไร ---------- */
function conclusion(host, b, rows, cfg) {
  const A = cfg.analysis || {};
  const v = calcVerdict(rows, A);
  const cz = calcCauses(rows, A, { top: 3 });
  const pl = calcPulls(rows, A, { top: 3 });
  const tx = analyzeText(rows, b.textColumn || A.openTextCol);
  const rec = recommend(rows, A, { top: b.actionCount || 5, textColumn: b.textColumn });

  const sec = section(host, b);
  const card = el('article', 'card summary-card');

  /* ---- 1. สาเหตุหลัก ---- */
  const mainCause = cz[0];
  const barrierTheme = tx.themes.find(t => t.kind === 'barrier');
  const pullTheme = tx.themes.find(t => t.kind === 'pull');

  const q1 = el('div', 'sum-sec');
  q1.append(el('h3', null, '1 · สาเหตุหลัก'));
  if (!mainCause) {
    q1.append(el('p', null, 'ยังมีคำตอบไม่พอจะสรุป'));
  } else {
    const p = el('p', 'sum-lead');
    let html = `คนไม่ดูข่าวโลกเพราะ <b>“${mainCause.label}”</b> มากที่สุด — ` +
               `${mainCause.share}% ของผู้ตอบ`;
    // จะบอกว่า "ตรงกัน" ได้ ต่อเมื่อคำตอบปลายเปิดพูดถึงอุปสรรคเหมือนกัน
    if (barrierTheme) {
      html += ` คำตอบปลายเปิดบอกตรงกันว่า <b>“${barrierTheme.label}”</b> (${barrierTheme.share}%)`;
    } else if (pullTheme) {
      html += ` ส่วนคำตอบปลายเปิดไม่ได้พูดถึงอุปสรรค แต่บอกว่าสิ่งที่ทำให้หยุดดูคือ ` +
              `<b>“${pullTheme.label}”</b> (${pullTheme.share}%) — คือสิ่งที่ข่าวโลกต้องมี`;
    }
    p.innerHTML = html;
    q1.append(p);
  }
  card.append(q1);

  /* ---- 2. ทำไมเป็นแบบนี้ ---- */
  const q2 = el('div', 'sum-sec');
  q2.append(el('h3', null, '2 · ทำไมเป็นแบบนี้'));
  const ev = el('ul', 'evidence');
  ev.append(el('li', null,
    `ผู้ตอบ ${fmt(v.n)} คน รู้จักข่าวโลก ${fmt(round1(v.world))} ข่าว ` +
    `ข่าวดราม่า ${fmt(round1(v.drama))} ข่าว → ${v.answer}`));
  if (pl[0]) ev.append(el('li', null,
    `ข่าวดราม่าชนะเพราะ “${pl[0].label}” (${pl[0].share}%) — สิ่งที่ข่าวโลกมักไม่มี`));
  CONTEXT_FACTS.slice(0, b.factCount || 3).forEach(f => {
    const li = el('li');
    li.append(document.createTextNode(f.text + ' '));
    li.append(el('cite', null, '— ' + SOURCES[f.source].short));
    ev.append(li);
  });
  q2.append(ev);
  card.append(q2);

  /* ---- 3. ทำอะไรก่อน ----
     เรียงตามจำนวนคนที่ติดปัญหานั้น ทุกข้อบอกครบว่า ทำอะไร / แก้ที่ไหน / งานวิจัยพบอะไร */
  const q3 = el('div', 'sum-sec');
  q3.append(el('h3', null, '3 · ทำอะไรก่อน'));
  q3.append(el('p', 'sec-note', 'เรียงตามจำนวนคนที่ติดปัญหานั้น — ข้อบนสุดคุ้มที่สุด'));

  const steps = el('ol', 'steps');
  if (!rec.actions.length) {
    steps.append(el('li', null, 'ยังมีข้อมูลไม่พอจะเสนอแนวทาง'));
  }
  rec.actions.forEach(a => {
    const li = el('li');
    li.append(el('b', null, a.do));

    const meta = el('span', 'step-meta');
    meta.textContent = `แก้ที่: ${a.why} · ${a.share}% ของผู้ตอบ (${fmt(a.count)} คน)`;
    li.append(meta);

    if (a.effect || a.sourceFull) {
      const ref = el('span', 'step-ref');
      if (a.effect) ref.append(document.createTextNode(a.effect + ' '));
      if (a.sourceFull) ref.append(el('cite', null, '— ' + a.sourceFull));
      li.append(ref);
    }
    steps.append(li);
  });
  q3.append(steps);
  card.append(q3);

  if (v.warn) card.append(el('p', 'sum-warn', '⚠︎ ' + v.warn));
  sec.append(card);
}


/* ---------- สรุปของทุกหน้ารวมไว้ที่เดียว ----------
   หน้าแรกควรตอบได้ครบโดยไม่ต้องกดเข้าไปทีละหน้า
   ตัวเลขทุกตัวคำนวณสด ๆ จากข้อมูลชุดเดียวกับหน้านั้น ๆ ไม่ได้พิมพ์ค่าไว้
   เพิ่ม/แก้หัวข้อ: แก้ที่อาร์เรย์ cards ด้านล่างนี้ที่เดียว */
function pageDigest(host, b, rows, cfg) {
  const A = cfg.analysis || {};
  const sec = section(host, b);

  const v = calcVerdict(rows, A);
  const cz = calcCauses(rows, A, { top: 1 })[0];
  const pl = calcPulls(rows, A, { top: 1 })[0];
  const rec = recommend(rows, A, { top: 1 }).actions[0];

  const share = (col, needle) => {
    const g = groupRows(rows, { x: col, agg: 'count', sort: 'value' });
    const i = g.labels.findIndex(l => l.includes(needle));
    return i < 0 ? null : { label: g.labels[i], share: pct(g.values[i], rows.length || 1) };
  };
  const topOf = col => {
    const g = groupRows(rows, { x: col, multi: true, agg: 'count', sort: 'value', top: 1 });
    return g.labels.length ? { label: g.labels[0], share: pct(g.values[0], rows.length || 1) } : null;
  };

  const accident = share(A.howFoundCol, 'บังเอิญ');   // เจอยังไง ไม่ใช่ช่องทางไหน
  const channel = b.channelColumn ? topOf(b.channelColumn) : null;

  const cards = [
    { page: 'gap', icon: 'balance',
      big: v.stats ? (v.stats.meanDiff > 0 ? '+' : '') + round1(v.stats.meanDiff) : '–',
      unit: 'ข่าว/คน',
      line: `ข่าวดราม่านำข่าวโลกเท่านี้ต่อคน — ${v.answer}` },

    { page: 'reasons', icon: 'psychology',
      big: cz ? cz.share : '–', unit: '%',
      line: cz ? `ไม่ดูข่าวโลกเพราะ “${cz.label}” มากที่สุด` : 'ยังไม่มีคำตอบ' },

    { page: 'behavior', icon: 'touch_app',
      big: accident ? accident.share : '–', unit: '%',
      line: accident
        ? `เจอข่าวโดยบังเอิญ ไม่ได้ตั้งใจหา${channel ? ` · ช่องทางหลักคือ ${channel.label}` : ''}`
        : 'ยังไม่มีข้อมูลช่องทาง' },

    { page: 'conclusion', icon: 'lightbulb',
      big: rec ? rec.share : '–', unit: '%',
      line: rec ? `ทำก่อน: ${rec.do}` : 'ยังมีข้อมูลไม่พอจะเสนอแนวทาง' },

    { page: 'data', icon: 'database',
      big: rows.length, unit: 'แถว',
      line: `ข้อมูลดิบ ${fmt(store.columns.length)} คอลัมน์ ตรวจย้อนกลับได้ทุกคำตอบ` }
  ];

  const byId = Object.fromEntries((cfg.pages || []).map(p => [p.id, p]));
  const grid = el('div', 'grid');

  cards.forEach(c => {
    const page = byId[c.page] || {};
    const card = el('a', 'card digest');
    card.href = '#/' + c.page;

    const head = el('div', 'digest-head');
    head.append(el('span', 'digest-ico', ''));
    head.lastChild.innerHTML = `<i class="ms">${page.icon || c.icon}</i>`;
    head.append(el('b', null, page.label || c.page));
    card.append(head);

    const fig = el('div', 'digest-fig');
    fig.append(el('b', null, String(c.big)));
    fig.append(el('span', null, c.unit));
    card.append(fig);

    card.append(el('p', 'digest-line', c.line));
    card.append(el('span', 'digest-go', 'ดูรายละเอียด →'));
    grid.append(card);
  });

  sec.append(grid);
}


/* ---------- สไลด์นำเสนอ ----------
   เนื้อหาทุกสไลด์ดึงจากข้อมูลจริงที่กำลังแสดงอยู่ ไม่ได้พิมพ์ตัวเลขค้างไว้
   เปลี่ยนชุดข้อมูล (ฟอร์มจริง / ชุดทดสอบ) แล้วสไลด์เปลี่ยนตามทันที
   แก้ลำดับ/หัวข้อสไลด์: แก้อาร์เรย์ deck ด้านล่างที่เดียว */
function slides(host, b, rows, cfg) {
  const A = cfg.analysis || {};
  const sec = section(host, b);

  const v = calcVerdict(rows, A);
  const cz = calcCauses(rows, A, { top: 3 });
  const pl = calcPulls(rows, A, { top: 3 });
  const tx = analyzeText(rows, b.textColumn || A.openTextCol);
  const rec = recommend(rows, A, { top: 3, textColumn: b.textColumn }).actions;

  const list = (items, cls = 'slide-list') => {
    const ul = el('ul', cls);
    items.filter(Boolean).forEach(t => {
      const li = el('li');
      li.innerHTML = t;
      ul.append(li);
    });
    return ul;
  };
  const big = (value, unit, note) => {
    const box = el('div', 'slide-big');
    box.append(el('b', null, String(value)));
    if (unit) box.append(el('span', null, unit));
    if (note) box.append(el('p', null, note));
    return box;
  };

  /* ---- ภาพประกอบสไลด์ ----
     กราฟทุกตัวถูกออกแบบมาสำหรับพื้นขาว จึงวางไว้ในแผงขาว (.slide-fig) บนสไลด์พื้นเข้ม
     ไม่ต้องทำกราฟชุดใหม่สำหรับพื้นเข้ม และสีทุกสีตรงกับที่เห็นในหน้าอื่นของแดชบอร์ด */
  const figRank = (col, top, unit) => host2 =>
    CHARTS.rank(host2, { x: col, multi: true, agg: 'count', sort: 'value', top,
                         showPercent: true, valueUnit: unit || 'คน',
                         color: 'var(--purple)' }, rows);

  const figDonut = col => host2 =>
    CHARTS.donut(host2, { x: col, agg: 'count', sort: 'value', colors: undefined }, rows);

  // เทียบสองฝั่งแบบกระชับ: ตัวเลขใหญ่ + หลอดแบ่งช่องชุดเดียวกับทั้งเว็บ
  const figVersus = host2 => {
    const box = el('div', 'fig-vs');
    const max = Math.ceil(Math.max(v.world || 0, v.drama || 0, 1));
    const segs = [];
    [['ข่าวโลก', v.world, 'var(--graphite)'],
     ['ข่าวดราม่า', v.drama, 'var(--purple)']].forEach(([label, value, color]) => {
      const row = el('div', 'fig-vs-row');
      const head = el('div', 'fig-vs-head');
      head.append(el('span', null, label), el('b', null, fmt(round1(value)) + ' ข่าว'));
      const track = el('div', 'fig-vs-track');
      const fill = el('i');
      fill.style.setProperty('--c', color);
      track.append(fill);
      row.append(head, track);
      box.append(row);
      segs.push({ track, value, color });
      growBar(fill, (value / max) * 100);
    });
    host2.append(box);
    segmentBars(segs, max, 'ข่าว');
    if (v.stats) {
      host2.append(el('p', 'fig-note',
        `ต่างกัน ${round1(Math.abs(v.stats.meanDiff))} ข่าวต่อคน · ` +
        `ช่วงความเชื่อมั่น 95% ${round1(v.stats.ci[0])} ถึง ${round1(v.stats.ci[1])}`));
    }
  };

  // ตารางสรุปว่าวัดอะไร ด้วยอะไร ได้ค่าออกมาเป็นอะไร
  const figSpec = host2 => {
    const spec = [
      ['ข่าวโลกที่รู้จัก', 'ให้เลือกจากข่าวจริง 10 ข่าว', '0–10 ข่าว'],
      ['ข่าวดราม่าที่รู้จัก', 'ให้เลือกจากข่าวจริง 10 ข่าว', '0–10 ข่าว'],
      ['เหตุผลที่ไม่เลือกข่าวโลก', 'เลือกได้ 3 ข้อจากตัวเลือกที่กำหนด', 'สัดส่วนผู้ตอบ'],
      ['เหตุผลที่เลือกข่าวดราม่า', 'เลือกได้ 3 ข้อจากตัวเลือกที่กำหนด', 'สัดส่วนผู้ตอบ'],
      ['วิธีที่เจอข่าว', 'บังเอิญเลื่อนเจอ หรือตั้งใจหาเอง', 'สัดส่วนผู้ตอบ'],
      ['เหตุผลในคำพูดตัวเอง', 'ช่องพิมพ์อิสระ ไม่มีตัวเลือกให้', 'จัดกลุ่มตามคำสำคัญ']
    ];
    const table = el('div', 'fig-spec');
    const head = el('div', 'fig-spec-row is-head');
    ['วัดอะไร', 'วัดอย่างไร', 'ได้ค่าเป็น'].forEach(t => head.append(el('span', null, t)));
    table.append(head);
    spec.forEach(cells => {
      const row = el('div', 'fig-spec-row');
      cells.forEach((t, k) => row.append(el('span', k === 0 ? 'is-key' : '', t)));
      table.append(row);
    });
    host2.append(table);
  };

  // ธีมจากคำตอบปลายเปิด — หลอดสั้น ๆ พร้อมสัดส่วน
  const figThemes = host2 => {
    const top = tx.themes.filter(t => t.count).slice(0, 5);
    if (!top.length) { host2.append(el('p', 'fig-note', 'ยังไม่มีคำตอบปลายเปิด')); return; }
    const max = Math.max(...top.map(t => t.count), 1);
    const box = el('div', 'fig-bars');
    top.forEach(t => {
      const row = el('div', 'fig-bar-row');
      const head = el('div', 'fig-vs-head');
      head.append(el('span', null, t.label), el('b', null, t.share + '%'));
      const track = el('div', 'fig-vs-track');
      const fill = el('i');
      fill.style.setProperty('--c', 'var(--purple)');
      track.append(fill);
      growBar(fill, (t.count / max) * 100);
      track.append(fill);
      row.append(head, track);
      box.append(row);
    });
    host2.append(box);
    const q = tx.themes.find(t => t.samples && t.samples.length);
    if (q) host2.append(el('p', 'fig-note', '“' + q.samples[0] + '”'));
  };

  // เดาไว้ vs เจอจริง — ตัดสินจากข้อมูลที่กำลังแสดงอยู่ ไม่ได้พิมพ์ค้างไว้
  const shareOf = (col, needle) => {
    if (!col) return null;
    const g = groupRows(rows, { x: col, agg: 'count', sort: 'value' });
    const k = g.labels.findIndex(l => l.includes(needle));
    return k < 0 ? null : pct(g.values[k], rows.length || 1);
  };
  const accident = shareOf(A.howFoundCol, 'บังเอิญ');
  const causeShare = key => {
    const c = calcCauses(rows, A, { top: 20 }).find(x => x.label.includes(key));
    return c ? c.share : null;
  };
  const near = causeShare('ไกลตัว');
  const checks = [
    { claim: 'คนรู้จักข่าวดราม่ามากกว่าข่าวโลกจริง',
      got: v.stats
        ? `${v.stats.meanDiff > 0 ? 'ข่าวดราม่านำ' : 'ข่าวโลกนำ'} ${round1(Math.abs(v.stats.meanDiff))} ข่าวต่อคน` +
          ` (p ${v.stats.p < 0.001 ? '< 0.001' : '= ' + v.stats.p.toFixed(3)})`
        : 'ข้อมูลยังไม่พอตัดสิน',
      ok: v.stats ? v.stats.meanDiff > 0 && v.stats.p < 0.05 : null },
    { claim: 'คนส่วนใหญ่ไม่ได้เลือกข่าวเอง แต่ฟีดเลือกให้',
      got: accident == null ? 'ยังไม่มีข้อมูลว่าเจอข่าวอย่างไร' : `เจอข่าวโดยบังเอิญ ${accident}% ของผู้ตอบ`,
      ok: accident == null ? null : accident >= 50 },
    { claim: 'ข่าวโลกถูกข้ามเพราะรู้สึกว่าไม่เกี่ยวกับตัวเอง',
      got: near == null ? 'ยังไม่มีใครตอบเหตุผลนี้' : `“รู้สึกไกลตัว” ถูกเลือก ${near}% ของผู้ตอบ`,
      ok: near == null ? null : near >= 30 }
  ];

  const deck = [
    { tag: 'หัวข้อ', title: b.topic || 'คนไทยเสพดราม่ามากกว่าข่าวโลกจริงหรือไม่',
      build: s => {
        s.append(el('p', 'slide-lead', b.subtitle || 'รายงานผลสำรวจพฤติกรรมการเสพข่าว'));
        s.append(list([
          `เก็บข้อมูลจากผู้ตอบ <b>${fmt(v.n)} คน</b>`,
          'วัดจากข่าวจริงฝั่งละ 10 ข่าว ไม่ได้ถามความรู้สึก',
          'ทุกข้อสรุปมีตัวเลขและวิธีคำนวณกำกับ'
        ]));
        s.append(el('p', 'slide-sub', 'ลำดับการนำเสนอ: คำถาม → สิ่งที่คาดไว้ → วิธีวัด → ผลที่ได้ → สิ่งที่ต้องทำต่อ'));
      } },

    { tag: 'คำถาม', title: 'คำถามของงานนี้',
      build: s => {
        s.append(el('p', 'slide-quote', '“คนไทยชอบเสพสื่อดราม่า แต่ไม่เสพข่าวโลก จริงหรือไม่?”'));
        s.append(list([
          'เป็นความเชื่อที่ได้ยินกันบ่อย แต่ยังไม่เคยมีตัวเลขยืนยัน',
          'ถ้าจริง — ต้องรู้ต่อว่าติดตรงไหน จะได้แก้ถูกจุด',
          'ถ้าไม่จริง — ก็ไม่ควรตัดสินใจบนความเชื่อนั้นอีก'
        ]));
      } },

    { tag: 'สิ่งที่คาดไว้', title: 'สมมติฐานก่อนเก็บข้อมูล',
      build: s => {
        s.append(el('p', 'slide-lead', 'ตั้งไว้สามข้อ เพื่อให้ตรวจสอบได้ทีละข้อว่าถูกหรือผิด'));
        s.append(list([
          '<b>1 · ดราม่าเป็นเรื่องใกล้ตัว</b> ใครก็เข้าถึงได้ และรู้สึกว่าอาจเกิดกับตัวเอง คนจึงจำได้มากกว่า',
          '<b>2 · แพลตฟอร์มดันเรื่องที่เรียกความสนใจ</b> คนจึงเจอดราม่าโดยไม่ได้ตั้งใจหา',
          '<b>3 · ข่าวโลกรู้สึกไกลตัวและใหญ่เกินไป</b> เหมือนยังไม่กระทบตอนนี้ จึงถูกเลื่อนผ่าน'
        ]));
      } },

    { tag: 'วิธีวัด', title: 'วัดอะไรบ้าง และวัดอย่างไร',
      fig: figSpec,
      build: s => {
        s.append(el('p', 'slide-lead', 'ใช้แบบสอบถามชุดเดียว ถามจากสิ่งที่เกิดขึ้นจริง ไม่ถามว่า “ถ้า…จะทำไหม”'));
        s.append(list([
          '<b>ตัวชี้วัดหลัก</b> ให้เลือกข่าวที่รู้จักจริงจากชุดข่าวโลก 10 ข่าว และชุดข่าวดราม่า 10 ข่าว',
          '<b>คนเดียวกันตอบทั้งสองฝั่ง</b> จึงเทียบกันได้โดยตรง ความต่างระหว่างบุคคลถูกตัดออก',
          '<b>ถามเหตุผลต่อทันที</b> ทั้งข้อที่เลือกและข้อที่ไม่เลือก',
          '<b>เปิดช่องให้พิมพ์เอง</b> เพื่อจับเหตุผลที่ตัวเลือกสำเร็จรูปไม่ครอบคลุม'
        ]));
      } },

    { tag: 'วิธีวัด', title: 'ตัดสินด้วยเกณฑ์อะไร',
      build: s => {
        s.append(el('p', 'slide-lead', 'ตั้งเกณฑ์ไว้ตั้งแต่ก่อนเห็นผล เพื่อไม่ให้ตีความเข้าข้างสิ่งที่คาดไว้'));
        s.append(list([
          `<b>ขนาดกลุ่มตัวอย่าง</b> ต้องมีอย่างน้อย ${v.minSample} คนจึงจะสรุป`,
          '<b>ต่างกันจริงไหม</b> ใช้การทดสอบแบบจับคู่รายคน ต้องมีนัยสำคัญที่ p &lt; 0.05',
          '<b>ตรวจซ้ำอีกวิธี</b> ด้วยการทดสอบที่ไม่อิงการแจกแจงปกติ ผลต้องไปทางเดียวกัน',
          '<b>ต่างมากพอไหม</b> รายงานขนาดผลต่างและช่วงความเชื่อมั่น 95% ควบคู่เสมอ',
          '<b>เงื่อนไขหักล้าง</b> ถ้าข่าวโลกเท่ากันหรือมากกว่า ถือว่าสมมติฐานไม่ผ่าน'
        ]));
      } },

    { tag: 'ผลที่ได้', title: 'ผลสรุป: ' + v.answer,
      fig: figVersus,
      build: s => {
        s.append(big(
          (v.stats && v.stats.meanDiff > 0 ? '+' : '') + (v.stats ? round1(v.stats.meanDiff) : '–'),
          'ข่าวต่อคน', 'ส่วนต่างเฉลี่ยระหว่างสองฝั่ง'));
        s.append(list([
          `เฉลี่ยแล้วรู้จักข่าวโลก <b>${fmt(round1(v.world))}</b> ข่าว เทียบกับข่าวดราม่า <b>${fmt(round1(v.drama))}</b> ข่าว`,
          v.stats ? `นัยสำคัญ p = ${v.stats.p < 0.001 ? '<0.001' : v.stats.p.toFixed(3)} · ขนาดผลต่างระดับ${v.stats.effect}` : null,
          v.stats ? 'ผลจากการทดสอบอีกวิธีไปทางเดียวกัน' : null
        ]));
      } },

    { tag: 'ผลที่ได้', title: 'ทำไมข่าวโลกถึงถูกข้าม',
      fig: figRank(A.whyNotWorldCol, 4),
      build: s => {
        s.append(el('p', 'slide-lead', 'เหตุผลที่ผู้ตอบเลือกเอง เรียงจากที่ถูกเลือกมากที่สุด'));
        s.append(list(cz.map((c, i) => `<b>${i + 1}. ${c.label}</b> — ${c.share}% ของผู้ตอบ`)));
        if (cz[0]) s.append(el('p', 'slide-sub', 'ข้อแรกคือจุดที่คุ้มที่สุดที่จะแก้ก่อน'));
      } },

    { tag: 'ผลที่ได้', title: 'ข่าวดราม่าได้เปรียบตรงไหน',
      fig: figRank(A.whyDramaCol, 4),
      build: s => {
        s.append(el('p', 'slide-lead', 'องค์ประกอบที่ทำให้คนหยุดดู ซึ่งข่าวโลกมักไม่มี'));
        s.append(list(pl.map(p => `<b>${p.label}</b> — ${p.share}% ของผู้ตอบ`)));
      } },

    { tag: 'ผลที่ได้', title: 'คนเจอข่าวได้อย่างไร',
      fig: figDonut(A.howFoundCol),
      build: s => {
        s.append(el('p', 'slide-lead', 'จุดนี้ชี้ว่าควรไปวางข่าวไว้ตรงไหน'));
        s.append(list([
          accident != null
            ? `<b>${accident}% เจอข่าวโดยบังเอิญ</b> ระหว่างใช้โซเชียล ไม่ได้ตั้งใจหา`
            : 'ยังไม่มีข้อมูลว่าผู้ตอบเจอข่าวอย่างไร',
          'แปลว่าฟีดเป็นคนเลือกข่าวให้ ไม่ใช่ผู้ใช้เลือกเอง',
          'การรอให้คนเข้ามาหาข่าวเองจึงได้ผลน้อยกว่าการไปอยู่ในฟีด'
        ]));
      } },

    { tag: 'ผลที่ได้', title: 'เหตุผลในคำพูดของผู้ตอบเอง',
      fig: figThemes,
      build: s => {
        s.append(el('p', 'slide-lead',
          `จากคำตอบแบบพิมพ์เอง ${fmt(tx.total)} ข้อความ จัดกลุ่มได้ ${tx.coverage}%`));
        s.append(list([
          'ไม่ใช่ตัวเลือกสำเร็จรูป จึงเห็นเหตุผลที่แบบสอบถามไม่ได้เตรียมไว้',
          'จัดกลุ่มด้วยคำสำคัญที่เปิดให้ตรวจสอบย้อนกลับได้ทุกข้อความ',
          'ผลที่ได้ไปทางเดียวกับข้อที่ผู้ตอบเลือกจากตัวเลือก'
        ]));
      } },

    { tag: 'ผลที่ได้', title: 'สมมติฐานผ่านหรือไม่',
      build: s => {
        const ul = el('ul', 'slide-check');
        checks.forEach((c, i) => {
          const li = el('li', c.ok === null ? 'is-unknown' : c.ok ? 'is-yes' : 'is-no');
          li.innerHTML = `<b>${i + 1} · ${c.claim}</b>` +
            `<span class="slide-sub">${c.ok === null ? 'ยังตัดสินไม่ได้' : c.ok ? 'ผ่าน' : 'ไม่ผ่าน'} — ${c.got}</span>`;
          ul.append(li);
        });
        s.append(ul);
      } },

    { tag: 'ข้อควรระวัง', title: 'ขอบเขตของข้อสรุปนี้',
      build: s => {
        s.append(el('p', 'slide-lead', 'บอกไว้ก่อนเพื่อไม่ให้นำผลไปใช้เกินกว่าที่ข้อมูลรองรับ'));
        s.append(list([
          v.warn ? v.warn : `ผู้ตอบ ${fmt(v.n)} คน ผ่านเกณฑ์ขั้นต่ำที่ตั้งไว้ ${v.minSample} คน`,
          'กลุ่มตัวอย่างเป็นนักศึกษาช่วงอายุใกล้กัน ยังไม่ใช่ภาพของคนไทยทั้งประเทศ',
          'ชุดข่าวที่ใช้วัดเป็นตัวแทนที่คัดมา ไม่ใช่ข่าวทั้งหมดที่มีอยู่จริง',
          'เป็นการตอบด้วยตัวเอง จึงยังไม่ได้ยืนยันด้วยพฤติกรรมการใช้งานจริง',
          'ตัวเลขทุกตัวคำนวณสดจากชุดข้อมูลที่กำลังเปิดอยู่ ตรวจย้อนกลับได้'
        ]));
      } },

    { tag: 'ขั้นต่อไป', title: 'สิ่งที่ควรทำต่อ',
      build: s => {
        s.append(el('p', 'slide-lead', 'เรียงจากจำนวนคนที่ได้ประโยชน์มากที่สุดก่อน'));
        s.append(list(rec.map((a, i) =>
          `<b>${i + 1}. ${a.do}</b><br><span class="slide-sub">แก้ที่ ${a.why} · เกี่ยวข้องกับผู้ตอบ ${a.share}%` +
          (a.sourceShort ? ` · อ้างอิง ${a.sourceShort}` : '') + '</span>')));
      } }
  ];

  /* ---- วาดกอง slide + ปุ่มควบคุม ---- */
  const wrap = el('div', 'deck');
  const stage = el('div', 'deck-stage');

  deck.forEach((d, i) => {
    const slide = el('article', 'slide' + (i === 0 ? ' on' : ''));
    slide.append(el('span', 'slide-tag', `${i + 1}/${deck.length} · ${d.tag}`));
    slide.append(el('h3', null, d.title));

    // สไลด์ที่มีภาพประกอบแบ่งเป็นสองคอลัมน์ (จอแคบจะซ้อนลงมาเอง ดู 5-analysis.css)
    const cols = el('div', d.fig ? 'slide-cols' : 'slide-one');
    const text = el('div', 'slide-text');
    d.build(text);
    cols.append(text);
    if (d.fig) {
      const fig = el('div', 'slide-fig');
      d.fig(fig);
      cols.append(fig);
    }
    slide.append(cols);
    stage.append(slide);
  });

  const nav = el('div', 'deck-nav');
  const prev = el('button', 'btn btn-ghost', '←');
  const next = el('button', 'btn btn-ghost', '→');
  const dots = el('div', 'deck-dots');
  const count = el('span', 'deck-count');
  const full = el('button', 'btn btn-ghost deck-full');
  prev.type = next.type = full.type = 'button';
  prev.title = 'สไลด์ก่อนหน้า (ปุ่มลูกศรซ้าย)';
  next.title = 'สไลด์ถัดไป (ปุ่มลูกศรขวา)';
  full.append(el('i', 'ms', 'fullscreen'));

  let at = 0;
  const show = i => {
    at = (i + deck.length) % deck.length;
    stage.querySelectorAll('.slide').forEach((s, k) => s.classList.toggle('on', k === at));
    dots.querySelectorAll('button').forEach((d, k) => d.classList.toggle('on', k === at));
    count.textContent = `${at + 1} / ${deck.length}`;
  };
  deck.forEach((d, i) => {
    const dot = el('button', i === 0 ? 'on' : '');
    dot.type = 'button';
    dot.title = d.title;
    dot.onclick = () => show(i);
    dots.append(dot);
  });
  prev.onclick = () => show(at - 1);
  next.onclick = () => show(at + 1);

  /* ---- เต็มจอ ----
     ทำสองชั้น: กางกล่องให้เต็มหน้าต่างด้วย CSS เสมอ (ได้ผลทุกเบราว์เซอร์ รวมถึง iPhone
     ที่ขอเต็มจอกับ element ไม่ได้) แล้วค่อยขอ Fullscreen API เพิ่มเพื่อซ่อนแถบเบราว์เซอร์
     ถ้าขอไม่ได้ก็ไม่เป็นไร ผู้ใช้ยังได้จอเต็มเหมือนเดิม */
  const nativeOn = () => (document.fullscreenElement || document.webkitFullscreenElement) === wrap;
  const syncFull = on => {
    wrap.classList.toggle('is-full', on);   // ล็อกการเลื่อนหน้าด้วย CSS :has() จะได้ไม่มีสถานะค้าง
    full.title = on ? 'ออกจากเต็มจอ (Esc หรือกด F)' : 'นำเสนอเต็มจอ (กด F)';
    full.firstChild.textContent = on ? 'fullscreen_exit' : 'fullscreen';
  };
  const enter = () => {
    syncFull(true);
    const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
    if (req) Promise.resolve(req.call(wrap)).catch(() => {});   // ถูกปฏิเสธก็ปล่อยผ่าน
  };
  const leave = () => {
    syncFull(false);
    if (nativeOn()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  };
  const toggleFull = () => (wrap.classList.contains('is-full') ? leave() : enter());
  full.onclick = toggleFull;

  // ผู้ใช้กด Esc เอง เบราว์เซอร์จะออกจาก native fullscreen ให้ ต้องถอดคลาสตาม
  const onFullChange = () => {
    if (!document.body.contains(stage)) {
      document.removeEventListener('fullscreenchange', onFullChange);
      document.removeEventListener('webkitfullscreenchange', onFullChange);
      return;
    }
    if (!nativeOn()) syncFull(false);
  };
  document.addEventListener('fullscreenchange', onFullChange);
  document.addEventListener('webkitfullscreenchange', onFullChange);

  // ลูกศรซ้าย/ขวาเลื่อนสไลด์ · F เข้า-ออกเต็มจอ — ผูกกับหน้านี้เท่านั้น ออกจากหน้าแล้วถอดออก
  const onKey = e => {
    if (!document.body.contains(stage)) { document.removeEventListener('keydown', onKey); return; }
    const t = e.target;   // อาจเป็น document ได้ ต้องเช็คก่อนเรียก closest
    if (t && t.closest && t.closest('input, select, textarea')) return;
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
    if (e.key === 'f' || e.key === 'F') toggleFull();
    if (e.key === 'Escape' && wrap.classList.contains('is-full')) leave();
  };
  document.addEventListener('keydown', onKey);

  nav.append(prev, dots, next, count, full);
  wrap.append(stage, nav);
  sec.append(wrap);
  show(0);
  syncFull(false);
}

export const BLOCKS = { charts, verdict, causes, pull, table, notes, textThemes, benchmarks, conclusion, pageDigest, slides };
