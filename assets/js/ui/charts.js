/* [ui] กราฟทั้งหมดวาดเองด้วย HTML/SVG — ไม่ใช้ไลบรารีภายนอก
 *
 * แก้ไฟล์นี้เมื่อ: อยากเพิ่มรูปแบบกราฟใหม่ หรือปรับหน้าตากราฟเดิม
 * วิธีเพิ่มกราฟใหม่:
 *   1. เขียนฟังก์ชัน myChart(host, cf, rows) — cf คือค่าที่ตั้งไว้ในไฟล์หน้า
 *   2. เติมชื่อลงใน CHARTS (มี Object.assign เพิ่มไว้ท้ายไฟล์)
 *   3. เรียกใช้: { type: "myChart", … } ในบล็อก charts ของหน้า
 * ข้อตกลง: ดึงข้อมูลผ่าน groupBy/crossTab จาก core/compute.js เท่านั้น
 */

import { el, growBar } from './dom.js?v=24';
import { fmt, round1, pct } from '../core/format.js?v=24';
import { num, groupBy, crossTab, avgOf, pickGroupColumn, distinctValues, compareGroups } from '../core/compute.js?v=24';
import { welchTTest } from '../core/stats.js?v=24';

/* ---------- 1. อันดับพร้อมหลอดวัดค่า ---------- */
export function rank(host, cf, rows) {
  const { labels, values } = groupBy(rows, cf);
  const max = Math.max(...values, 1);
  const list = el('div', 'rank');

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
    growBar(fill, values[i] / max * 100);
  });

  host.append(list);
}

/* ---------- 2. เทียบสองฝั่ง: สองข้างพร้อมส่วนต่างตรงกลาง ---------- */
export function gap(host, cf, rows) {
  const [A, B] = cf.ys;
  const totalA = avgOf(rows, A.column) ?? 0, totalB = avgOf(rows, B.column) ?? 0;
  const max = Math.max(totalA, totalB, 1);
  const hi = totalB >= totalA ? B : A;
  const hiV = Math.max(totalA, totalB), loV = Math.min(totalA, totalB);
  const diffPct = loV ? Math.round((hiV / loV - 1) * 100) : 0;
  const diffAbs = round1(hiV - loV);

  /* --- ส่วนบน: สองฝั่ง + ส่วนต่างตรงกลาง --- */
  const versus = el('div', 'versus');
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
    growBar(fill, value / max * 100);
    return box;
  };

  const mid = el('div', 'vs-mid');
  mid.innerHTML = `<span class="vs-cap">ต่างกัน</span>
    <b>${fmt(diffAbs)}</b><span class="vs-unit">${cf.unit || ''}</span>
    <span class="vs-chip">${hi.label}นำ ${fmt(diffPct)}%</span>`;

  versus.append(side(A, totalA, 'is-a'), mid, side(B, totalB, 'is-b'));
  host.append(versus);

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
  const groupMax = Math.max(...gA.values, ...gB.values, 1);

  if (gA.labels.length) {
    const sub = el('div', 'subgroup');
    const cap = el('div', 'sub-head');
    cap.append(el('span', 'subcap', (cf.groupLabel || 'แยกตามกลุ่ม') + ` · ${groupCol}`));
    const legend = el('div', 'sub-legend');
    [A, B].forEach(series => {
      const item = el('span');
      const dot = el('i', 'dot'); dot.style.background = series.color;
      item.append(dot, series.label);
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
      [[A, a], [B, b]].forEach(([series, value]) => {
        const line = el('div', 'sg-line');
        const track = el('div', 'sg-track');
        const fill = el('i');
        fill.style.setProperty('--c', series.color);
        track.append(fill);
        line.append(track, el('b', null, fmt(round1(value))));
        bars.append(line);
        growBar(fill, value / groupMax * 100);
      });
      row.append(bars);
      sub.append(row);
    });
    host.append(sub);
  }
}

