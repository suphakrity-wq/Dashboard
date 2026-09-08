/* [core] สถิติพื้นฐานสำหรับสรุปผล — ฟังก์ชันบริสุทธิ์ ตรวจสอบได้
   ออกแบบตามลักษณะข้อมูล: ผู้ตอบ 1 คนให้ค่า 2 ค่า (ข่าวโลก / ข่าวดราม่า)
   จึงเป็นข้อมูล "จับคู่" (paired) ต้องใช้การทดสอบแบบจับคู่ ไม่ใช่เทียบสองกลุ่มอิสระ */

/* ---------- สถิติเชิงพรรณนา ---------- */
export const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export function sd(a) {                     // ส่วนเบี่ยงเบนมาตรฐานแบบกลุ่มตัวอย่าง (n-1)
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}

export function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
}

/* ---------- ฟังก์ชันคณิตศาสตร์ที่ใช้หาค่า p ---------- */

/** ln ของฟังก์ชันแกมมา (Lanczos approximation) */
function lnGamma(z) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += g[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/** เศษส่วนต่อเนื่องของ incomplete beta (อัลกอริทึม Lentz) */
function betacf(a, b, x) {
  const MAXIT = 200, EPS = 3e-12, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** regularized incomplete beta I_x(a,b) */
function betaInc(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? bt * betacf(a, b, x) / a
    : 1 - bt * betacf(b, a, 1 - x) / b;
}

/** ค่า p สองทางของการแจกแจง t */
export function tTestPValue(t, df) {
  if (!isFinite(t) || df <= 0) return null;
  return betaInc(df / 2, 0.5, df / (df + t * t));
}

/** ค่าวิกฤต t สองทางที่ระดับความเชื่อมั่น conf (หาโดยการแบ่งครึ่ง) */
export function tCritical(df, conf = 0.95) {
  const target = 1 - conf;
  let lo = 0, hi = 100;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    (tTestPValue(mid, df) > target) ? lo = mid : hi = mid;
  }
  return (lo + hi) / 2;
}

/** ฟังก์ชันการแจกแจงสะสมของ z (normal CDF) */
export function normalCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 +
            t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/* ---------- การทดสอบแบบจับคู่ ---------- */

/**
 * Paired t-test: ทดสอบว่าค่าเฉลี่ยของผลต่าง (B − A) ต่างจาก 0 หรือไม่
 * คืน: ผลต่างเฉลี่ย, ช่วงความเชื่อมั่น 95%, ค่า t, df, p, ขนาดอิทธิพล (Cohen's dz)
 */
export function pairedTTest(diffs, conf = 0.95) {
  const n = diffs.length;
  if (n < 2) return null;
  const m = mean(diffs), s = sd(diffs);
  if (s === 0) {
    return { n, meanDiff: m, sd: 0, t: null, df: n - 1, p: m === 0 ? 1 : 0,
             ci: [m, m], dz: null, note: 'ทุกคนต่างกันเท่ากันหมด' };
  }
  const se = s / Math.sqrt(n);
  const t = m / se;
  const df = n - 1;
  const p = tTestPValue(t, df);
  const tc = tCritical(df, conf);
  return {
    n, meanDiff: m, sd: s, se, t, df, p,
    ci: [m - tc * se, m + tc * se],
    dz: m / s                      // Cohen's dz สำหรับข้อมูลจับคู่
  };
}

/**
 * Wilcoxon signed-rank: ทางเลือกที่ไม่ต้องสมมติว่าข้อมูลแจกแจงปกติ
 * เหมาะกับกลุ่มตัวอย่างเล็กและข้อมูลนับ (ใช้การประมาณแบบ normal พร้อมแก้ค่าเสมอ)
 */
export function wilcoxonSignedRank(diffs) {
  const nz = diffs.filter(d => d !== 0);
  const n = nz.length;
  if (n < 6) return { n, p: null, note: 'ตัวอย่างน้อยเกินกว่าจะประมาณค่า p ได้อย่างน่าเชื่อถือ' };

  const sorted = nz.map(d => ({ abs: Math.abs(d), sign: Math.sign(d) }))
                   .sort((a, b) => a.abs - b.abs);
  // ให้อันดับ พร้อมเฉลี่ยอันดับของค่าที่เท่ากัน
  let i = 0; const ranks = new Array(n);
  const tieGroups = [];
  while (i < n) {
    let j = i;
    while (j + 1 < n && sorted[j + 1].abs === sorted[i].abs) j++;
    const avg = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[k] = avg;
    if (j > i) tieGroups.push(j - i + 1);
    i = j + 1;
  }
  const wPlus = sorted.reduce((s, d, k) => s + (d.sign > 0 ? ranks[k] : 0), 0);
  const muW = n * (n + 1) / 4;
  const tieCorr = tieGroups.reduce((s, t) => s + (t ** 3 - t), 0) / 48;
  const sigma = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24 - tieCorr);
  const z = (wPlus - muW - Math.sign(wPlus - muW) * 0.5) / sigma;   // แก้ค่าต่อเนื่อง
  return { n, w: wPlus, z, p: 2 * (1 - normalCdf(Math.abs(z))), rankBiserial: (wPlus - (n * (n + 1) / 2 - wPlus)) / (n * (n + 1) / 2) };
}

/* ---------- สัดส่วน ---------- */

/** ช่วงความเชื่อมั่นของสัดส่วนแบบ Wilson — แม่นกว่าสูตรปกติเมื่อ n น้อย */
export function wilsonInterval(k, n, conf = 0.95) {
  if (!n) return null;
  const z = conf === 0.95 ? 1.959964 : Math.abs(tCritical(1e6, conf));
  const p = k / n, z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / denom;
  return { p: p * 100, lo: Math.max(0, (center - half) * 100), hi: Math.min(100, (center + half) * 100) };
}

/* ---------- เทียบสองกลุ่มอิสระ (ใช้กับบล็อกเทียบกลุ่ม) ---------- */

/** Welch's t-test — ไม่บังคับว่าความแปรปรวนสองกลุ่มต้องเท่ากัน */
export function welchTTest(a, b) {
  if (a.length < 2 || b.length < 2) return null;
  const ma = mean(a), mb = mean(b), va = sd(a) ** 2, vb = sd(b) ** 2;
  const se = Math.sqrt(va / a.length + vb / b.length);
  if (!se) return null;
  const t = (mb - ma) / se;
  const df = (va / a.length + vb / b.length) ** 2 /
             ((va / a.length) ** 2 / (a.length - 1) + (vb / b.length) ** 2 / (b.length - 1));
  return { t, df, p: tTestPValue(t, df), diff: mb - ma, nA: a.length, nB: b.length };
}

/* ---------- ขนาดตัวอย่างที่ควรมี ---------- */

/** จำนวนคนที่ต้องเก็บ เพื่อให้ตรวจพบอิทธิพลขนาด dz ที่อำนาจ 80% (α = .05 สองทาง) */
export function requiredN(dz, power = 0.8) {
  if (!dz) return null;
  const zA = 1.959964, zB = power === 0.8 ? 0.8416 : 1.2816;
  return Math.ceil(((zA + zB) / Math.abs(dz)) ** 2) + 1;
}

/** แปลงขนาดอิทธิพลเป็นคำพูด (เกณฑ์ของ Cohen) */
export const effectSizeLabel = d => {
  const a = Math.abs(d ?? 0);
  return a < 0.2 ? 'เล็กมาก' : a < 0.5 ? 'เล็ก' : a < 0.8 ? 'ปานกลาง' : 'ใหญ่';
};
