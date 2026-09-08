/* [core] ค่าอ้างอิงจากงานวิจัย/รายงานภายนอก ใช้ "รองรับ" ตัวเลขที่เก็บเองในแบบสอบถาม
   ทุกตัวเลขในไฟล์นี้คัดมาจากเอกสารในโฟลเดอร์ เอกสาร/ พร้อมระบุหน้า
   ถ้าเพิ่มเอกสารใหม่ ให้เพิ่มรายการที่นี่ที่เดียว */

export const SOURCES = {
  reuters: { id: 'A2', short: 'Reuters DNR 2025',
             full: 'Reuters Institute, Digital News Report 2025 — บทประเทศไทย (น.156–157)' },
  etda:    { id: 'A1', short: 'ETDA 2565',
             full: 'ETDA, รายงานพฤติกรรมผู้ใช้อินเทอร์เน็ตในประเทศไทย ปี 2565' },
  robertson:{ id: 'E1', short: 'Robertson 2023',
             full: 'Robertson et al. (2023), Negativity drives online news consumption, Nature Human Behaviour' },
  prior:   { id: 'E3', short: 'Prior 2005',
             full: 'Prior (2005), News vs. Entertainment, American Journal of Political Science' },
  clt:     { id: 'C1', short: 'Gundogdu 2026',
             full: 'Gundogdu et al. (2026), Local news at a distance: psychological distance and news deserts' },
  frame:   { id: 'D1', short: 'Kim & Zhou 2020',
             full: 'Kim & Zhou (2020), The Effects of Political Conflict News Frame, Int. Journal of Communication' },
  yaros:   { id: 'F1', short: 'Yaros et al.',
             full: 'Yaros et al., Varying the style of headlines and their amount of information' }
};

/**
 * ค่าอ้างอิงเชิงตัวเลข — เทียบกับผลสำรวจของเราได้ตรง ๆ
 * measure = ฟังก์ชันคำนวณค่าฝั่งเราจากแถวข้อมูล
 */
export const BENCHMARKS = [
  {
    id: 'social-first',
    label: 'ใช้โซเชียลเป็นทางเข้าหลักของข่าว',
    external: 63, unit: '%',
    externalNote: 'คนไทยอายุ 18–34 ใช้โซเชียลเป็นแหล่งข่าวหลัก',
    source: 'reuters',
    read: (v, ext) => v >= ext ? 'กลุ่มตัวอย่างพึ่งโซเชียลมากกว่าค่าเฉลี่ยคนไทยวัยเดียวกัน'
                               : 'ใกล้เคียง/ต่ำกว่าค่าเฉลี่ยคนไทยวัยเดียวกัน'
  },
  {
    id: 'tiktok',
    label: 'ใช้ TikTok เป็นช่องทางข่าว',
    external: 49, unit: '%',
    externalNote: 'คนไทยใช้ TikTok เพื่อดูข่าว (เพิ่มขึ้น 10 จุดใน 1 ปี)',
    source: 'reuters',
    read: (v, ext) => v >= ext ? 'สูงกว่าภาพรวมประเทศ — ฟีดวิดีโอคือสมรภูมิหลัก'
                               : 'ต่ำกว่าภาพรวมประเทศเล็กน้อย'
  },
  {
    id: 'facebook',
    label: 'ใช้ Facebook เป็นช่องทางข่าว',
    external: 62, unit: '%',
    externalNote: 'คนไทยใช้ Facebook เพื่อดูข่าว',
    source: 'reuters'
  }
];

/** ข้อเท็จจริงเชิงบริบท ใช้ประกอบคำอธิบาย ไม่ได้เทียบเป็นตัวเลขโดยตรง */
export const CONTEXT_FACTS = [
  { text: 'คนไทย 88% เข้าถึงข่าวออนไลน์ทุกสัปดาห์ และนิยม “ดู” ข่าว (43%) มากกว่า “อ่าน” (32%)',
    source: 'reuters' },
  { text: 'รายงานระบุว่าเนื้อหาบันเทิงมักกลบข่าวเพื่อประโยชน์สาธารณะในตลาดสื่อไทย',
    source: 'reuters' },
  { text: 'คนไทยใช้อินเทอร์เน็ตเฉลี่ย 8 ชั่วโมง 57 นาทีต่อวัน — เวลาอยู่บนหน้าจอไม่ใช่ข้อจำกัด แต่ “ความสนใจ” ต่างหากที่จำกัด',
    source: 'etda' },
  { text: 'ทุกคำเชิงลบที่เพิ่มในพาดหัว เพิ่มอัตราการคลิกราว 2.3% (ทดลองสุ่ม 105,000 พาดหัว)',
    source: 'robertson' },
  { text: 'เมื่อทางเลือกสื่อมากขึ้น คนที่ชอบความบันเทิงจะเลิกดูข่าว ทำให้ช่องว่างความรู้ถ่างออก',
    source: 'prior' },
  { text: 'เรื่องที่รู้สึก “ไกลตัว” จะถูกประมวลผลแบบนามธรรม คนจึงรู้สึกไม่เกี่ยวข้องและไม่สนใจ',
    source: 'clt' },
  { text: 'การเล่าแบบมีคู่ขัดแย้งเพิ่มการมีส่วนร่วม แต่มีผลข้างเคียงคือการแบ่งขั้ว',
    source: 'frame' },
  { text: 'พาดหัวที่ให้ความหมายมากที่สุดโดยใช้แรงคิดน้อยที่สุด มีโอกาสถูกเลือกสูงกว่า',
    source: 'yaros' }
];

/** เทียบค่าของเรากับค่าอ้างอิง -> รายการพร้อมสถานะ */
export function compareBenchmarks(rows, measures = {}) {
  return BENCHMARKS.map(b => {
    const ours = measures[b.id] != null ? Math.round(measures[b.id]) : null;
    const diff = ours == null ? null : ours - b.external;
    return {
      ...b,
      ours,
      diff,
      status: diff == null ? 'no-data' : Math.abs(diff) <= 5 ? 'same' : diff > 0 ? 'higher' : 'lower',
      reading: ours == null ? 'ยังไม่มีข้อมูลฝั่งเรา'
             : (b.read ? b.read(ours, b.external)
                       : (Math.abs(diff) <= 5 ? 'ใกล้เคียงค่าอ้างอิง'
                          : diff > 0 ? 'สูงกว่าค่าอ้างอิง' : 'ต่ำกว่าค่าอ้างอิง'))
    };
  });
}