/* ---------- 3. โดนัท ---------- */
export function donut(host, cf, rows) {
  const { labels, values } = groupBy(rows, cf);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const palette = cf.colors || ['var(--blue)', 'var(--orange)', 'var(--gray)', 'var(--ink-2)'];

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 42 42');
  svg.setAttribute('class', 'donut');

  const R = 15.9155, C = 2 * Math.PI * R;
  let acc = 0;
  values.forEach((v, i) => {
    const arc = document.createElementNS(NS, 'circle');
    arc.setAttribute('cx', 21); arc.setAttribute('cy', 21); arc.setAttribute('r', R);
    arc.setAttribute('fill', 'none');
    arc.setAttribute('stroke', palette[i % palette.length]);
    arc.setAttribute('stroke-width', 5);
    arc.setAttribute('stroke-linecap', 'round');
    arc.setAttribute('stroke-dasharray', `${(v / total * C - 0.6).toFixed(2)} ${C}`);
    arc.setAttribute('stroke-dashoffset', (C / 4 - acc).toFixed(2));
    arc.setAttribute('transform', 'rotate(-90 21 21)');
    svg.append(arc);
    acc += v / total * C;
  });

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


/* ---------- 10. เทียบช่องว่างระหว่างกลุ่ม ----------
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
      `(ห่างกัน ${fmt(round1(widest.gap))} ข่าว) · แคบที่สุดคือ <b>${narrowest.label}</b> ` +
      `(ห่างกัน ${fmt(round1(narrowest.gap))} ข่าว)`;
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
          `(p = ${test.p.toFixed(3)} — ผลต่างเท่านี้เกิดจากความบังเอิญได้)`;
      note.classList.add(test.p < 0.05 ? 'is-sig' : 'is-nosig');
      host.append(note);
    }
  }

  const max = Math.max(...groups.map(g => Math.max(g.a || 0, g.b || 0)), 1);
  const list = el('div', 'cmp');

  groups.forEach(g => {
    const row = el('div', 'cmp-row' + (g.enough ? '' : ' is-thin'));

    const head = el('div', 'cmp-head');
    head.append(el('b', null, g.label));
    head.append(el('span', 'cmp-n', `${fmt(g.n)} คน`));
    if (g.gap != null) {
      const chip = el('span', 'cmp-gap');
      chip.textContent = 'ห่างกัน ' + fmt(round1(Math.abs(g.gap))) + ' ข่าว';
      chip.classList.add(g.gap >= 0 ? 'is-drama' : 'is-world');
      head.append(chip);
    }
    row.append(head);

    const bars = el('div', 'cmp-bars');
    [[cf.labelA || 'ข่าวโลก', g.a, cf.colorA], [cf.labelB || 'ข่าวดราม่า', g.b, cf.colorB]].forEach(([name, v, color]) => {
      const line = el('div', 'cmp-line');
      line.append(el('span', 'cmp-name', name));
      const track = el('div', 'sg-track');
      const fill = el('i');
      fill.style.setProperty('--c', color);
      track.append(fill);
      line.append(track, el('b', null, fmt(round1(v))));
      bars.append(line);
      growBar(fill, (v || 0) / max * 100);
    });
    row.append(bars);

    if (!g.enough) row.append(el('p', 'cmp-warn', `กลุ่มนี้มีแค่ ${g.n} คน ตัวเลขยังแกว่งง่าย`));
    list.append(row);
  });
  host.append(list);
}

export const CHARTS = { rank, gap, donut, compare };


/* ---------- 5. Waffle: 100 จุด = 100% ----------
   เหมาะกับ "สัดส่วนของผู้ตอบ" มากกว่าหลอด เพราะนับจุดได้ด้วยตา */
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
      cell.title = `${labels[i]} — ${Math.round(exact[i])}%`;
      cell.style.animationDelay = Math.min(grid.children.length * 3, 300) + 'ms';
      grid.append(cell);
    }
  });

  const legend = el('div', 'wf-legend');
  labels.forEach((label, i) => {
    const row = el('div', 'wf-item');
    const dot = el('i', 'dot');
    dot.style.background = palette[i % palette.length];
    row.append(dot, el('span', 'wf-name', label), el('b', null, Math.round(exact[i]) + '%'));
    legend.append(row);
  });

  const wrap = el('div', 'waffle-wrap');
  wrap.append(grid, legend);
  host.append(wrap);
}

/* ---------- 6. Gauge: เข็มวัดครึ่งวงกลม ----------
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

/* ---------- 7. Heatmap: ตาราง 2 มิติ ----------
   แต่ละแถว = หนึ่งหัวข้อ · แต่ละคอลัมน์ = หนึ่งกลุ่ม · ยิ่งเข้ม = ยิ่งมีคนตอบมาก */
