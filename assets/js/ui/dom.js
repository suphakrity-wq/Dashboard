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

/** แบ่งหลอดวัดค่าเป็นบล็อกสี่เหลี่ยมมุมมนเรียงต่อกัน (1 บล็อก = 1 หน่วย)
 *  ช่วยให้นับค่าได้ด้วยตาโดยไม่ต้องอ่านตัวเลข
 *
 *  จะแบ่งก็ต่อเมื่อ
 *    - จำนวนบล็อกอยู่ระหว่าง 3-20 (มากกว่านี้บล็อกเยอะจนนับไม่ไหว)
 *    - แต่ละบล็อกกว้างอย่างน้อย 9px หลังจัดหน้าเสร็จแล้ว (จอแคบหลอดจะสั้น
 *      ถ้าฝืนแบ่งจะกลายเป็นเส้นประจุด ๆ อ่านยากกว่าเดิม)
 *  ถ้าไม่เข้าเงื่อนไข จะไม่ทำอะไรเลย หลอดต่อเนื่องที่ผู้เรียกวาดไว้จึงยังอยู่
 *
 *  ค่าที่มีเศษ เช่น 4.5 จะได้บล็อกเต็ม 4 อัน + บล็อกที่ห้าเติมครึ่งเดียว
 *  (ตัวเติมมุมมนเหมือนกัน) ที่เหลือเป็นบล็อกว่างสีราง
 *
 *  ผู้เรียกให้ทำแบบนี้เสมอ (เรียงตามนี้):
 *      track.append(fill); segmentBar(track, v, max, color); growBar(fill, v / max * 100);
 *  ถ้าแบ่งบล็อกได้ ตัว fill จะถูกลบทิ้งเอง ถ้าแบ่งไม่ได้ก็ได้หลอดต่อเนื่องตามปกติ
 */
export function segmentBar(track, value, max, color) {
  const n = Math.round(max);
  if (!(n >= 3 && n <= 20)) return;

  const build = () => {
    const block = track.getBoundingClientRect().width / n;
    if (block < 9) return;                       // แคบไป ปล่อยเป็นหลอดต่อเนื่อง
    track.classList.add('is-seg');
    track.style.setProperty('--seg-gap', (block < 16 ? 2 : 3) + 'px');
    track.textContent = '';                      // ล้างหลอดต่อเนื่องที่ใส่ไว้ก่อนหน้า

    for (let i = 0; i < n; i++) {
      const cell = el('i', 'seg-blk');
      const left = value - i;                    // ส่วนของค่าที่ตกอยู่ในบล็อกนี้
      if (left >= 1) {
        cell.classList.add('is-on');
        cell.style.setProperty('--c', color);
      } else if (left > 0.02) {                  // บล็อกที่มีเศษ เติมบางส่วน
        const part = el('b', 'seg-part');
        part.style.setProperty('--c', color);
        part.style.width = Math.round(left * 100) + '%';
        cell.append(part);
      }
      cell.style.animationDelay = Math.min(i, 12) * 22 + 'ms';
      track.append(cell);
    }
  };
  requestAnimationFrame(build);
  return true;
}
