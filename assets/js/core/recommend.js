/* [core] เครื่องมือแนะนำ "ทำอะไรก่อน" — คืนค่าเป็นข้อมูลล้วน ไม่มี HTML
 *
 * หลักการ: ทุกข้อเสนอต้องมีครบ 3 อย่าง ไม่งั้นไม่ถือว่าใช้ได้จริง
 *   1. ทำอะไร   (do)      — ประโยคสั่ง สั้น ลงมือได้เลย
 *   2. แก้ที่ไหน (why)     — สาเหตุจากคำตอบจริงของกลุ่มตัวอย่าง + กี่ % ของผู้ตอบ
 *   3. ทำไมถึงน่าได้ผล (effect + source) — งานวิจัยในโฟลเดอร์ เอกสาร/ พบอะไร
 *
 * เรียงลำดับตาม "จำนวนคนที่ติดปัญหานั้น" มากไปน้อย — แก้ข้อที่กระทบคนเยอะที่สุดก่อน
 *
 * ที่มาของข้อเสนอมี 3 ทาง รวมกันแล้วตัดที่ซ้ำออก
 *   - คำตอบแบบเลือกตอบ  -> analysis.causes (ตั้งค่าที่ pages/analysis.js)
 *   - คำตอบปลายเปิด     -> THEMES (core/textAnalysis.js)
 *   - พฤติกรรมการเจอข่าว -> กติกาด้านล่างนี้ (เจอโดยบังเอิญเยอะ = ต้องไปหาคนถึงฟีด)
 */

import { pct } from './format.js?v=68';
import { groupBy } from './compute.js?v=68';
import { SOURCES } from './benchmarks.js?v=68';
import { analyzeText } from './textAnalysis.js?v=68';
import { causes as calcCauses } from './insight.js?v=68';

/** ข้อเสนอจากพฤติกรรม — ใช้เมื่อสัดส่วน "เจอข่าวโดยบังเอิญ" สูงกว่าเกณฑ์ */
const FEED_ACTION = {
  do: 'วางข่าวโลกไว้ในฟีดที่คนอยู่แล้ว อย่ารอให้คนเข้าเว็บข่าวเอง',
  source: 'reuters',
  effect: 'คนไทย 18–34 ใช้โซเชียลเป็นทางเข้าข่าวหลัก 63% และใช้ TikTok ดูข่าว 49%'
};

const withSource = a => {
  const src = SOURCES[a.source];
  return { ...a, sourceShort: src ? src.short : null, sourceFull: src ? src.full : null };
};

/**
 * @returns {{actions: Array, coverage: number}} actions เรียงตามจำนวนคนที่กระทบ
 *          แต่ละตัว: { rank, do, why, share, count, effect, sourceShort, sourceFull, from }
 */
export function recommend(rows, analysis = {}, { top = 5, textColumn } = {}) {
  const people = rows.length || 1;
  const pool = [];

  /* 1) จากคำตอบแบบเลือกตอบ — มีทางแก้ผูกไว้ในคอนฟิกแล้ว */
  calcCauses(rows, analysis, { top: 6 })
    .filter(c => c.fix)
    .forEach(c => pool.push({
      do: c.fix, why: c.label, share: c.share, count: c.count,
      effect: c.effect, source: c.source, from: 'เลือกตอบ'
    }));

  /* 2) จากคำตอบปลายเปิด — ใช้เฉพาะ "อุปสรรค" ก่อน ถ้าไม่มีค่อยใช้ "แรงดึง"
     (แรงดึง = สิ่งที่ทำให้คนหยุดดูข่าวดราม่า → คือสิ่งที่ข่าวโลกต้องมีให้ได้) */
  const tx = analyzeText(rows, textColumn || analysis.openTextCol);
  const barriers = tx.themes.filter(t => t.kind === 'barrier');
  const picked = barriers.length ? barriers : tx.themes.filter(t => t.kind === 'pull');
  picked.slice(0, 3).forEach(t => pool.push({
    do: t.method,
    why: (barriers.length ? '' : 'สิ่งที่ทำให้คนหยุดดู: ') + t.label,
    share: t.share, count: t.count,
    effect: t.effect || null, source: t.source, from: 'ปลายเปิด'
  }));

  /* 3) จากพฤติกรรม — เจอข่าวโดยบังเอิญเยอะ แปลว่าฟีดเป็นคนเลือกข่าวให้
     ต้องใช้ howFoundCol (เจอยังไง) ไม่ใช่ channelCol (ช่องทางไหน) — คนละคอลัมน์กัน */
  if (analysis.howFoundCol) {
    const g = groupBy(rows, { x: analysis.howFoundCol, agg: 'count', sort: 'value' });
    const i = g.labels.findIndex(l => l.includes('บังเอิญ'));
    if (i >= 0) {
      const share = pct(g.values[i], people);
      if (share >= 30) pool.push({
        ...FEED_ACTION, why: 'เจอข่าวโดยบังเอิญ ไม่ได้ตั้งใจหา',
        share, count: g.values[i], from: 'พฤติกรรม'
      });
    }
  }

  /* ตัดข้อเสนอที่ซ้ำ (ข้อความ do เหมือนกัน) เก็บอันที่กระทบคนเยอะกว่าไว้ */
  const best = new Map();
  pool.forEach(a => {
    const cur = best.get(a.do);
    if (!cur || a.share > cur.share) best.set(a.do, a);
  });

  const actions = [...best.values()]
    .sort((x, y) => y.share - x.share)
    .slice(0, top)
    .map((a, i) => withSource({ ...a, rank: i + 1 }));

  return { actions, coverage: actions.reduce((s, a) => Math.max(s, a.share), 0) };
}