export function heatmap(host, cf, rows) {
  const groupCol = pickGroupColumn(rows, [cf.group, ...(cf.groupFallback || [])]);
  if (!groupCol) {
    host.append(el('p', 'hint', cf.singleGroupNote ||
      'ยังแบ่งกลุ่มไม่ได้ เพราะผู้ตอบอยู่กลุ่มเดียวกันทั้งหมด — ดูอันดับข่าวด้านล่างแทนได้'));
    return;
  }
  const { groups, labels, matrix, sizes, max } = crossTab(rows, { ...cf, group: groupCol });

  const table = el('div', 'heat');
  table.style.setProperty('--cols', groups.length);

  table.append(el('span', 'heat-corner'));
  groups.forEach(g => {
    const th = el('span', 'heat-col');
    th.append(el('b', null, g), el('span', null, `${sizes[g]} คน`));
    table.append(th);
  });

  labels.forEach((label, i) => {
    const line = el('div', 'heat-line');
    const name = el('span', 'heat-row', label);
    name.title = label;
    line.append(name);

    matrix[i].forEach((v, j) => {
      const cell = el('span', 'heat-cell');
      const step = v === 0 ? 0 : Math.min(5, Math.ceil(v / max * 4) + 1);
      cell.style.setProperty('--cell', step ? `var(--sc-${step})` : 'var(--hair)');
      if (step >= 4) cell.classList.add('is-dark');
      cell.append(el('span', null, v ? String(v) : '–'));
      cell.title = `${label}\n${groups[j]}: ${v} จาก ${sizes[groups[j]]} คน`;
      line.append(cell);
    });
    table.append(line);
  });
  host.append(table);

  const scale = el('div', 'heat-scale');
  scale.append(el('span', null, 'น้อย'));
  [1, 2, 3, 4, 5].forEach(n => {
    const chip = el('i');
    chip.style.background = `var(--sc-${n})`;
    scale.append(chip);
  });
  scale.append(el('span', null, `มาก (สูงสุด ${max} คน)`));
  host.append(scale);
}

/* ---------- 8. Bubble: วงกลมขนาดตามค่า ---------- */
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
    item.append(ball, el('span', 'bubble-name', label));
    item.title = `${label} — ${values[i]}`;
    wrap.append(item);
  });
  host.append(wrap);
}

/* ---------- 9. Stacked: แถบเดียว 100% ---------- */
export function stacked(host, cf, rows) {
  const { labels, values } = groupBy(rows, cf);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const palette = cf.colors || ['var(--purple)', 'var(--graphite)', 'var(--purple-3)', 'var(--gray)'];

  const bar = el('div', 'stack');
  values.forEach((v, i) => {
    const seg = el('i');
    seg.style.background = palette[i % palette.length];
    seg.title = `${labels[i]} — ${pct(v, total)}%`;
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

  const max = Math.max(...items.map(d => Math.max(d.a, d.b)), 1);

  const legend = el('div', 'legend');
  [[cf.labelA, cf.colorA], [cf.labelB, cf.colorB]].forEach(([name, color]) => {
    const item = el('span');
    const dot = el('i', 'dot'); dot.style.background = color;
    item.append(dot, name);
    legend.append(item);
  });
  host.append(legend);

  const list = el('div', 'cmp');
  items.forEach(d => {
    const row = el('div', 'cmp-row');

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
    row.append(head);

    const bars = el('div', 'cmp-bars');
    [[cf.labelA, d.a, cf.colorA], [cf.labelB, d.b, cf.colorB]].forEach(([name, v, color]) => {
      const line = el('div', 'cmp-line');
      line.append(el('span', 'cmp-name', name));
      const track = el('div', 'sg-track');
      const fill = el('i');
      fill.style.setProperty('--c', color);
      track.append(fill);
      const val = el('b', null, `${fmt(v)} คน`);
      line.append(track, val);
      bars.append(line);
      growBar(fill, v / max * 100);
    });
    row.append(bars);
    list.append(row);
  });
  host.append(list);
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
    chip.append(el('b', null, fmt(v)));
    chip.title = `${label} — ${fmt(v)} คน (${pct(v, rows.length)}%)`;
    box.append(chip);
  });
  host.append(box);
  host.append(el('p', 'hint', cf.scaleNote || 'ป้ายยิ่งเข้ม = ยิ่งมีคนเลือกมาก · ตัวเลขคือจำนวนคน'));
}

Object.assign(CHARTS, { waffle, gauge, heatmap, bubbles, stacked, paired, chips });
