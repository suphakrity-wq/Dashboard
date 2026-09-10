/* [ui] กราฟทั้งหมดวาดเองด้วย HTML/SVG — ไม่ใช้ไลบรารีภายนอก
 *
 * แก้ไฟล์นี้เมื่อ: อยากเพิ่มรูปแบบกราฟใหม่ หรือปรับหน้าตากราฟเดิม
 * วิธีเพิ่มกราฟใหม่:
 *   1. เขียนฟังก์ชัน myChart(host, cf, rows) — cf คือค่าที่ตั้งไว้ในไฟล์หน้า
 *   2. เติมชื่อลงใน CHARTS (มี Object.assign เพิ่มไว้ท้ายไฟล์)
 *   3. เรียกใช้: { type: "myChart", … } ในบล็อก charts ของหน้า
 * ข้อตกลง: ดึงข้อมูลผ่าน groupBy/crossTab จาก core/compute.js เท่านั้น
 */

import { el, growBar, segmentBars } from './dom.js?v=155';
import { fmt, round1, pct } from '../core/format.js?v=155';
import { num, groupBy, crossTab, avgOf, pickGroupColumn, distinctValues, compareGroups } from '../core/compute.js?v=155';
import { welchTTest } from '../core/stats.js?v=155';

/* สีของหลอดสื่อ "สถานะ" ไม่ใช่ชื่อชุดข้อมูล:
   ฝั่งที่มีค่ามากกว่า = ม่วง (สีเด่นของงานนี้) อีกฝั่ง = เทาเข้ม
   ช่องที่ยังไม่ถึงค่าเป็นสีจาง คุมอยู่ใน 4-components.css
   ทุกแถวมีชื่อชุดข้อมูลกำกับอยู่แล้ว จึงไม่ต้องพึ่งสีเพื่อบอกว่าแถวไหนคืออะไร */
const LEAD_COLOR = 'var(--purple)';
const REST_COLOR = 'var(--graphite)';
const barColor = (value, top) => (value >= top ? LEAD_COLOR : REST_COLOR);

/* ---------- 1. อันดับพร้อมหลอดวัดค่า ---------- */
export function rank(host, cf, rows) {
  const { labels, values } = groupBy(rows, cf);
  // ปัดเพดานขึ้นเป็นจำนวนเต็ม เพื่อให้หลอดแบบแบ่งบล็อก 1 บล็อก = 1 หน่วยพอดี
  const max = Math.ceil(Math.max(...values, 1));
  const list = el('div', 'rank');
  const segs = [];   // เก็บหลอดทั้งกราฟไว้ตัดสินใจแบ่งบล็อกพร้อมกันทีเดียว

  labels.forEach((label, i) => {
    const row = el('div', 'rank-row' + (i === 0 ? ' is-top' : ''));
    row.style.animationDelay = Math.min(i, 6) * 28 + 'ms';  // หน่วงสูงสุด 168ms ไม่ว่ารายการจะยาวแค่ไหน

    const no = el('span', 'rank-no', String(i + 1).padStart(2, '0'));
    if (i === 0) row.append(el('span', 'rank-top-tag', cf.topLabel || 'อันดับ 1'));

    const body = el('div', 'rank-body');
    const name = el('span', 'rank-label', label);
    name.title = label;
    const track = el('div', 'rank-track');
    const fill = el('i', 'rank-fill');
    fill.style.setProperty('--c', cf.color || 'var(--accent)');
    track.append(fill);
    body.append(name, track);

    const val = el('div', 'rank-val');
    val.append(el('b', null, fmt(round1(values[i])) + (cf.valueUnit ? ' ' + cf.valueUnit : '')));
    if (cf.showPercent && rows.length) {
      val.append(el('span', null, `${pct(values[i], rows.length)}% ของ ${rows.length} คน`));
    }

    row.append(no, body, val);
    list.append(row);
    segs.push({ track, value: values[i], color: cf.color || 'var(--accent)' });
    growBar(fill, values[i] / max * 100);
  });
  // blockUnit = ชื่อหน่วยสำหรับข้อความ "1 ช่อง = N หน่วย" (ไม่แสดงในหน้าเว็บ ใช้ตอนชี้ค้าง)
  segmentBars(segs, max, cf.blockUnit || cf.valueUnit || cf.unit || '');

  host.append(list);
}

