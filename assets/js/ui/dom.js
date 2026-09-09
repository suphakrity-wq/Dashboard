/* [ui] ตัวช่วยฝั่งหน้าตา — สร้าง element, อนิเมชัน */

export const $ = (sel, root = document) => root.querySelector(sel);

export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

/** ใส่ตัวเลขลงในการ์ดสรุป
    เดิมทำเป็นตัวเลขวิ่งขึ้น แต่ระหว่างวิ่งเลขจะเปลี่ยนไปมาจนอ่านไม่ทัน
    และดูเหมือนสุ่มเลข จึงแสดงค่าจริงทันที แล้วให้ค่อย ๆ ปรากฏแทน */
export function countUp(node, target, { digits = 1 } = {}) {
  const text = target == null
    ? '–'
    : new Intl.NumberFormat('th-TH', { maximumFractionDigits: digits }).format(target);
  node.prepend(document.createTextNode(text));
  node.classList.add('num-in');
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

/* จอเล็กลง = ช่องต้องรวบกันให้ใหญ่ขึ้น ไม่ใช่ยังคงถี่เหมือนเดิมจนเป็นเส้นประ
   MIN_BLOCK_PX คือความกว้างขั้นต่ำที่ยัง "นับด้วยตา" ได้สบาย
   ตั้งไว้กว้างพอควร หลอดสั้นจึงรวบเหลือไม่กี่ช่องอัตโนมัติ */
const MIN_BLOCK_PX = 46;   // ช่องแคบกว่านี้ให้รวบหน่วยเพิ่ม (ยิ่งมากยิ่งได้ช่องยาว)
const MIN_BLOCKS = 3;      // อย่างน้อย 3 ช่อง — น้อยกว่านี้ดูไม่ออกว่าเป็นหลอดวัดค่า
const MAX_BLOCKS = 3;      // อย่างมาก 3 ช่อง — ผู้ใช้ขอให้รวบช่องคู่เข้าด้วยกัน ช่องจะได้ยาว
const HARD_MIN_PX = 18;    // 3 ช่องแล้วยังแคบกว่านี้ = กลับไปเป็นหลอดต่อเนื่อง
                           // (ช่อง 10-15px กับช่องไฟ 4px อ่านเป็นเส้นประ ไม่ใช่ช่องให้นับ)

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
  /* อนิเมชันอยู่ที่ "หลอดทั้งอัน" ไม่ใช่ทีละบล็อก
     หลอดจึงค่อย ๆ ปรากฏจากซ้ายไปขวาเป็นชิ้นเดียว ไม่ใช่บล็อกเด้งขึ้นพร้อมกันทีละช่อง
     ตอนย่อ/ขยายหน้าต่างไม่ต้องเล่นใหม่ (animate = false) */
  track.style.animation = animate ? '' : 'none';
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
    track.append(cell);
  }
}

/** คำนวณว่าควรแบ่งกี่บล็อก บล็อกละกี่หน่วย จากความกว้างจริงบนหน้าจอ */
function planBlocks(items, max) {
  const narrowest = Math.min(...items.map(it => it.track.getBoundingClientRect().width));
  if (!(narrowest > 0)) return null;

  // เริ่มจาก 1 ช่อง = 1 หน่วย แล้วรวบเพิ่มทีละขั้นจนช่องกว้างพอ หรือจนเหลือ 3 ช่อง
  let per = Math.max(1, Math.ceil(Math.round(max) / MAX_BLOCKS));
  let n = Math.ceil(max / per);
  while (n > MIN_BLOCKS && narrowest / n < MIN_BLOCK_PX) {
    per += 1;
    n = Math.ceil(max / per);
  }
  if (n < MIN_BLOCKS) { n = MIN_BLOCKS; per = max / MIN_BLOCKS; }
  if (narrowest / n < HARD_MIN_PX) return null;   // แคบเกินไปจริง ๆ ใช้หลอดต่อเนื่องแทน
  // ช่องไฟระหว่างช่อง — ช่องยาวขึ้นแล้วก็ควรเว้นห่างขึ้นตาม ไม่งั้นดูเป็นแท่งเดียวติดกัน
  return { per, n, gap: narrowest / n < 40 ? 4 : 6 };
}

