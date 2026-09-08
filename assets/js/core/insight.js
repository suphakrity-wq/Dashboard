/* [core] ตรรกะการวิเคราะห์ — คืนค่าเป็น "ข้อมูล" ล้วน ไม่มี HTML
   ฝั่งหน้าตาเอาผลลัพธ์ไปวาดเอง จะเปลี่ยนหน้าตาโดยไม่กระทบตรรกะได้ */

import { avgOf, groupBy, num } from './compute.js?v=37';
import { pct } from './format.js?v=37';
import { pairedTTest, wilcoxonSignedRank, effectSizeLabel, requiredN } from './stats.js?v=37';

/**
 * ตัดสินคำถามวิจัยด้วยการทดสอบทางสถิติ ไม่ใช่เกณฑ์ที่ตั้งเอง
 *
 * เหตุผลที่เลือกวิธีนี้: ผู้ตอบ 1 คนให้ค่า 2 ค่า (รู้จักข่าวโลกกี่ข่าว / ข่าวดราม่ากี่ข่าว)
 * จึงเป็นข้อมูล "จับคู่" ต้องทดสอบผลต่างรายคน (paired t-test)
 * และรายงาน Wilcoxon signed-rank คู่กันไว้ เผื่อข้อมูลไม่แจกแจงปกติ
 */
export function verdict(rows, analysis = {}) {
  const pairs = rows
    .map(r => ({ a: num(r[analysis.worldCol]), b: num(r[analysis.dramaCol]) }))
    .filter(p => p.a !== null && p.b !== null);

  const diffs = pairs.map(p => p.b - p.a);          // บวก = ข่าวดราม่านำ
  const world = avgOf(rows, analysis.worldCol);
  const drama = avgOf(rows, analysis.dramaCol);
  const n = pairs.length;
  const alpha = analysis.alpha ?? 0.05;
  const minSample = analysis.minSample ?? 25;

  const t = n >= 2 ? pairedTTest(diffs) : null;
  const w = n >= 2 ? wilcoxonSignedRank(diffs) : null;
  const diffPctRaw = (world && drama) ? Math.round((drama / world - 1) * 100) : 0;

  let answer, tone, why;
  if (!n) {
    answer = 'ยังไม่มีข้อมูล'; tone = 'neutral'; why = 'รอผลตอบแบบสอบถาม';
  } else if (n < 5 || !t || t.p == null) {
    answer = 'ยังสรุปไม่ได้'; tone = 'neutral';
    why = `มีผู้ตอบ ${n} คน ยังน้อยเกินกว่าจะทดสอบทางสถิติ`;
  } else if (t.p < alpha) {
    const dir = t.meanDiff > 0;
    answer = dir ? 'จริง' : 'ไม่จริง';
    tone = dir ? 'yes' : 'no';
    why = dir
      ? `ผู้ตอบรู้จักข่าวดราม่ามากกว่าข่าวโลกเฉลี่ย ${Math.abs(t.meanDiff).toFixed(1)} ข่าว/คน และผลต่างนี้มีนัยสำคัญทางสถิติ`
      : `กลุ่มนี้กลับรู้จักข่าวโลกมากกว่าข่าวดราม่าเฉลี่ย ${Math.abs(t.meanDiff).toFixed(1)} ข่าว/คน อย่างมีนัยสำคัญ`;
  } else {
    answer = 'ยังไม่ต่างอย่างมีนัยสำคัญ'; tone = 'mid';
    why = `ผลต่างเฉลี่ย ${t.meanDiff.toFixed(1)} ข่าว/คน แต่ยังอธิบายด้วยความบังเอิญได้ (p = ${t.p.toFixed(3)})`;
  }

  const stats = t ? {
    n,
    meanDiff: t.meanDiff,
    ci: t.ci,
    p: t.p,
    t: t.t,
    df: t.df,
    dz: t.dz,
    effect: effectSizeLabel(t.dz),
    wilcoxonP: w?.p ?? null,
    significant: t.p != null && t.p < alpha,
    alpha,
    needN: (t.p != null && t.p >= alpha && t.dz) ? requiredN(t.dz) : null
  } : null;

  return {
    answer, tone, why, world, drama, n,
    diff: diffPctRaw,
    stats,
    enough: n >= minSample, minSample,
    warn: n < minSample
      ? `ผู้ตอบ ${n} คน ยังไม่ถึงเกณฑ์ ${minSample} คนที่ตั้งไว้ — อ่านผลประกอบช่วงความเชื่อมั่นเสมอ`
      : null
  };
}

/** จัดอันดับสาเหตุจากคำตอบจริง แล้วจับคู่กับข้อเสนอแนะ */
export function causes(rows, analysis = {}, { column, top = 4 } = {}) {
  const col = column || analysis.whyNotWorldCol;
  const g = groupBy(rows, { x: col, multi: true, agg: 'count', sort: 'value', top });
  return g.labels.map((label, i) => ({
    rank: i + 1,
    label,
    count: g.values[i],
    share: pct(g.values[i], rows.length),
    fix: (analysis.causes || []).find(c => label.includes(c.match))?.fix || null
  }));
}

/** แรงดึงฝั่งดราม่า — องค์ประกอบที่ข่าวโลกมักไม่มี */
export function pulls(rows, analysis = {}, { column, top = 3 } = {}) {
  const col = column || analysis.whyDramaCol;
  const g = groupBy(rows, { x: col, multi: true, agg: 'count', sort: 'value', top });
  return g.labels.map((label, i) => ({
    rank: i + 1, label, count: g.values[i], share: pct(g.values[i], rows.length)
  }));
}