/* ---------- 2. เทียบสองฝั่ง: สองข้างพร้อมส่วนต่างตรงกลาง ---------- */
export function gap(host, cf, rows) {
  const [A, B] = cf.ys;
  const totalA = avgOf(rows, A.column) ?? 0, totalB = avgOf(rows, B.column) ?? 0;
  const max = Math.ceil(Math.max(totalA, totalB, 1));
  const hi = totalB >= totalA ? B : A;
  const hiV = Math.max(totalA, totalB), loV = Math.min(totalA, totalB);
  const diffPct = loV ? Math.round((hiV / loV - 1) * 100) : 0;
  const diffAbs = round1(hiV - loV);

  /* --- ส่วนบน: สองฝั่ง + ส่วนต่างตรงกลาง --- */
  const versus = el('div', 'versus');
  const sideSegs = [];
  const side = (series, value, cls) => {
    const box = el('div', 'vs-side ' + cls);
    const head = el('div', 'vs-label');
    const dot = el('i', 'dot'); dot.style.background = series.color;
    head.append(dot, series.label);
    const value_ = el('div', 'vs-num', fmt(round1(value)));
    value_.style.color = series.color;
    value_.append(el('small', null, cf.unit || ''));
    const track = el('div', 'vs-track');
    const fill = el('i');
    fill.style.setProperty('--c', series.color);
    track.append(fill);
    box.append(head, value_, track);
    sideSegs.push({ track, value, color: series.color });
    growBar(fill, value / max * 100);
    return box;
  };

  const mid = el('div', 'vs-mid');
  mid.innerHTML = `<span class="vs-cap">ต่างกัน</span>
    <b>${fmt(diffAbs)}</b><span class="vs-unit">${cf.unit || ''}</span>
    <span class="vs-chip">${hi.label}นำ ${fmt(diffPct)}%</span>`;

  versus.append(side(A, totalA, 'is-a'), mid, side(B, totalB, 'is-b'));
  host.append(versus);
  segmentBars(sideSegs, max, cf.unit || '');

  /* --- ส่วนล่าง: แยกตามกลุ่ม พร้อมส่วนต่างรายกลุ่ม ---
     ถ้ามิติหลักมีค่าเดียว (เช่น ผู้ตอบอยู่ช่วงอายุเดียวกันหมด) ให้ลองมิติสำรอง
     ถ้ายังไม่มีอีก ก็ไม่ต้องแสดงส่วนนี้ ดีกว่าโชว์กราฟแถวเดียว */
  const groupCol = pickGroupColumn(rows, [cf.x, ...(cf.groupFallback || [])]);
  if (!groupCol) {
    host.append(el('p', 'hint', cf.singleGroupNote ||
      'ผู้ตอบทั้งหมดอยู่กลุ่มเดียวกัน จึงยังไม่มีการแยกกลุ่มให้เปรียบเทียบ'));
    return;
  }
  const gA = groupBy(rows, { ...cf, x: groupCol, y: A.column });
  const gB = groupBy(rows, { ...cf, x: groupCol, y: B.column });
  const groupMax = Math.ceil(Math.max(...gA.values, ...gB.values, 1));

  if (gA.labels.length) {
    const sub = el('div', 'subgroup');
    const subSegs = [];
    const cap = el('div', 'sub-head');
    cap.append(el('span', 'subcap', (cf.groupLabel || 'แยกตามกลุ่ม') + ` · ${groupCol}`));
    const legend = el('div', 'sub-legend');
    [['var(--purple)', 'ฝั่งที่นำ'], ['var(--graphite)', 'อีกฝั่ง'], ['var(--track)', 'ยังไม่ถึงค่านี้']]
      .forEach(([color, text]) => {
        const item = el('span');
        const dot = el('i', 'dot'); dot.style.background = color;
        item.append(dot, text);
        legend.append(item);
      });
    cap.append(legend);
    sub.append(cap);

    gA.labels.forEach((label, i) => {
      const a = gA.values[i], b = gB.values[i];
      const row = el('div', 'sg-row');
      const name = el('div', 'sg-name');
      name.append(el('b', null, label));
      const lead = b >= a ? B : A;
      const d = Math.abs(round1(b - a));
      name.append(el('span', 'sg-diff', d ? `${lead.label}นำ ${fmt(d)}` : 'เท่ากัน'));
      row.append(name);

      const bars = el('div', 'sg-bars');
      const top = Math.max(a, b);
      [[A, a], [B, b]].forEach(([series, value]) => {
        const isLead = value >= top;
        const color = barColor(value, top);
        const line = el('div', 'sg-line' + (isLead ? ' is-lead' : ''));
        line.append(el('span', 'sg-nm', series.label));   // ชื่อชุดข้อมูล — สีไม่ได้บอกแล้ว
        const track = el('div', 'sg-track');
        const fill = el('i');
        fill.style.setProperty('--c', color);
        track.append(fill);
        line.append(track, el('b', null, fmt(round1(value))));
        bars.append(line);
        subSegs.push({ track, value, color });
        growBar(fill, value / groupMax * 100);
      });
      row.append(bars);
      sub.append(row);
    });
    host.append(sub);
    segmentBars(subSegs, groupMax, cf.unit || '');
  }
}

/* ---------- 3. โดนัท ---------- */
export function donut(host, cf, rows) {
  const { labels, values } = groupBy(rows, cf);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  /* ไล่เฉดตามลำดับค่า (ค่ามากสุด = เข้มสุด) ค่าเริ่มต้นเป็นเฉดม่วงชุดเดียวกับทั้งเว็บ
     หมายเหตุ: ห้ามกลับไปใช้ --blue / --orange ทั้งสองตัวถูกถอดออกจากชุดสีแล้ว */
  const palette = cf.colors ||
    ['var(--sc-5)', 'var(--sc-4)', 'var(--sc-3)', 'var(--sc-2)', 'var(--sc-1)'];

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 42 42');
  svg.setAttribute('class', 'donut');

  /* วงต้องเต็มไม่มีรอยขาด และค่าต้องตรงเป๊ะ
     ปลายมนทำไม่ได้บนวงที่ต่อกันสนิท (หัวมนของสองส่วนจะชนกันจนเกิดรอยเว้า
     หรือไม่ก็ต้องหักความยาวออกจนค่าเพี้ยน) จึงใช้ปลายตัดตรง
     แล้วขีดเส้นสีพื้นการ์ดคั่นระหว่างส่วนแทน — ได้ทั้งวงเต็มและแยกส่วนได้ชัด */
  const R = 15.9155, C = 2 * Math.PI * R, W = 9;
  let acc = 0;
  values.forEach((v, i) => {
    const arc = document.createElementNS(NS, 'circle');
    arc.setAttribute('cx', 21); arc.setAttribute('cy', 21); arc.setAttribute('r', R);
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke', palette[i % palette.length]);
    arc.setAttribute('stroke-width', W);
    arc.setAttribute('stroke-dasharray', `${(v / total * C).toFixed(3)} ${C}`);
    arc.setAttribute('stroke-dashoffset', (C / 4 - acc).toFixed(3));
    arc.setAttribute('transform', 'rotate(-90 21 21)');
    const t = document.createElementNS(NS, 'title');
    t.textContent = `${labels[i]} · ${pct(v, total)}%`;
    arc.append(t);
    svg.append(arc);
    acc += v / total * C;
  });

  /* ไม่ใส่เส้นคั่นระหว่างส่วน — เคยลองแล้วมันอ่านเป็น "ช่องว่าง/ข้อมูลขาด"
     สีของแต่ละส่วนไล่เฉดต่างกันอยู่แล้ว จึงแยกออกโดยไม่ต้องมีเส้น */

  const mid = el('div', 'donut-mid');
  mid.innerHTML = `<b>${fmt(total)}</b><span>${cf.unit || 'คำตอบ'}</span>`;
  const chart = el('div', 'donut-chart');
  chart.append(svg, mid);

  const legend = el('div', 'donut-legend');
  labels.forEach((label, i) => {
    const row = el('div', 'dl-row');
    const dot = el('i', 'dot');
    dot.style.background = palette[i % palette.length];
    const name = el('span', 'dl-name', label);
    name.title = label;
    row.append(dot, name, el('b', null, pct(values[i], total) + '%'));
    legend.append(row);
  });

  const wrap = el('div', 'donut-wrap');
  wrap.append(chart, legend);
  host.append(wrap);
}

/* ---------- 4. กราฟจิ๋วในการ์ดสรุป ---------- */
export function sparkline(cf, rows) {
  const { values } = groupBy(rows, cf);
  if (!values.length) return null;

  const W = 240, H = 44, max = Math.max(...values, 1);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.cssText = 'width:100%;height:100%;display:block';

  const gap2 = 5;
  const bw = Math.max(3, (W - gap2 * (values.length - 1)) / values.length);
  values.forEach((v, i) => {
    const h = Math.max(3, (v / max) * (H - 6));
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', (i * (bw + gap2)).toFixed(1));
    rect.setAttribute('y', (H - h).toFixed(1));
    rect.setAttribute('width', bw.toFixed(1));
    rect.setAttribute('height', h.toFixed(1));
    rect.setAttribute('rx', '3');
    rect.setAttribute('fill', cf.color || 'var(--accent)');
    rect.setAttribute('opacity', i === values.length - 1 ? '1' : '.4');
    svg.append(rect);
  });
  return svg;
}