/* ป้ายบอกสเกลใต้กลุ่มหลอด — ต้องเห็นได้โดยไม่ต้องเอาเมาส์ไปชี้
   เพราะตอนนำเสนอบนจอโปรเจกเตอร์หรือบนมือถือไม่มี hover ให้ใช้
   ถ้าไม่มีบรรทัดนี้ คนดูจะไม่มีทางรู้ว่า "หลอดเต็ม" แปลว่าเท่าไร */
const SCALE_ANCHOR = '.versus, .subgroup, .rank, .cmp, .vd-bars, .fig-vs, .grid';

function scaleNote(group, plan, max, unitName) {
  const first = group.items[0];
  if (!first || !first.track.isConnected) return;
  const anchor = first.track.closest(SCALE_ANCHOR);
  if (!anchor) return;

  if (!group.note || !group.note.isConnected) {
    group.note = el('p', 'scale-note');
    anchor.after(group.note);
  }
  const u = unitName ? ' ' + unitName : '';
  group.note.textContent = plan
    ? `หลอดเต็ม = ${fmtNum(plan.n * plan.per)}${u} · 1 ช่อง = ${fmtNum(plan.per)}${u}`
    : `หลอดเต็ม = ${fmtNum(max)}${u}`;
}

const fmtNum = n => (Math.round(n * 10) / 10).toLocaleString('th-TH');

function paintGroup(group, animate) {
  const { items, max, unitName } = group;
  const plan = planBlocks(items, max);
  items.forEach(({ track, value, color }) => {
    if (plan) drawBlocks(track, value, plan.per, plan.n, color, plan.gap, unitName, animate);
    else drawSolid(track, value, max, color);
  });
  scaleNote(group, plan, max, unitName);

  /* ปลายหลอดต้องมนเสมอ
     ถ้าเศษบางกว่าความสูงหลอด CSS จะบีบรัศมีมุมลงเหลือครึ่ง "ความกว้าง"
     หัวแท่งจึงเป็นมุมมนนิดเดียว ไม่ใช่ครึ่งวงกลม — ตาเห็นเป็น "ไม่โค้ง"
     จึงกันความกว้างขั้นต่ำไว้เท่าความสูงหลอด = ได้แคปซูลเต็มใบเสมอ
     (เคยลองวาดวงกลมทับด้วย ::after แต่ตำแหน่งของกล่องเพี้ยน เห็นเป็นรอยบิ่นที่หัวแท่ง)
     ผลข้างเคียง: ค่าที่เล็กมากจะดูยาวกว่าจริงเล็กน้อย แต่ตัวเลขข้างหลอดยังเป๊ะเสมอ */
  items.forEach(({ track }) => {
    const h = Math.round(track.getBoundingClientRect().height);
    if (!h) return;
    track.querySelectorAll('.seg-part').forEach(part => {
      part.style.minWidth = `min(${h}px, 100%)`;
    });
  });
}

export function segmentBars(items, max, unitName = '') {
  if (!items.length || !(max >= 3)) return;
  const group = { items, max, unitName };
  barGroups.push(group);

  /* วาดทันทีถ้าวัดความกว้างได้แล้ว ไม่งั้นรอเฟรมถัดไป
     และมี setTimeout สำรองไว้ด้วย เพราะแท็บที่ถูกซ่อน/ยังไม่แสดงผล
     requestAnimationFrame จะไม่ทำงานเลย หลอดจะค้างเป็นแบบไม่แบ่งช่อง */
  const paint = () => paintGroup(group, true);
  if (items.some(it => it.track.getBoundingClientRect().width > 0)) paint();
  else { requestAnimationFrame(paint); setTimeout(paint, 150); }
}

/* กลับมาดูแท็บอีกครั้ง: วาดใหม่ให้ทุกกลุ่มที่ยังอยู่บนหน้า
   (ถ้าตอนวาดครั้งแรกแท็บถูกซ่อนอยู่ ความกว้างจะเป็น 0 จนแบ่งช่องไม่ได้) */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  barGroups.forEach(g => { if (g.items.some(it => it.track.isConnected)) paintGroup(g, false); });
});

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
