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