/* ---------- 5. เทียบช่องว่างระหว่างกลุ่ม ----------
   ตอบคำถามแบบ "กลุ่มไหนห่างกว่ากัน" ซึ่งเป็นการเชื่อมพฤติกรรมกลับไปหาคำถามวิจัย */
export function compare(host, cf, rows) {
  const groups = compareGroups(rows, {
    by: cf.by, matchers: cf.groups, colA: cf.colA, colB: cf.colB, minN: cf.minN || 3
  }).sort((x, y) => (y.gap ?? -Infinity) - (x.gap ?? -Infinity));

  if (groups.length < 2) {
    host.append(el('p', 'hint', 'ยังเทียบไม่ได้ เพราะข้อมูลมีกลุ่มเดียว'));
    return;
  }

  const widest = groups.find(g => g.enough);
  const narrowest = [...groups].reverse().find(g => g.enough);
  if (widest && narrowest && widest !== narrowest) {
    const lead = el('p', 'lead');
    lead.innerHTML = `กลุ่มที่ช่องว่างกว้างที่สุดคือ <b>${widest.label}</b> ` +
      `(ต่างกัน ${fmt(round1(widest.gap))} ข่าว) · แคบที่สุดคือ <b>${narrowest.label}</b> ` +
      `(ต่างกัน ${fmt(round1(narrowest.gap))} ข่าว)`;
    host.append(lead);
  }

  /* ทดสอบว่าช่องว่างของสองกลุ่มใหญ่สุดต่างกันจริงไหม (Welch's t-test บนผลต่างรายคน) */
  const gapsOf = matcher => rows
    .filter(r => String(r[cf.by] ?? '').includes(matcher))
    .map(r => (num(r[cf.colB]) ?? 0) - (num(r[cf.colA]) ?? 0));
  const byN = [...groups].sort((x, y) => y.n - x.n).slice(0, 2);
  if (byN.length === 2) {
    const defs = cf.groups || [];
    const m1 = defs.find(d => d.label === byN[0].label)?.match || byN[0].label;
    const m2 = defs.find(d => d.label === byN[1].label)?.match || byN[1].label;
    const test = welchTTest(gapsOf(m1), gapsOf(m2));
    if (test && test.p != null) {
      const note = el('p', 'cmp-test');
      note.textContent = test.p < 0.05
        ? `เทียบ “${byN[0].label}” กับ “${byN[1].label}” แล้ว ช่องว่างต่างกันอย่างมีนัยสำคัญ ` +
          `(ต่างกัน ${Math.abs(test.diff).toFixed(1)} ข่าว, p = ${test.p < 0.001 ? '<.001' : test.p.toFixed(3)})`
        : `เทียบ “${byN[0].label}” กับ “${byN[1].label}” แล้ว ยังบอกไม่ได้ว่าต่างกันจริง ` +
          `(p = ${test.p.toFixed(3)} จึงยังสรุปไม่ได้ว่าผลต่างนี้ไม่ได้เกิดจากการสุ่ม)`;
      note.classList.add(test.p < 0.05 ? 'is-sig' : 'is-nosig');
      host.append(note);
    }
  }

  const max = Math.ceil(Math.max(...groups.map(g => Math.max(g.a || 0, g.b || 0)), 1));
  const list = el('div', 'cmp');
  const segs = [];

  groups.forEach(g => {
    const row = el('div', 'cmp-row' + (g.enough ? '' : ' is-thin'));

    const head = el('div', 'cmp-head');
    head.append(el('b', null, g.label));
    head.append(el('span', 'cmp-n', `${fmt(g.n)} คน`));
    if (g.gap != null) {
      const chip = el('span', 'cmp-gap');
      chip.textContent = 'ต่างกัน ' + fmt(round1(Math.abs(g.gap))) + ' ข่าว';
      chip.classList.add(g.gap >= 0 ? 'is-drama' : 'is-world');
      head.append(chip);
    }
    row.append(head);

    const bars = el('div', 'cmp-bars');
    const topValue = Math.max(g.a || 0, g.b || 0);
    [[cf.labelA || 'ข่าวโลก', g.a], [cf.labelB || 'ข่าวดราม่า', g.b]].forEach(([name, v]) => {
      const color = barColor(v || 0, topValue);
      const line = el('div', 'cmp-line' + ((v || 0) >= topValue ? ' is-lead' : ''));
      line.append(el('span', 'cmp-name', name));
      const track = el('div', 'sg-track');
      const fill = el('i');
      fill.style.setProperty('--c', color);
      track.append(fill);
      line.append(track, el('b', null, fmt(round1(v))));
      bars.append(line);
      segs.push({ track, value: v || 0, color });
      growBar(fill, (v || 0) / max * 100);
    });
    row.append(bars);

    if (!g.enough) row.append(el('p', 'cmp-warn', `กลุ่มนี้มีแค่ ${g.n} คน ตัวเลขยังแกว่งง่าย`));
    list.append(row);
  });
  segmentBars(segs, max, cf.unit || '');
  host.append(list);
}

export const CHARTS = { rank, gap, donut, compare };


/* ---------- 6. Waffle: 100 จุด = 100% ----------
   เหมาะกับ "สัดส่วนของผู้ตอบ" มากกว่าหลอด เพราะนับจุดได้ด้วยตา
   จุด 100 จุดคือสัดส่วน ไม่ใช่คน 100 คน — จำนวนคนจริงจึงต้องขึ้นในคำอธิบายและใต้ภาพเสมอ */
