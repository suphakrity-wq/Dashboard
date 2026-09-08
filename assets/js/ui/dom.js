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

/* ============ หลอดวัดค่าแบบแบ่งบล็อก ============
   ตัดหลอดเป็นสี่เหลี่ยมมุมมนเรียงต่อกัน ช่วยให้นับค่าได้ด้วยตาโดยไม่ต้องอ่านตัวเลข

   หลักการ
   - ตัดสินใจ "ทั้งกราฟพร้อมกัน" ไม่ใช่ทีละหลอด ไม่งั้นจะได้หน้าตาปนกัน
     (บางแถวเป็นบล็อก บางแถวเป็นหลอดยาว เพราะกว้างต่างกันไม่กี่พิกเซล)
   - จอเล็ก = ลดจำนวนบล็อกลง ไม่ใช่เลิกแบ่ง
     ปกติ 1 บล็อก = 1 หน่วย ถ้าที่ไม่พอจะรวบเป็น 1 บล็อก = 2, 3, ... หน่วย
     ค่ายังตรงตามจริงเสมอ เพราะบล็อกสุดท้ายเติมตามเศษที่เหลือจริง
     (เช่น 1 บล็อก = 3 ข่าว ค่า 7 ข่าว = บล็อกเต็ม 2 + บล็อกที่สามเติม 1 ใน 3)
   - เลิกแบ่งเมื่อรวบจนเหลือน้อยกว่า 3 บล็อกแล้วยังแคบอยู่ — กลับไปเป็นหลอดต่อเนื่อง
   - ย่อ/ขยายหน้าต่างแล้ววาดใหม่ให้เอง ไม่งั้นจำนวนบล็อกจะค้างอยู่กับความกว้างตอนโหลด
     (เคยเป็นบั๊ก: หดจอแล้วบล็อกเล็กจิ๋วจนอ่านค่าไม่ได้ ขยายจอแล้วก็ไม่กลับมาละเอียดขึ้น)

   วิธีใช้: เก็บ { track, value, color } ของทุกหลอดในกราฟไว้ในอาร์เรย์
           แล้วเรียก segmentBars(items, max, unitName) ครั้งเดียวหลังวาดครบ
           ฟังก์ชันนี้เป็นเจ้าของเนื้อหาใน track ทั้งหมด (วาดทั้งแบบบล็อกและแบบต่อเนื่อง)
   ============================================================ */

const MIN_BLOCK_PX = 9;    // บล็อกแคบกว่านี้จะกลายเป็นเส้นประจุด ๆ นับไม่ไหว
const MAX_BLOCKS = 20;     // มากกว่านี้ตาก็ไม่นับทีละอันแล้ว

/** กราฟทั้งหมดในหน้าที่ต้องวาดใหม่เมื่อความกว้างเปลี่ยน */
const barGroups = [];

/** วาดหลอดต่อเนื่องแบบเดิม (ใช้เมื่อที่ไม่พอจะแบ่งบล็อก) */
function drawSolid(track, value, max, color) {
  track.classList.remove('is-seg');
  track.removeAttribute('title');
  track.style.removeProperty('--seg-gap');
  track.textContent = '';
  const fill = el('i');
  fill.style.setProperty('--c', color);
  track.append(fill);
  growBar(fill, value / max * 100);
}

/** วาดหลอดแบบแบ่งบล็อก: n บล็อก บล็อกละ per หน่วย */
function drawBlocks(track, value, per, n, color, gap, unitName, animate) {
  track.classList.add('is-seg');
  track.style.setProperty('--seg-gap', gap + 'px');
  if (per > 1) track.title = `1 ช่อง = ${per} ${unitName}`.trim();
  else track.removeAttribute('title');
  track.textContent = '';

  for (let i = 0; i < n; i++) {
    const cell = el('i', 'seg-blk');
    const left = (value - i * per) / per;          // สัดส่วนของค่าที่ตกอยู่ในบล็อกนี้
    if (left >= 1) {
      cell.classList.add('is-on');
      cell.style.setProperty('--c', color);
    } else if (left > 0.02) {                      // บล็อกที่มีเศษ เติมบางส่วนตามค่าจริง
      const part = el('span', 'seg-part');
      part.style.setProperty('--c', color);
      part.style.width = Math.round(left * 100) + '%';
      cell.append(part);
    }
    // อนิเมชันเฉพาะตอนวาดครั้งแรก ตอนย่อ/ขยายหน้าต่างไม่ต้องกะพริบใหม่ทุกครั้ง
    if (animate) cell.style.animationDelay = Math.min(i, 12) * 22 + 'ms';
    else cell.style.animation = 'none';
    track.append(cell);
  }
}

/** คำนวณว่าควรแบ่งกี่บล็อก บล็อกละกี่หน่วย จากความกว้างจริงบนหน้าจอ */
function planBlocks(items, max) {
  const narrowest = Math.min(...items.map(it => it.track.getBoundingClientRect().width));
  if (!(narrowest > 0)) return null;

  let per = Math.max(1, Math.ceil(Math.round(max) / MAX_BLOCKS));
  let n = Math.ceil(max / per);
  while (n >= 3 && narrowest / n < MIN_BLOCK_PX) {
    per += 1;
    n = Math.ceil(max / per);
  }
  if (n < 3 || narrowest / n < MIN_BLOCK_PX) return null;   // แคบเกินไปจริง ๆ
  return { per, n, gap: narrowest / n < 16 ? 2 : 3 };
}

function paintGroup(group, animate) {
  const { items, max, unitName } = group;
  const plan = planBlocks(items, max);
  items.forEach(({ track, value, color }) => {
    if (plan) drawBlocks(track, value, plan.per, plan.n, color, plan.gap, unitName, animate);
    else drawSolid(track, value, max, color);
  });
}

export function segmentBars(items, max, unitName = '') {
  if (!items.length || !(max >= 3)) return;
  const group = { items, max, unitName };
  barGroups.push(group);
  requestAnimationFrame(() => paintGroup(group, true));
}

/* วาดใหม่เมื่อความกว้างหน้าต่างเปลี่ยน — หน่วงไว้กันวาดรัวตอนลากขอบหน้าต่าง
   และทิ้งกราฟที่ถูกถอดออกจากหน้าไปแล้ว (เปลี่ยนหน้า/กรองข้อมูลใหม่) */
let resizeTimer = null;
let lastWidth = window.innerWidth;
window.addEventListener('resize', () => {
  if (window.innerWidth === lastWidth) return;      // ความสูงเปลี่ยนอย่างเดียว ไม่ต้องวาดใหม่
  lastWidth = window.innerWidth;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    for (let i = barGroups.length - 1; i >= 0; i--) {
      const alive = barGroups[i].items.some(it => it.track.isConnected);
      if (!alive) barGroups.splice(i, 1);
      else paintGroup(barGroups[i], false);
    }
  }, 160);
});
