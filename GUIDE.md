# คู่มือแก้ไข Dashboard

เขียนไว้ให้คนที่ไม่ได้สร้างระบบนี้ก็แก้ต่อได้ ทุกหัวข้อคือ "อยากทำอะไร → แก้ไฟล์ไหน → ตัวอย่างโค้ด"

---

## 0. หลักการที่ต้องรู้ก่อนแก้

```
config.js          ตั้งค่าแหล่งข้อมูล (แก้บ่อยสุด)
assets/js/
  core/            ระบบคำนวณ — ห้ามมี DOM ในโฟลเดอร์นี้
  ui/              หน้าตา — ห้ามมีสูตรคำนวณในโฟลเดอร์นี้
  pages/           เนื้อหาแต่ละหน้า (แค่ตั้งค่า ไม่ต้องเขียนตรรกะ)
assets/css/parts/  สไตล์ แยกตามหน้าที่
test-data/         ข้อมูลจำลองสำหรับทดสอบ
```

**กฎเหล็ก 3 ข้อ**
1. `core/` ห้าม `import` อะไรจาก `ui/`
2. เพิ่มอะไรก็ตาม ให้ลงทะเบียนในที่เดียว (`CHARTS` / `BLOCKS` / `PAGES`)
3. ห้ามเขียน `:hover` แยกรายคอมโพเนนต์ — ต่อ selector ในลิสต์กลางท้าย `4-components.css`

---

## 1. เปลี่ยนชีตข้อมูล

`config.js`
```js
sheetId: "รหัสชีตใหม่",   // เอาจาก URL: /spreadsheets/d/⟨รหัสนี้⟩/edit
// gid: "0",             // ใส่เมื่อต้องการแท็บอื่น (เลขท้าย URL)
```
ชีตต้องเปิดสิทธิ์ `Anyone with the link → Viewer` ก่อน

---

## 2. หัวคอลัมน์ในชีตเปลี่ยน

`assets/js/pages/columns.js` → แก้ที่ `Q`
```js
export const Q = {
  gender: "เพศ",           // ← คัดลอกจากหัวคอลัมน์ในชีตให้ตรงทุกตัวอักษร
  age:    "อายุ",
  ...
};
```
> ระวังช่องว่างท้ายข้อความ — ระบบ `trim()` ให้แล้ว แต่ตัวอักษรต้องตรง

---

## 3. เพิ่มหน้าใหม่

1. สร้าง `assets/js/pages/myPage.js`
```js
import { Q, COL, C } from './columns.js';

export default {
  id: "mypage",                    // ใช้ใน URL: #/mypage
  icon: "insights",                // ชื่อจาก fonts.google.com/icons
  label: "ชื่อในเมนู",
  navHint: "คำอธิบายใต้เมนู",
  title: "หัวเรื่องของหน้า",
  answers: "หน้านี้ตอบว่าอะไร",     // แสดงเป็นกล่องม่วงใต้หัวเรื่อง
  desc: "คำอธิบายสั้น",

  summary: [                        // แถบตัวเลขด้านบน (สูงสุด 4 ค่ากำลังดี)
    { label: "ผู้ตอบ", column: Q.age, agg: "count", unit: "คน" }
  ],

  blocks: [                         // เนื้อหา เรียงจากบนลงล่าง
    { type: "charts", title: "หัวข้อส่วน", charts: [ /* … */ ] }
  ]
};
```
2. ลงทะเบียนใน `assets/js/pages/index.js`
```js
import myPage from './myPage.js';
export const PAGES = [summary, gap, reasons, behavior, myPage, conclusion, data];
```
ลำดับในอาร์เรย์ = ลำดับในเมนูซ้าย

---

## 4. เพิ่มกราฟในหน้า

ใส่ใน `blocks` → `{ type: "charts", charts: [ … ] }`

| อยากได้ | ใช้ `type` | ตัวอย่างค่าที่ต้องใส่ |
|---|---|---|
| อันดับ + หลอด | `rank` | `x`, `multi`, `top`, `color`, `showPercent` |
| เทียบสองฝั่งข้อต่อข้อ | `paired` | `columnA`, `columnB`, `labelA`, `labelB`, `colorA`, `colorB` |
| เทียบช่องว่างระหว่างกลุ่ม | `compare` | `by`, `colA`, `colB`, `groups:[{label,match}]` |
| ป้ายขนาดตามจำนวน | `chips` | `x`, `multi`, `top` |
| 100 จุด = 100% | `waffle` | `x`, `colors` |
| ตาราง 2 มิติ | `heatmap` | `x`, `group`, `groupFallback` |
| วงกลมขนาดตามค่า | `bubbles` | `x`, `multi`, `top` |
| สัดส่วนรวม | `donut` / `stacked` | `x`, `colors` |
| สองฝั่ง + ส่วนต่าง | `gap` | `ys:[{column,label,color}×2]` |