export function waffle(host, cf, rows) {
  const { labels, values } = groupBy(rows, cf);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const palette = cf.colors || ['var(--purple)', 'var(--graphite)', 'var(--purple-3)', 'var(--gray)'];

  // แจกจ่าย 100 ช่องตามสัดส่วน แล้วปัดเศษที่เหลือให้กลุ่มที่เศษมากสุด
  const exact = values.map(v => v / total * 100);
  const cells = exact.map(Math.floor);
  let left = 100 - cells.reduce((a, b) => a + b, 0);
  exact.map((v, i) => [i, v - Math.floor(v)]).sort((a, b) => b[1] - a[1])
    .forEach(([i]) => { if (left-- > 0) cells[i]++; });

  const grid = el('div', 'waffle');
  cells.forEach((n, i) => {
    for (let k = 0; k < n; k++) {
      const cell = el('i', 'wf-cell');
      cell.style.background = palette[i % palette.length];
      cell.title = `${labels[i]} · ${values[i]} คนจาก ${total} คน (${Math.round(exact[i])}%)`;
      cell.style.animationDelay = Math.min(grid.children.length * 3, 300) + 'ms';
      grid.append(cell);
    }
  });

  const legend = el('div', 'wf-legend');
  labels.forEach((label, i) => {
    const row = el('div', 'wf-item');
    const dot = el('i', 'dot');
    dot.style.background = palette[i % palette.length];
    row.append(dot, el('span', 'wf-name', label),
      el('b', null, `${values[i]} คน`), el('span', 'wf-pct', Math.round(exact[i]) + '%'));
    legend.append(row);
  });

  const wrap = el('div', 'waffle-wrap');
  wrap.append(grid, legend);
  host.append(wrap);
  // บอกให้ชัดว่าจุดเป็นการเทียบสัดส่วน ไม่ใช่จำนวนคนจริง (คนจริงอยู่ในคำอธิบายด้านข้าง)
  host.append(el('p', 'wf-base', `100 จุดคือการเทียบสัดส่วน · ผู้ตอบจริง ${total} คน`));
}

/* ---------- 7. Gauge: เข็มวัดครึ่งวงกลม ----------
   ใช้กับค่าเดียวที่อยากให้เห็นว่า "อยู่ตรงไหนของสเกล" */
