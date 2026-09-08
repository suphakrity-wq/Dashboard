/* หน้า 4 — พฤติกรรมการเข้าถึง: คนเจอข่าวได้อย่างไร */

import { Q, COL, C } from './columns.js?v=10';

export default {
  id: "behavior",
  icon: "touch_app",
  label: "พฤติกรรมการเข้าถึง",
  navHint: "เจอข่าวยังไง",
  title: "พฤติกรรมการเข้าถึงข่าว",
  answers: "พฤติกรรมแบบไหน (เจอข่าวยังไง ใช้ช่องทางไหน) ที่ทำให้ช่องว่างกว้างขึ้น",
  desc: "คนเจอข่าวได้อย่างไร ใช้ช่องทางไหน และอะไรทำให้ตัดสินใจกดดู",

  summary: [
    { label: "เจอข่าวโดยบังเอิญ", tone: "accent", column: Q.howFound, agg: "share", equals: "บังเอิญ", unit: "%" },
    { label: "ตั้งใจหาข่าวเอง", column: Q.howFound, agg: "share", equals: "ตั้งใจ", unit: "%" },
    { label: "ช่องทางที่ใช้", column: Q.channel, agg: "distinct", unit: "ช่องทาง" },
    { label: "ผู้ตอบทั้งหมด", column: Q.age, agg: "count", unit: "คน" }
  ],

  blocks: [
    { type: "charts",
      title: "พฤติกรรมแบบไหน ทำให้ช่องว่างกว้างขึ้น",
      desc: "เทียบช่องว่างข่าวโลก/ข่าวดราม่า ระหว่างคนที่มีพฤติกรรมต่างกัน — ส่วนนี้คือสิ่งที่เชื่อมพฤติกรรมกลับไปตอบคำถามวิจัย",
      charts: [
        { type: "compare", wide: true, level: 1, accent: C.drama,
          title: "เจอข่าวโดยบังเอิญ vs ตั้งใจหาข่าวเอง",
          note: "ตัวเลขคือจำนวนข่าวที่รู้จักโดยเฉลี่ยของแต่ละกลุ่ม",
          by: Q.howFound, colA: COL.countA, colB: COL.countB,
          colorA: C.world, colorB: C.drama, minN: 3,
          groups: [
            { label: "บังเอิญเลื่อนเจอ", match: "บังเอิญ" },
            { label: "ตั้งใจหาข่าวเอง", match: "ตั้งใจ" },
            { label: "พอ ๆ กันทั้งสองแบบ", match: "พอ" }
          ],
          hint: "ถ้ากลุ่มบังเอิญห่างกว่า แปลว่ายิ่งปล่อยให้ฟีดเลือกให้ ยิ่งได้ข่าวโลกน้อยลง" },

        { type: "compare", wide: true,
          title: "คนใช้ TikTok vs ไม่ได้ใช้ TikTok",
          note: "แยกตามช่องทางที่ผู้ตอบเลือก",
          by: Q.channel, colA: COL.countA, colB: COL.countB,
          colorA: C.world, colorB: C.drama, minN: 3,
          groups: [
            { label: "ใช้ TikTok", match: "TikTok" },
            { label: "ใช้ Facebook", match: "Facebook" },
            { label: "ใช้ YouTube", match: "YouTube" },
            { label: "เข้าเว็บข่าวโดยตรง", match: "เว็บข่าว" }
          ],
          hint: "ช่องทางไหนที่คนใช้แล้วช่องว่างกว้างสุด คือช่องทางที่ข่าวโลกเข้าไม่ถึง" }
      ] },

    { type: "charts",
      title: "ภาพรวมช่องทางและการค้นพบข่าว",
      charts: [
        { type: "donut", title: "เจอข่าวได้อย่างไร", note: "ตั้งใจหา หรือเลื่อนเจอเอง",
          x: Q.howFound, agg: "count", sort: "value", unit: "คน", colors: C.scale,
          hint: "ถ้า “บังเอิญเลื่อนเจอ” สูง แปลว่าอัลกอริทึมเป็นคนเลือกข่าวให้ ไม่ใช่ตัวผู้ใช้เอง" },

        { type: "stacked", title: "ข่าวประเภทไหนดึงดูดใจมากกว่า", note: "สัดส่วนคำตอบทั้งหมด",
          x: Q.appeal, agg: "count", sort: "value", colors: C.scale }
      ] },

    { type: "charts",
      title: "ช่องทางและตัวตัดสินใจ",
      charts: [
        { type: "bubbles", wide: true, title: "ช่องทางรับข่าวหลัก", note: "ขนาดวงกลม = จำนวนคนที่ใช้",
          x: Q.channel, multi: true, agg: "count", sort: "value", top: 7,
          hint: "วงใหญ่สุดคือช่องทางที่ต้องไปวางข่าวโลกไว้" },

        { type: "chips", wide: true, title: "อะไรทำให้ตัดสินใจกดดูข่าว", note: "เลือกได้ไม่เกิน 3 ข้อ",
          x: Q.decide, multi: true, sort: "value", top: 10 },

        { type: "chips", wide: true, title: "ประเภทข่าวที่มักหยุดดู", note: "เลือกได้หลายข้อ",
          x: Q.types, multi: true, sort: "value", top: 12 }
      ] }
  ]
};