ค่าที่ใส่ได้กับทุกกราฟ: `title` `note` `hint` `wide`(เต็มความกว้าง) `level`(1–3 ความเด่น) `accent`(สีการ์ด)

---

## 5. เพิ่มรูปแบบกราฟใหม่ (ที่ยังไม่มี)

`assets/js/ui/charts.js`
```js
export function myChart(host, cf, rows) {
  const { labels, values } = groupBy(rows, cf);   // ดึงข้อมูลผ่าน core เท่านั้น
  const box = el('div', 'my-chart');
  // …สร้าง element ใส่ box…
  host.append(box);
}
Object.assign(CHARTS, { …, myChart });            // ลงทะเบียนท้ายไฟล์
```
แล้วเพิ่มสไตล์ใน `assets/css/parts/4-components.css`

---

## 6. เพิ่มบล็อกใหม่ (ไม่ใช่กราฟ เช่น ตาราง/ข้อความ)

`assets/js/ui/blocks.js`
```js
function myBlock(host, b, rows, cfg) {
  const sec = section(host, b);     // สร้างหัวข้อ + คำอธิบายให้อัตโนมัติ
  sec.append(/* … */);
}
export const BLOCKS = { …, myBlock };
```

---

## 7. แก้ข้อเสนอแนะ / เกณฑ์ตัดสิน

`assets/js/pages/analysis.js`
```js
minSample: 25,     // ต่ำกว่านี้ขึ้นคำเตือน
alpha: 0.05,       // ระดับนัยสำคัญของการทดสอบ
causes: [
  { match: "ไกลตัว", fix: "ข้อเสนอแนะที่จะแสดง" }   // match = คำบางส่วนในคำตอบ
]
```

## 8. แก้การจัดหมวดคำตอบปลายเปิด

`assets/js/core/textAnalysis.js` → `THEMES`
```js
{ id: 'self', kind: 'pull',            // pull = แรงดึง, barrier = อุปสรรค
  label: 'เกี่ยวกับตัวเอง',
  keywords: ['เกี่ยวกับตัวเอง','ใกล้ตัว'],
  method: 'วิธีแก้ที่จะแสดง', source: 'clt' }
```
ถ้าเจอคำไทยที่ซ้อนกัน (เช่น "อยาก" มี "ยาก" อยู่ข้างใน) ให้เพิ่มใน `MASK`

## 9. เพิ่มค่าอ้างอิงจากงานวิจัย

`assets/js/core/benchmarks.js` → เพิ่มใน `SOURCES` แล้วเพิ่มใน `BENCHMARKS` หรือ `CONTEXT_FACTS`
**ใส่เลขหน้าเสมอ** เพื่อให้ตรวจย้อนได้

---

## 10. แก้สี / ขนาดตัวอักษร / จังหวะอนิเมชัน

`assets/css/parts/1-tokens.css` — แก้ที่นี่ที่เดียว มีผลทั้งเว็บ
```css
--purple:#6d4dfb;   /* สีหลัก */
--t-md:23px;        /* ขนาดตัวอักษรฐาน */
--t-base:.32s;      /* ความเร็ว hover */
```

### หลอดวัดค่าแบบแบ่งบล็อก

หลอดจะถูกตัดเป็นสี่เหลี่ยมเรียงต่อกัน (1 บล็อก = 1 ข่าว / 1 คน) ให้นับด้วยตาได้
ตัดสินใจที่ `segmentBar()` ใน [assets/js/ui/dom.js](assets/js/ui/dom.js)

```js
// แบ่งเมื่อ: จำนวนบล็อก 3-20 และแต่ละบล็อกกว้าง >= 9px
// ไม่เข้าเงื่อนไข = ปล่อยเป็นหลอดยาวต่อเนื่องเหมือนเดิม
```

อยากให้แบ่งถี่ขึ้น/น้อยลง แก้ตัวเลขสองค่านี้ที่เดียว
ส่วนหน้าตาของบล็อก (ช่องไฟ, มุมมน) อยู่ที่คลาส `.is-seg` ใน `4-components.css`

---

## 10.5 กติกาหน้าตา (สี / ตัวอักษร / ระยะ / hover / หลอด)

อยู่ในไฟล์แยก → **[UI.md](UI.md)**
ก่อนแก้ CSS อ่านไฟล์นั้นก่อน ค่าทั้งหมดมาจาก `1-tokens.css` ที่เดียว
ห้ามใส่ค่าดิบ (px / hex) ลงในคอมโพเนนต์

