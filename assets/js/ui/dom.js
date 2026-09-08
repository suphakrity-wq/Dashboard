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

/** แบ่งหลอดวัดค่าเป็นบล็อกสี่เหลี่ยมมุมมนเรียงต่อกัน
 *  ช่วยให้นับค่าได้ด้วยตาโดยไม่ต้องอ่านตัวเลข
 *
 *  ตัดสินใจ "ทั้งกราฟพร้อมกัน" ไม่ใช่ทีละหลอด ไม่งั้นจะได้หน้าตาปนกัน
 *  (บางแถวเป็นบล็อก บางแถวเป็นหลอดยาว เพราะกว้างต่างกันไม่กี่พิกเซล)
 *
 *  จอเล็ก = ลดจำนวนบล็อกลง ไม่ใช่เลิกแบ่ง
 *  ปกติ 1 บล็อก = 1 หน่วย ถ้าที่ไม่พอจะรวบเป็น 1 บล็อก = 2, 3, ... หน่วย
 *  ค่าที่แสดงยังตรงตามจริงเสมอ เพราะบล็อกสุดท้ายเติมตามเศษที่เหลือจริง
 *  (เช่น 1 บล็อก = 3 ข่าว ค่า 7 ข่าว = บล็อกเต็ม 2 + บล็อกที่สามเติม 1 ใน 3)
 *
 *  เลิกแบ่งก็ต่อเมื่อรวบจนเหลือน้อยกว่า 3 บล็อกแล้วยังไม่พอ — กลับไปเป็นหลอดต่อเนื่อง
 *
 *  วิธีใช้: เก็บ { track, value, color } ของทุกหลอดในกราฟไว้ในอาร์เรย์
 *          แล้วเรียก segmentBars(items, max, unitName) ครั้งเดียวหลังวาดครบ
 */
const MIN_BLOCK_PX = 9;    // บล็อกแคบกว่านี้จะกลายเป็นเส้นประจุด ๆ นับไม่ไหว
const MAX_BLOCKS = 20;     // มากกว่านี้ตาก็ไม่นับทีละอันแล้ว

export function segmentBars(items, max, unitName = '') {
  if (!items.length || !(max >= 3)) return;

  requestAnimationFrame(() => {
    const narrowest = Math.min(...items.map(it => it.track.getBoundingClientRect().width));

    // หา "กี่หน่วยต่อบล็อก" ที่ทำให้บล็อกกว้างพอ
    let per = Math.max(1, Math.ceil(Math.round(max) / MAX_BLOCKS));
    let n = Math.ceil(max / per);
    while (n >= 3 && narrowest / n < MIN_BLOCK_PX) {
      per += 1;
      n = Math.ceil(max / per);
    }
    if (n < 3 || narrowest / n < MIN_BLOCK_PX) return;   // แคบเกินไปจริง ๆ

    const gap = narrowest / n < 16 ? 2 : 3;
    items.forEach(({ track, value, color }) => {
      track.classList.add('is-seg');
      track.style.setProperty('--seg-gap', gap + 'px');
      if (per > 1) track.title = `1 ช่อง = ${per} ${unitName}`.trim();
      track.textContent = '';                            // ล้างหลอดต่อเนื่องที่วาดไว้ก่อนหน้า

      for (let i = 0; i < n; i++) {
        const cell = el('i', 'seg-blk');
        const left = (value - i * per) / per;             // สัดส่วนของค่าที่ตกอยู่ในบล็อกนี้
        if (left >= 1) {
          cell.classList.add('is-on');
          cell.style.setProperty('--c', color);
        } else if (left > 0.02) {                         // บล็อกที่มีเศษ เติมบางส่วนตามค่าจริง
          const part = el('span', 'seg-part');
          part.style.setProperty('--c', color);
          part.style.width = Math.round(left * 100) + '%';
          cell.append(part);
        }
        cell.style.animationDelay = Math.min(i, 12) * 22 + 'ms';
        track.append(cell);
      }
    });
  });
}
