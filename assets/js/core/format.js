/* [core] จัดรูปแบบตัวเลข/ข้อความ — ฟังก์ชันบริสุทธิ์ ไม่ยุ่งกับ DOM */

export const fmt = n =>
  n == null ? '–' : new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(n);

export const round1 = n => (n == null ? null : Math.round(n * 10) / 10);
export const pct = (part, whole) => (whole ? Math.round(part / whole * 100) : 0);

export const clip = (t, n = 34) => {
  t = String(t);
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

/** วันที่แบบไทยสั้น ๆ ใช้กับ Timestamp ของ Google Form */
export const thaiDate = d =>
  d instanceof Date && !isNaN(d)
    ? d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
    : '–';
