/* [ui] ตัวช่วยฝั่งหน้าตา — สร้าง element, อนิเมชัน */

export const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

/** ตัวเลขวิ่งขึ้นตอนโหลด */
export function countUp(node, target, dur = 600) {
  const tn = document.createTextNode(target == null ? '–' : '0');
  node.prepend(tn);
  if (target == null) return;
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    tn.nodeValue = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 })
      .format(Math.round(target * eased * 100) / 100);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** ตั้งความกว้างของหลอดวัดค่าแบบมีอนิเมชัน */
export const growBar = (node, percent) =>
  requestAnimationFrame(() => { node.style.width = Math.max(0, Math.min(100, percent)) + '%'; });

/** แบ่งหลอดวัดค่าเป็นบล็อกสี่เหลี่ยมเรียงต่อกัน (1 บล็อก = 1 หน่วย)
 *  ช่วยให้นับค่าได้ด้วยตาโดยไม่ต้องอ่านตัวเลข
 *
 *  จะแบ่งก็ต่อเมื่อ
 *    - จำนวนบล็อกอยู่ระหว่าง 3-20 (มากกว่านี้บล็อกเยอะจนนับไม่ไหว)
 *    - แต่ละบล็อกกว้างอย่างน้อย 9px หลังจัดหน้าเสร็จแล้ว (จอแคบหลอดจะสั้น
 *      ถ้าฝืนแบ่งจะกลายเป็นเส้นประจุด ๆ อ่านยากกว่าเดิม)
 *  ถ้าไม่เข้าเงื่อนไข ปล่อยเป็นหลอดยาวต่อเนื่องเหมือนเดิม
 *
 *  วิธีตัด: ใช้ CSS mask ที่คลาส .is-seg (ดู 4-components.css)
 *  จึงตัดทั้งส่วนที่มีค่าและรางว่างพร้อมกันในครั้งเดียว
 */
export function segmentBar(track, max) {
  const n = Math.round(max);
  if (!(n >= 3 && n <= 20)) return;
  requestAnimationFrame(() => {
    const block = track.getBoundingClientRect().width / n;
    if (block < 9) return;
    track.classList.add('is-seg');
    track.style.setProperty('--seg', n);
    // บล็อกยิ่งเล็ก ช่องไฟยิ่งต้องบางลง ไม่งั้นเนื้อบล็อกจะเหลือนิดเดียว
    track.style.setProperty('--seg-gap', (block < 16 ? 2 : 3) + 'px');
  });
}