### ข้อเสนอในหน้า "ข้อสรุป & ข้อเสนอ" มาจากไหน

ตัวเครื่องอยู่ที่ [assets/js/core/recommend.js](assets/js/core/recommend.js)
รวมสัญญาณ 3 ทางแล้วเรียงตาม "จำนวนคนที่ติดปัญหานั้น"

| ที่มา | แก้ข้อความ/ทางแก้ได้ที่ |
|---|---|
| คำตอบแบบเลือกตอบ | `causes` ใน [pages/analysis.js](assets/js/pages/analysis.js) |
| คำตอบปลายเปิด | `THEMES` ใน [core/textAnalysis.js](assets/js/core/textAnalysis.js) |
| พฤติกรรมการเจอข่าว | `FEED_ACTION` ใน `recommend.js` |

ทุกข้อต้องมีครบ 3 อย่าง: **fix** (ทำอะไร) · **source** (คีย์ใน `SOURCES`) ·
**effect** (งานวิจัยพบอะไร) ถ้าเพิ่มข้อใหม่แล้วไม่ใส่ `source`/`effect`
ข้อนั้นจะไม่มีบรรทัดอ้างอิงแสดง — ถือว่ายังไม่ครบ

### หน้าสไลด์นำเสนอ

หน้า "สไลด์นำเสนอ" ([pages/present.js](assets/js/pages/present.js)) ใช้บล็อก `slides`
เนื้อหาทุกสไลด์คำนวณสดจากชุดข้อมูลที่กำลังเลือกอยู่ — เปลี่ยนข้อมูลแล้วสไลด์เปลี่ยนตาม
แก้ลำดับ/หัวข้อสไลด์ที่อาร์เรย์ `deck` ในฟังก์ชัน `slides()` ของ
[ui/blocks.js](assets/js/ui/blocks.js) ที่เดียว

กดลูกศรซ้าย/ขวา ปุ่มด้านล่าง หรือจุดกลม เพื่อเลื่อนสไลด์

### สลับข้อมูลจริง / ข้อมูลทดสอบ

ช่อง "แหล่งข้อมูล" ท้ายแถบเมนูซ้าย เลือกได้ระหว่าง
**ฟอร์มจริง (Google Sheet)** กับ **ชุดทดสอบ 9 ชุด** ใน [test-data/](test-data/)
เลือกแล้วโหลดหน้าใหม่ด้วย `?demo=<id>` · ค่าว่าง = กลับไปใช้ชีตจริง
เพิ่มชุดทดสอบใหม่: วางไฟล์ CSV ใน `test-data/` แล้วเติมรายการใน `fixtures.js`

---

## 11. หลัง deploy แล้วเว็บยังเป็นของเก่า

GitHub Pages แคชไฟล์ CSS/JS ไว้ **10 นาที** ถ้าอยากให้ผู้ใช้เห็นของใหม่ทันที
ให้บวกเลข `?v=` ทีละ 1 **ทุกที่พร้อมกัน** ด้วยคำสั่งเดียว (แทนเลขใหม่ตรง `N`)

```bash
sed -i '' -E 's/\?v=[0-9]+/?v=N/g' index.html assets/css/style.css $(find assets/js test-data -name '*.js')
```

ที่ต้องบวกพร้อมกันทั้งหมดเพราะโมดูล JS อ้างถึงกันเองด้วย URL ที่มี `?v=` อยู่ในโค้ด

```js
import { renderNav } from './ui/shell.js?v=3';
```

ถ้าบวกเฉพาะ `app.js` แต่ไฟล์ลูกยังเป็นเลขเก่า เบราว์เซอร์จะหยิบไฟล์ลูกจากแคชมาใช้คู่กับ
`app.js` ตัวใหม่ แล้วพังทั้งหน้า (เจอมาแล้ว: `does not provide an export named ...`)

ถ้าแค่อยากเช็คเองว่าของใหม่ขึ้นหรือยัง: กด **Cmd + Shift + R** (hard refresh)

---

## 12. ทดสอบก่อน commit

```bash
python3 -m http.server 8000
```
เปิดทุกชุดข้อมูลจำลอง แล้วดูว่าไม่มีหน้าไหนพัง:
```
/?demo=realistic   ใกล้ของจริง 25 คน
/?demo=empty       ยังไม่มีคำตอบ
/?demo=tiny        3 คน
/?demo=messy       ข้อมูลรก
/?demo=single      กลุ่มเดียวล้วน
```
เช็ก syntax ทุกไฟล์:
```bash
for f in $(find assets/js -name '*.js' ! -name app.js); do node --input-type=module -e "import('./$f')" || echo "FAIL $f"; done
```