export function gauge(host, cf, rows) {
  const value = cf.compute === 'ratio'
    ? ratioOf(rows, cf) : shareOf(rows, cf);
  // ขยายสเกลอัตโนมัติถ้าค่าจริงทะลุเพดาน ไม่งั้นเข็มจะตันแต่ตัวเลขวิ่งเกิน
  const base = cf.max ?? 100;
  const max = value != null && value > base ? Math.ceil(value / 50) * 50 : base;
  const ratio = Math.max(0, Math.min(1, (value ?? 0) / max));

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 112');
  svg.setAttribute('class', 'gauge');

  const arc = (from, to, color, width) => {
    const p = document.createElementNS(NS, 'path');
    const pt = a => [100 + 82 * Math.cos(Math.PI * (1 - a)), 100 - 82 * Math.sin(Math.PI * (1 - a))];
    const [x1, y1] = pt(from), [x2, y2] = pt(to);
    // ครึ่งวงกลม มุมกวาดไม่มีทางเกิน 180° large-arc-flag จึงต้องเป็น 0 เสมอ
    // (เดิมใส่ 1 เมื่อสัดส่วนเกินครึ่ง ทำให้เส้นวิ่งอ้อมกลับด้าน)
    p.setAttribute('d', `M ${x1.toFixed(1)} ${y1.toFixed(1)} A 82 82 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', color);
    p.setAttribute('stroke-width', width);
    p.setAttribute('stroke-linecap', 'round');
    return p;
  };
  svg.append(arc(0, 1, 'var(--sc-1)', 17));
  if (ratio > 0.005) svg.append(arc(0, ratio, cf.color || 'var(--purple)', 17));

  const box = el('div', 'gauge-box');
  const mid = el('div', 'gauge-mid');
  mid.innerHTML = `<b>${fmt(round1(value))}${cf.unit || '%'}</b><span>${cf.caption || ''}</span>`;
  box.append(svg, mid);

  const scale = el('div', 'gauge-scale');
  scale.append(el('span', null, '0'), el('span', null, String(max) + (cf.unit || '%')));
  host.append(box, scale);
}

function shareOf(rows, cf) {
  if (!rows.length) return null;
  const want = [].concat(cf.equals ?? []).map(String);
  return rows.filter(r => want.some(w => String(r[cf.column] ?? '').includes(w))).length / rows.length * 100;
}
function ratioOf(rows, cf) {
  const a = avgOf(rows, cf.numerator) ?? 0, b = avgOf(rows, cf.denominator) ?? 0;
  return b ? a / b * 100 : 0;
}

/* ---------- 8. Heatmap: ตาราง 2 มิติ ----------
   แต่ละแถว = หนึ่งหัวข้อ · แต่ละคอลัมน์ = หนึ่งกลุ่ม · ยิ่งเข้ม = ยิ่งมีคนตอบมาก */
export function heatmap(host, cf, rows) {
  const groupCol = pickGroupColumn(rows, [cf.group, ...(cf.groupFallback || [])]);
  if (!groupCol) {
    host.append(el('p', 'hint', cf.singleGroupNote ||
      'ยังจำแนกกลุ่มไม่ได้ เนื่องจากผู้ตอบทั้งหมดอยู่ในกลุ่มเดียวกัน กรุณาดูอันดับข่าวด้านล่างประกอบ'));
    return;
  }
  const all = crossTab(rows, { ...cf, group: groupCol });
  const { labels, sizes } = all;

  /* กลุ่มที่มีคนน้อยเกินไปต้องตัดออก
     เพราะ 1 ใน 2 คน = 50% ซึ่งดูหนักแน่นพอ ๆ กับ 20 ใน 40 คน ทั้งที่เชื่อถือไม่ได้เลย */
  const minN = cf.minGroup ?? 5;
  const keep = all.groups.filter(g => sizes[g] >= minN);
  const dropped = all.groups.filter(g => sizes[g] < minN);
  // ต้องมีอย่างน้อยสองกลุ่มที่ใหญ่พอถึงจะ "เทียบ" ได้ ตารางคอลัมน์เดียวไม่มีประโยชน์
  if (keep.length < 2) {
    host.append(el('p', 'hint',
      `มีกลุ่มที่ผู้ตอบถึง ${minN} คนไม่ถึงสองกลุ่ม จึงยังเปรียบเทียบข้ามกลุ่มไม่ได้ · ` +
      `ดูอันดับข่าวด้านล่างซึ่งนับรวมทุกคนแทน`));
    return;
  }
  const groups = keep;
  const idx = keep.map(g => all.groups.indexOf(g));
  const matrix = all.matrix.map(row => idx.map(k => row[k]));

  const table = el('div', 'heat');
  table.style.setProperty('--cols', groups.length);

  table.append(el('span', 'heat-corner'));
  groups.forEach(g => {
    const th = el('span', 'heat-col');
    th.append(el('b', null, g), el('span', null, `${sizes[g]} คน`));
    table.append(th);
  });

  /* แสดงเป็น % ของกลุ่มนั้น ไม่ใช่จำนวนคนดิบ
     เพราะแต่ละกลุ่มมีคนไม่เท่ากัน (เช่น 20 คน กับ 5 คน) เอาจำนวนดิบมาเทียบกันตรง ๆ จะหลอกตา */
  const share = (v, g) => (sizes[g] ? Math.round(v / sizes[g] * 100) : 0);
  const maxPct = Math.max(1, ...labels.map((_, i) =>
    Math.max(...matrix[i].map((v, j) => share(v, groups[j])))));

  labels.forEach((label, i) => {
    const line = el('div', 'heat-line');
    const name = el('span', 'heat-row', label);
    name.title = label;
    line.append(name);

    matrix[i].forEach((v, j) => {
      const p = share(v, groups[j]);
      const cell = el('span', 'heat-cell');
      const step = p === 0 ? 0 : Math.min(5, Math.ceil(p / maxPct * 4) + 1);
      cell.style.setProperty('--cell', step ? `var(--sc-${step})` : 'var(--hair)');
      if (step >= 4) cell.classList.add('is-dark');
      cell.append(el('span', null, p ? p + '%' : '–'));
      cell.title = `${label}\n${groups[j]}: ${v} จาก ${sizes[groups[j]]} คน (${p}%)`;
      line.append(cell);
    });
    table.append(line);
  });
  host.append(table);

  const scale = el('div', 'heat-scale');
  scale.append(el('span', null, 'คนในกลุ่มรู้จักน้อย'));
  [1, 2, 3, 4, 5].forEach(n => {
    const chip = el('i');
    chip.style.background = `var(--sc-${n})`;
    scale.append(chip);
  });
  scale.append(el('span', null, `รู้จักมาก (สูงสุด ${maxPct}% ของกลุ่ม)`));
  host.append(scale);
  if (dropped.length) {
    host.append(el('p', 'scale-note',
      `ไม่แสดง ${dropped.length} กลุ่มที่มีผู้ตอบน้อยกว่า ${minN} คน ` +
      `(${dropped.map(g => `${g} ${sizes[g]} คน`).join(' · ')}) เพราะสัดส่วนจากคนไม่กี่คนเชื่อถือไม่ได้`));
  }
}

/* ---------- 9. Bubble: วงกลมขนาดตามค่า ---------- */
export function bubbles(host, cf, rows) {
  const { labels, values } = groupBy(rows, cf);
  const max = Math.max(...values, 1);
  const wrap = el('div', 'bubbles');

  labels.forEach((label, i) => {
    const size = 54 + Math.sqrt(values[i] / max) * 78;
    const item = el('div', 'bubble-item');
    const ball = el('div', 'bubble');
    ball.style.width = ball.style.height = size.toFixed(0) + 'px';
    ball.style.background = i === 0 ? 'var(--purple)' : `var(--sc-${Math.max(2, 5 - i)})`;
    if (i > 1) ball.classList.add('is-light');
    ball.append(el('b', null, fmt(values[i])));
    const name = el('span', 'bubble-name', label);
    const share = el('span', 'bubble-share', `${fmt(values[i])} คน · ${pct(values[i], rows.length)}%`);
    item.append(ball, name, share);
    item.title = `${label} · ${values[i]} คนจาก ${rows.length} คน (${pct(values[i], rows.length)}%)`;
    wrap.append(item);
  });
  host.append(wrap);
}

/* ---------- 10. Stacked: แถบเดียว 100% ---------- */
export function stacked(host, cf, rows) {
  const { labels, values } = groupBy(rows, cf);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const palette = cf.colors || ['var(--purple)', 'var(--graphite)', 'var(--purple-3)', 'var(--gray)'];

  const bar = el('div', 'stack');
  values.forEach((v, i) => {
    const seg = el('i');
    seg.style.background = palette[i % palette.length];
    seg.title = `${labels[i]} · ${v} คน (${pct(v, total)}%)`;
    // ตัวเลขอยู่ในแถบเลย ไม่ต้องกวาดตาไปหาในรายการข้างล่าง
    const tag = el('b', null, pct(v, total) + '%');
    if (i >= 2) seg.classList.add('is-light');
    seg.append(tag);
    bar.append(seg);
    growBar(seg, v / total * 100);
  });

  const legend = el('div', 'stack-legend');
  labels.forEach((label, i) => {
    const row = el('div', 'stack-item');
    const dot = el('i', 'dot');
    dot.style.background = palette[i % palette.length];
    row.append(dot, el('span', 'stack-name', label), el('b', null, pct(values[i], total) + '%'));
    legend.append(row);
  });
  host.append(bar, legend);
}

/* ---------- 11. Paired: เทียบรายการเดียวกันสองฝั่ง ----------
   ใช้ภาษาเดียวกับบล็อกเทียบกลุ่ม: ชื่อ + แท่งสองแท่ง + ป้ายบอกว่าฝั่งไหนนำเท่าไร
   (เลิกใช้แบบจุดสองจุด เพราะไม่มีแกนให้อ้างอิง อ่านตำแหน่งไม่ออก) */
export function paired(host, cf, rows) {
  const gA = groupBy(rows, { x: cf.columnA, multi: true, agg: 'count' });
  const gB = groupBy(rows, { x: cf.columnB, multi: true, agg: 'count' });
  const mapA = new Map(gA.labels.map((l, i) => [l, gA.values[i]]));
  const mapB = new Map(gB.labels.map((l, i) => [l, gB.values[i]]));

  const items = [...new Set([...gA.labels, ...gB.labels])]
    .map(l => ({ label: l, a: mapA.get(l) || 0, b: mapB.get(l) || 0 }))
    .map(d => ({ ...d, gap: d.b - d.a }))
    .sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap) || (y.a + y.b) - (x.a + x.b))
    .slice(0, cf.top || 8);

  if (!items.length) { host.append(el('p', 'hint', 'ยังไม่มีคำตอบในข้อนี้')); return; }

  const max = Math.ceil(Math.max(...items.map(d => Math.max(d.a, d.b)), 1));

  // สีบอกสถานะ (นำ / ไม่นำ / ยังไม่ถึงค่า) ชื่อชุดข้อมูลอ่านได้จากป้ายหน้าหลอดแต่ละแถว
  const legend = el('div', 'legend');
  [[LEAD_COLOR, 'ฝั่งที่นำ'], [REST_COLOR, 'อีกฝั่ง'], ['var(--track)', 'ยังไม่ถึงค่านี้']]
    .forEach(([color, text]) => {
      const item = el('span');
      const dot = el('i', 'dot'); dot.style.background = color;
      item.append(dot, text);
      legend.append(item);
    });
  host.append(legend);

  const list = el('div', 'cmp');
  const segs = [];
  items.forEach((d, i) => {
    // จัดหน้าตาแบบเดียวกับการ์ด "ข่าวรายชิ้น": มีเลขอันดับ และอันดับ 1 เป็นกล่องเด่น
    // is-ranked = แถวที่มีเลขอันดับ (ใช้ layout 2 คอลัมน์) ต่างจาก .cmp-row ของกราฟเทียบกลุ่ม
    const row = el('div', 'cmp-row is-ranked' + (i === 0 ? ' is-top' : ''));
    if (i === 0) row.append(el('span', 'rank-top-tag', 'ต่างกันมากที่สุด'));
    row.append(el('span', 'cmp-no', String(i + 1).padStart(2, '0')));

    const main = el('div', 'cmp-main');
    const head = el('div', 'cmp-head');
    head.append(el('b', null, d.label));
    if (d.gap !== 0) {
      const chip = el('span', 'cmp-gap');
      const lead = d.gap > 0 ? cf.labelB : cf.labelA;
      chip.textContent = `${lead}นำ ${Math.abs(d.gap)} คน`;
      chip.classList.add(d.gap > 0 ? 'is-drama' : 'is-world');
      head.append(chip);
    } else {
      const chip = el('span', 'cmp-gap is-same');
      chip.textContent = 'เท่ากัน';
      head.append(chip);
    }
    main.append(head);

    const bars = el('div', 'cmp-bars');
    const topValue = Math.max(d.a, d.b);
    [[cf.labelA, d.a], [cf.labelB, d.b]].forEach(([name, v]) => {
      const color = barColor(v, topValue);
      const line = el('div', 'cmp-line' + (v >= topValue ? ' is-lead' : ''));
      line.append(el('span', 'cmp-name', name));
      const track = el('div', 'sg-track');
      const fill = el('i');
      fill.style.setProperty('--c', color);
      track.append(fill);
      const val = el('b', null, `${fmt(v)} คน`);
      line.append(track, val);
      bars.append(line);
      segs.push({ track, value: v, color });
      growBar(fill, v / max * 100);
    });
    main.append(bars);
    row.append(main);
    list.append(row);
  });
  host.append(list);
  segmentBars(segs, max, 'คน');
}

/* ---------- 12. Chips: รายการตัวเลือกแบบป้าย ขนาดตามจำนวนคน ----------
   ใช้แทนกราฟแท่งเมื่อรายการยาวและไม่ต้องเทียบค่าอย่างละเอียด */
export function chips(host, cf, rows) {
  const { labels, values } = groupBy(rows, { ...cf, agg: cf.agg || 'count', sort: 'value' });
  if (!labels.length) { host.append(el('p', 'hint', 'ยังไม่มีคำตอบในข้อนี้')); return; }

  const max = Math.max(...values, 1);
  const box = el('div', 'chips-cloud');
  labels.slice(0, cf.top || 12).forEach((label, i) => {
    const v = values[i];
    const strength = v / max;                       // 0–1
    const chip = el('span', 'cloud-chip');
    chip.style.setProperty('--w', strength.toFixed(2));
    if (strength > 0.66) chip.classList.add('is-strong');
    else if (strength > 0.33) chip.classList.add('is-mid');
    chip.append(el('span', 'cloud-name', label));
    chip.append(el('b', null, `${fmt(v)} คน`));
    chip.append(el('span', 'cloud-pct', pct(v, rows.length) + '%'));
    chip.title = `${label} · ${fmt(v)} คน (${pct(v, rows.length)}%)`;
    box.append(chip);
  });
  host.append(box);
  host.append(el('p', 'hint', cf.scaleNote ||
    `ป้ายยิ่งเข้ม = ยิ่งมีคนเลือกมาก · ตัวเลขคือจำนวนคนจากผู้ตอบ ${rows.length} คน`));
}


/* ---------- 13. Grouped: เทียบสองชุดข้อมูลในแต่ละช่วง ----------
   ทุกแท่งเริ่มจากเส้นเดียวกันทางซ้าย จึงเทียบความยาวได้ตรง ๆ
   (แบบแถบซ้อนต้องเทียบชิ้นที่อยู่คนละตำแหน่ง ซึ่งตาคนทำได้ไม่ดี) */
export function grouped(host, cf, rows) {
  if (!rows.length) { host.append(el('p', 'hint', 'ยังไม่มีคำตอบให้แบ่งช่วง')); return; }
  const ranges = cf.ranges || [
    { label: 'รู้จักน้อย', from: 0, to: 3 },
    { label: 'ปานกลาง',   from: 4, to: 6 },
    { label: 'รู้จักมาก', from: 7, to: 10 }
  ];
  const series = cf.series || [];
  const countIn = (col, r) => rows.filter(x => {
    const v = num(x[col]); return v != null && v >= r.from && v <= r.to;
  }).length;

  const data = ranges.map(r => ({ r, vals: series.map(sr => countIn(sr.column, r)) }));
  const peak = Math.max(1, ...data.flatMap(d => d.vals));

  const legend = el('div', 'legend');
  series.forEach(sr => {
    const item = el('span');
    const dot = el('i', 'dot'); dot.style.background = sr.color;
    item.append(dot, sr.label);
    legend.append(item);
  });
  host.append(legend);

  const box = el('div', 'grp');
  data.forEach(d => {
    const block = el('div', 'grp-block');
    block.append(el('div', 'grp-title',
      `${d.r.label} (${d.r.from}–${d.r.to} ${cf.unit || ''})`.trim()));
    series.forEach((sr, k) => {
      const row = el('div', 'grp-row');
      row.append(el('span', 'grp-name', sr.label));
      const track = el('div', 'grp-track');
      const fill = el('i');
      fill.style.setProperty('--c', sr.color);
      fill.title = `${sr.label} · ${d.r.label} · ${d.vals[k]} คน`;
      track.append(fill);
      growBar(fill, d.vals[k] / peak * 100);
      row.append(track, el('b', null, `${d.vals[k]} คน`));
      block.append(row);
    });
    box.append(block);
  });
  host.append(box);

  const counted = Math.max(...series.map(sr =>
    ranges.reduce((a, r) => a + countIn(sr.column, r), 0)));
  const missing = rows.length - counted;
  host.append(el('p', 'scale-note',
    `แท่งยาวสุดในกราฟ = ${peak} คน · นับได้ ${counted} คน` +
    (missing > 0 ? ` (อีก ${missing} คนไม่ได้ตอบข้อนี้)` : '')));
}

/* ---------- 14. Split: แบ่งผู้ตอบเป็นกลุ่ม แล้วโชว์เป็นตัวเลขใหญ่ ----------
   คำถามคือ "กี่คนอยู่ฝั่งไหน" คำตอบที่ตรงที่สุดคือตัวเลข ไม่ใช่รูป
   มีแถบสัดส่วนกำกับไว้ให้เห็นน้ำหนักโดยไม่ต้องอ่านเลข */
export function split(host, cf, rows) {
  if (!rows.length) { host.append(el('p', 'hint', 'ยังไม่มีผู้ตอบให้นับ')); return; }
  const groups = (cf.groups || []).map(g => ({ ...g, n: 0 }));
  rows.forEach(r => {
    const a = num(r[cf.columnA]), b = num(r[cf.columnB]);
    if (a == null || b == null) return;
    const d = b - a;
    const k = d > 0 ? 0 : d < 0 ? 1 : 2;
    if (groups[k]) groups[k].n++;
  });
  const total = groups.reduce((s, g) => s + g.n, 0) || 1;

  // แถบเดียวแบ่งสัดส่วน เห็นภาพรวมก่อนอ่านตัวเลข
  const bar = el('div', 'split-bar');
  groups.forEach(g => {
    if (!g.n) return;
    const seg = el('i');
    seg.style.background = g.color;
    seg.style.width = (g.n / total * 100) + '%';
    seg.title = `${g.label} · ${g.n} คน (${pct(g.n, total)}%)`;
    bar.append(seg);
  });
  host.append(bar);

  const grid = el('div', 'split-grid');
  groups.forEach(g => {
    const cell = el('div', 'split-cell');
    const head = el('div', 'split-head');
    const dot = el('i', 'dot'); dot.style.background = g.color;
    head.append(dot, el('span', null, g.label));
    const big = el('div', 'split-big');
    big.append(el('b', null, fmt(g.n)), el('span', null, 'คน'));
    cell.append(head, big, el('div', 'split-pct', pct(g.n, total) + '% ของผู้ตอบ'));
    grid.append(cell);
  });
  host.append(grid);
  host.append(el('p', 'scale-note', `นับจากผู้ตอบที่ตอบครบทั้งสองชุด ${total} คน`));
}


/* ---------- วงกลมสัดส่วน (pie) ----------
   ใช้กับคำถามที่ผู้ตอบเลือกได้คำตอบเดียว ผลรวมทุกชิ้นจึงเท่ากับผู้ตอบทั้งหมดพอดี
   รับข้อมูลได้สองแบบ
     1) x: ชื่อคอลัมน์            — นับความถี่ของคำตอบในคอลัมน์นั้น
     2) columnA + columnB + groups — แบ่งผู้ตอบเป็นกลุ่มจากผลต่างของสองคอลัมน์
   ห้ามใช้กับคำถามที่เลือกได้หลายข้อ เพราะผลรวมจะเกิน 100% แล้ววงจะสื่อความผิด

   วาดเป็นวงแหวนที่เว้นช่องระหว่างชิ้น ไม่ใช่วงตันที่ต่อกันสนิท
   ช่องว่างคงที่ทำให้ปลายมนของแต่ละชิ้นไม่ชนกัน (ข้อจำกัดเดิมของโดนัทแบบต่อสนิท ดู UI.md)
   ตัวเลข % วางอยู่ในกล่องพื้นขาวมุมมน ไม่ใช้เส้นขอบตัวอักษร
   เพราะเส้นขอบจะทำให้ตัวเลขบางลงและอ่านยากเมื่อทับสีอ่อน */
export function pie(host, cf, rows) {
  if (!rows.length) { host.append(el('p', 'hint', 'ยังไม่มีผู้ตอบให้นับ')); return; }

  const palette = cf.colors ||
    ['var(--pie-1)', 'var(--pie-2)', 'var(--pie-3)', 'var(--pie-4)', 'var(--pie-5)'];
  let slices;

  if (cf.columnA && cf.columnB) {
    const groups = (cf.groups || []).map(g => ({ label: g.label, color: g.color, n: 0 }));
    rows.forEach(r => {
      const a = num(r[cf.columnA]), b = num(r[cf.columnB]);
      if (a == null || b == null) return;
      const k = b > a ? 0 : b < a ? 1 : 2;
      if (groups[k]) groups[k].n++;
    });
    slices = groups;
  } else {
    const { labels, values } = groupBy(rows, cf);
    slices = labels.map((label, i) => ({ label, n: values[i], color: palette[i % palette.length] }));
  }

  slices = slices.filter(s => s.n > 0);
  const total = slices.reduce((s, g) => s + g.n, 0);
  if (!total) { host.append(el('p', 'hint', 'ยังไม่มีคำตอบในหัวข้อนี้')); return; }

  const NS = 'http://www.w3.org/2000/svg';
  const mk = t => document.createElementNS(NS, t);
  const svg = mk('svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'pie');

  /* หลอดของวงต้องหนาพอให้กล่องตัวเลขวางอยู่ในเนื้อหลอดได้เต็มใบ
     W = 22 คือความหนาที่กล่องสูง 12 หน่วยยังเหลือขอบบน-ล่างข้างละ 5 หน่วย
     R + W/2 = 49 จึงยังไม่ล้นกรอบ viewBox 100 หน่วย */
  const CX = 50, CY = 50, R = 38, W = 22;
  const RO = R + W / 2, RI = R - W / 2;
  const CORNER = 4;                 // มุมกึ่งโค้ง ไม่ใช่ปลายมนเต็มใบ (ปลายมนเต็มใบ = W/2 = 11)
  const GAP = slices.length > 1 ? 4 : 0;   // ช่องว่างระหว่างชิ้น หน่วยเป็นองศา
  const TRACK_GAP = GAP * 0.4;             // ชั้นหลังเว้นแคบกว่า จึงโผล่พ้นชิ้นสีทั้งสองด้าน
  const MIN_SWEEP = 1.6;                   // ชิ้นที่เล็กมากยังต้องเห็นเป็นเส้นบาง ๆ ไม่ใช่หายไป

  const at = (deg, rad) => {
    const a = (deg - 90) * Math.PI / 180;
    return [CX + rad * Math.cos(a), CY + rad * Math.sin(a)];
  };
  const P = (deg, rad) => at(deg, rad).map(v => v.toFixed(3)).join(' ');
  const deg = (len, rad) => len / rad * 180 / Math.PI;

  /* วาดชิ้นเป็น "รูปปิดที่ระบายสี" ไม่ใช่เส้นหนา
     เส้นหนาบังคับให้ปลายเป็นตัด (butt) หรือมนเต็มใบ (round) เท่านั้น เลือกกึ่งโค้งไม่ได้
     รูปปิดจึงกำหนดรัศมีมุมได้เอง และช่องว่างที่เว้นไว้ก็เป็นช่องว่างจริงตามมุมที่คำนวณ
     ไม่ถูกปลายมนกินหายไปเหมือนตอนใช้เส้นหนา */
  const sectorPath = (from, sweep) => {
    const to = from + sweep;
    if (sweep >= 359.9) {                       // ชิ้นเดียวกินทั้งวง วาดเป็นวงแหวนเต็ม
      return `M ${P(0, RO)} A ${RO} ${RO} 0 1 1 ${P(180, RO)} A ${RO} ${RO} 0 1 1 ${P(0, RO)} Z ` +
             `M ${P(0, RI)} A ${RI} ${RI} 0 1 0 ${P(180, RI)} A ${RI} ${RI} 0 1 0 ${P(0, RI)} Z`;
    }
    /* มุมโค้งกินพื้นที่ทั้งตามแนวโค้งและแนวรัศมี ชิ้นที่แคบกว่านั้นต้องลดรัศมีมุมลงตาม
       ไม่งั้นเส้นจะไขว้กันเองจนรูปบิด */
    const r = Math.min(CORNER, W / 2 - 0.5, sweep / 2 / (180 / Math.PI) * RI * 0.9);
    if (!(r > 0.4)) {                            // แคบเกินกว่าจะโค้ง วาดเป็นสี่เหลี่ยมโค้งมนไม่ได้
      return `M ${P(from, RO)} A ${RO} ${RO} 0 0 1 ${P(to, RO)} ` +
             `L ${P(to, RI)} A ${RI} ${RI} 0 0 0 ${P(from, RI)} Z`;
    }
    const ao = deg(r, RO), ai = deg(r, RI);
    const big = sweep - 2 * ao > 180 ? 1 : 0;
    return [
      `M ${P(from + ao, RO)}`,
      `A ${RO} ${RO} 0 ${big} 1 ${P(to - ao, RO)}`,
      `A ${r} ${r} 0 0 1 ${P(to, RO - r)}`,
      `L ${P(to, RI + r)}`,
      `A ${r} ${r} 0 0 1 ${P(to - ai, RI)}`,
      `A ${RI} ${RI} 0 ${big} 0 ${P(from + ai, RI)}`,
      `A ${r} ${r} 0 0 1 ${P(from, RI + r)}`,
      `L ${P(from, RO - r)}`,
      `A ${r} ${r} 0 0 1 ${P(from + ao, RO)}`,
      'Z'
    ].join(' ');
  };

  /* หักช่องว่างเท่ากันทุกชิ้น ความกว้างที่ตาเห็นจึงลดลงชิ้นละเท่ากัน สัดส่วนระหว่างชิ้นไม่เพี้ยน */
  const inset = (from, full, gapDeg) => {
    const sweep = Math.max(MIN_SWEEP, full - gapDeg);
    return { from: from + (full - sweep) / 2, sweep };
  };

  /* ---- ชั้นหลัง: รางสีเทาแบ่งช่องด้วยมุมชุดเดียวกับชิ้นสี ----
     ทำให้เห็นว่าวงถูกแบ่งเป็นกี่ช่องแม้ชิ้นนั้นจะเล็กมาก
     และช่องว่างอ่านเป็น "เส้นแบ่ง" ไม่ใช่ "ข้อมูลขาดหาย" */
  if (slices.length > 1) {
    let tstart = 0;
    slices.forEach(g => {
      const full = g.n / total * 360;
      const { from, sweep } = inset(tstart, full, TRACK_GAP);
      const t = mk('path');
      t.setAttribute('d', sectorPath(from, sweep));
      t.setAttribute('class', 'pie-track');
      svg.append(t);
      tstart += full;
    });
  }

  let start = 0;
  const labelBoxes = [];
  slices.forEach((g, i) => {
    const full = g.n / total * 360;
    const color = g.color || palette[i % palette.length];
    const { from, sweep } = slices.length === 1
      ? { from: 0, sweep: 360 } : inset(start, full, GAP);

    const shape = mk('path');
    shape.setAttribute('d', sectorPath(from, sweep));
    shape.setAttribute('fill', color);
    if (slices.length === 1) shape.setAttribute('fill-rule', 'evenodd');
    const t = mk('title');
    t.textContent = `${g.label} · ${fmt(g.n)} คน (${pct(g.n, total)}%)`;
    shape.append(t);
    svg.append(shape);

    /* ตัวเลขวางบนกึ่งกลางความหนาของวง ชิ้นที่แคบกว่านี้กล่องจะทับชิ้นข้างเคียง
       จึงปล่อยให้อ่านจากคำอธิบายด้านข้างแทน */
    if (full >= 40) labelBoxes.push({ deg: start + full / 2, text: pct(g.n, total) + '%' });
    start += full;
  });

  /* วาดกล่องตัวเลขทีหลังทั้งชุด เพื่อให้อยู่เหนือทุกชิ้นเสมอ ไม่ถูกชิ้นถัดไปทับ */
  labelBoxes.forEach(({ deg, text }) => {
    const [lx, ly] = at(deg, R);
    const w = text.length * 5 + 8, h = 12;
    const box = mk('rect');
    box.setAttribute('x', (lx - w / 2).toFixed(2));
    box.setAttribute('y', (ly - h / 2).toFixed(2));
    box.setAttribute('width', w.toFixed(2));
    box.setAttribute('height', h);
    box.setAttribute('rx', h / 2);
    box.setAttribute('class', 'pie-tagbox');
    const label = mk('text');
    label.setAttribute('x', lx.toFixed(2));
    label.setAttribute('y', ly.toFixed(2));
    label.setAttribute('class', 'pie-pct');
    label.textContent = text;
    svg.append(box, label);
  });

  const legend = el('div', 'pie-legend');
  slices.forEach((g, i) => {
    const row = el('div', 'pl-row');
    const dot = el('i', 'dot');
    dot.style.background = g.color || palette[i % palette.length];
    const name = el('span', 'pl-name', g.label);
    name.title = g.label;
    row.append(dot, name,
      el('b', null, pct(g.n, total) + '%'),
      el('span', 'pl-n', fmt(g.n) + ' คน'));
    legend.append(row);
  });

  const wrap = el('div', 'pie-wrap');
  const chart = el('div', 'pie-chart');
  chart.append(svg);
  wrap.append(chart, legend);
  host.append(wrap);
  host.append(el('p', 'scale-note', `ทั้งวง = ผู้ตอบ ${fmt(total)} คน`));
}

Object.assign(CHARTS, { waffle, gauge, heatmap, bubbles, stacked, paired, chips, grouped, split, pie });
