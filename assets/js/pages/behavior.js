/* หน้า 4 — พฤติกรรมการเข้าถึง: คนเจอข่าวได้อย่างไร */

import { Q, COL, C } from './columns.js?v=147';

export default {
  id: "behavior",
  icon: "touch_app",
  label: "พฤติกรรมการเข้าถึง",
  navHint: "เจอข่าวยังไง",
  title: "พฤติกรรมการเข้าถึงข่าว",
  answers: "คนเจอข่าวยังไง ใช้แอปไหน และพฤติกรรมแบบไหนที่ทำให้ห่างจากข่าวโลกมากขึ้น",
  desc: "คนเจอข่าวได้อย่างไร ใช้ช่องทางไหน และอะไรทำให้ตัดสินใจกดดู",

  summary: [
    { label: "เจอข่าวโดยบังเอิญ", tone: "accent", column: Q.howFound, agg: "share", equals: "บังเอิญ", unit: "%", sub: "เลื่อนเจอเอง ไม่ได้ตั้งใจหา" },
    { label: "ตั้งใจหาข่าวเอง", column: Q.howFound, agg: "share", equals: "ตั้งใจ", unit: "%", sub: "เปิดเข้าไปหาข่าวเอง" },
    { label: "ช่องทางที่มีคนใช้", column: Q.channel, agg: "distinct", multi: true, unit: "ช่องทาง", sub: "จากตัวเลือกในฟอร์ม" },
    { label: "ผู้ตอบทั้งหมด", column: Q.age, agg: "count", unit: "คน" }
  ],

  blocks: [
    { type: "charts",
      title: "พฤติกรรมแบบไหน ทำให้ช่องว่างกว้างขึ้น",
      desc: "คนที่มีพฤติกรรมต่างกัน ห่างจากข่าวโลกไม่เท่ากัน — ยิ่งห่างยิ่งน่าห่วง",
      charts: [
        { type: "compare", wide: true, level: 1, accent: C.drama,
          title: "เจอข่าวโดยบังเอิญ vs ตั้งใจหาข่าวเอง",
          note: "ตัวเลขคือจำนวนข่าวที่รู้จักโดยเฉลี่ยของแต่ละกลุ่ม",
          by: Q.howFound, colA: COL.countA, colB: COL.countB, unit: "ข่าว/คน",
          colorA: C.world, colorB: C.drama, minN: 3,
          groups: [
            { label: "บังเอิญเลื่อนเจอ", match: "บังเอิญ" },
            { label: "ตั้งใจหาข่าวเอง", match: "ตั้งใจ" },
            { label: "พอ ๆ กันทั้งสองแบบ", match: "พอ" }
          ],
          hint: "ถ้ากลุ่มที่เจอข่าวโดยบังเอิญห่างกว่า แปลว่ายิ่งปล่อยให้แอปเลือกข่าวให้ ยิ่งได้ข่าวโลกน้อยลง" },

        { type: "compare", wide: true,
          title: "คนใช้ TikTok vs ไม่ได้ใช้ TikTok",
          note: "แยกตามช่องทางที่ผู้ตอบเลือก",
          by: Q.channel, colA: COL.countA, colB: COL.countB, unit: "ข่าว/คน",
          colorA: C.world, colorB: C.drama, minN: 3,
          groups: [
            { label: "ใช้ TikTok", match: "TikTok" },
            { label: "ใช้ Facebook", match: "Facebook" },
            { label: "ใช้ YouTube", match: "YouTube" },
            { label: "เข้าเว็บข่าวโดยตรง", match: "เว็บข่าว" }
          ],
          hint: "แอปไหนที่คนใช้แล้วห่างจากข่าวโลกมากสุด คือแอปที่ข่าวโลกยังเข้าไม่ถึง" }
      ] },

    { type: "charts",
      title: "ภาพรวมช่องทางและการค้นพบข่าว",
      charts: [
        { type: "donut", title: "เจอข่าวได้อย่างไร", note: "ตั้งใจหา หรือเลื่อนเจอเอง",
          x: Q.howFound, agg: "count", sort: "value", unit: "คน", colors: C.ramp,
          hint: "ถ้า “บังเอิญเลื่อนเจอ” สูง แปลว่าแอปเป็นคนเลือกข่าวให้ ไม่ใช่เราเลือกเอง" },

        { type: "stacked", title: "ข่าวประเภทไหนดึงดูดใจมากกว่า", note: "แบ่งจากคำตอบทั้งหมด 100%",
          x: Q.appeal, agg: "count", sort: "value", colors: C.ramp,
          hint: "แถบยาวสุดคือคำตอบที่คนเลือกมากที่สุด · รวมกันทั้งแถบเท่ากับผู้ตอบทั้งหมด" }
      ] },

    { type: "charts",
      title: "ช่องทางและตัวตัดสินใจ",
      charts: [
        /* เดิมเป็นวงกลมขนาดตามค่า แต่คนเทียบ "ขนาดวงกลม" ด้วยตาได้ไม่แม่น
           เปลี่ยนเป็นหลอดเรียงอันดับ ซึ่งเทียบความยาวได้ตรง ๆ และอ่านค่าได้ทันที */
        { type: "rank", wide: true, title: "ช่องทางรับข่าวหลัก",
          note: "นับจากคนที่เลือกช่องทางนั้น (เลือกได้หลายช่องทาง)",
          x: Q.channel, multi: true, agg: "count", sort: "value", top: 7,
          showPercent: true, valueUnit: "คน", blockUnit: "คน", color: C.drama,
          hint: "หลอดยาวสุด = คนอยู่ตรงนั้นเยอะที่สุด ควรเอาข่าวโลกไปวางตรงนั้น" },

        { type: "chips", wide: true, title: "อะไรทำให้ตัดสินใจกดดูข่าว", note: "เลือกได้ไม่เกิน 3 ข้อ",
          x: Q.decide, multi: true, sort: "value", top: 10 },

        { type: "chips", wide: true, title: "ประเภทข่าวที่มักหยุดดู", note: "เลือกได้หลายข้อ",
          x: Q.types, multi: true, sort: "value", top: 12 }
      ] }
  ]
};
