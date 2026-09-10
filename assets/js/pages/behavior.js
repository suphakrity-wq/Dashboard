/* หน้า 4 ทางเลือกของผู้ตอบ: ช่องทางและวิธีที่ผู้ตอบเลือกใช้ในการเข้าถึงข่าว
   ต่อจากหน้าเหตุผล เพื่อดูว่าเหตุผลเหล่านั้นนำไปสู่การเลือกทำสิ่งใด */

import { Q, COL, C } from './columns.js?v=159';

export default {
  id: "behavior",
  icon: "touch_app",
  label: "ทางเลือกของผู้ตอบ",
  navHint: "ช่องทางและวิธีเข้าถึงข่าว",
  title: "ทางเลือกของผู้ตอบ",
  answers: "ผู้ตอบเข้าถึงข่าวด้วยวิธีใด ใช้ช่องทางใด และทางเลือกแบบใดที่มาพร้อมกับการรู้จักข่าวโลกน้อยกว่า",
  desc: "วิธีเข้าถึงข่าว ช่องทางที่ใช้ และปัจจัยที่ผู้ตอบระบุว่าใช้ตัดสินใจเลือกดู",

  summary: [
    { label: "เจอข่าวโดยบังเอิญ", tone: "accent", column: Q.howFound, agg: "share", equals: "บังเอิญ", unit: "%", sub: "เลื่อนพบเอง ไม่ได้ตั้งใจค้นหา" },
    { label: "ตั้งใจหาข่าวเอง", column: Q.howFound, agg: "share", equals: "ตั้งใจ", unit: "%", sub: "เปิดค้นหาข่าวด้วยตนเอง" },
    { label: "ช่องทางที่มีผู้เลือกใช้", column: Q.channel, agg: "distinct", multi: true, unit: "ช่องทาง", sub: "นับเฉพาะช่องทางที่มีผู้เลือก" },
    { label: "ผู้ตอบทั้งหมด", column: Q.age, agg: "count", unit: "คน" }
  ],

  blocks: [
    { type: "charts",
      title: "ทางเลือกใดมาพร้อมกับผลต่างที่กว้างกว่า",
      desc: "แต่ละกลุ่มรู้จักข่าวโลกต่างจากข่าวดราม่าเท่าใด",
      charts: [
        { type: "compare", wide: true, level: 1, accent: C.drama,
          title: "เลื่อนพบเอง เทียบกับ ตั้งใจค้นหา",
          note: "ค่าเฉลี่ยจำนวนข่าวที่รู้จักต่อคน",
          by: Q.howFound, colA: COL.countA, colB: COL.countB, unit: "ข่าว/คน",
          colorA: C.world, colorB: C.drama, minN: 3,
          groups: [
            { label: "เลื่อนพบเอง", match: "บังเอิญ" },
            { label: "ตั้งใจค้นหาเอง", match: "ตั้งใจ" },
            { label: "ทั้งสองแบบใกล้เคียงกัน", match: "พอ" }
          ],
          hint: "กลุ่มที่ผลต่างกว้างกว่า คือกลุ่มที่เข้าถึงข่าวโลกได้น้อยกว่า" },

        { type: "compare", wide: true,
          title: "ผลต่าง จำแนกตามช่องทางที่เลือกใช้",
          note: "ผู้ตอบหนึ่งคนอยู่ได้หลายกลุ่ม",
          by: Q.channel, colA: COL.countA, colB: COL.countB, unit: "ข่าว/คน",
          colorA: C.world, colorB: C.drama, minN: 3,
          groups: [
            { label: "เลือก TikTok", match: "TikTok" },
            { label: "เลือก Facebook", match: "Facebook" },
            { label: "เลือก YouTube", match: "YouTube" },
            { label: "เลือกเว็บไซต์ข่าวโดยตรง", match: "เว็บข่าว" }
          ],
          hint: "ช่องทางที่ผลต่างกว้างที่สุด คือช่องทางที่ข่าวโลกยังเข้าไม่ถึง" }
      ] },

    { type: "charts",
      title: "สัดส่วนของคำตอบในคำถามหลัก",
      charts: [
        { type: "pie", title: "วิธีที่ผู้ตอบเข้าถึงข่าว", note: "เลือกได้คำตอบเดียว",
          x: Q.howFound, agg: "count", sort: "value", unit: "คน", colors: C.pie,
          hint: "ยิ่ง “เลื่อนพบเอง” มาก ผู้ตอบยิ่งไม่ได้เลือกข่าวที่ตนเห็นเอง" },

        { type: "pie", title: "ประเภทข่าวที่ผู้ตอบระบุว่าดึงดูดกว่า", note: "เลือกได้คำตอบเดียว",
          x: Q.appeal, agg: "count", sort: "value", colors: C.pie, }
      ] },

    { type: "charts",
      title: "ช่องทางที่ใช้และปัจจัยในการตัดสินใจ",
      charts: [
        /* เดิมเป็นวงกลมขนาดตามค่า แต่คนเทียบ "ขนาดวงกลม" ด้วยตาได้ไม่แม่น
           เปลี่ยนเป็นหลอดเรียงอันดับ ซึ่งเทียบความยาวได้ตรง ๆ และอ่านค่าได้ทันที */
        { type: "rank", wide: true, title: "ช่องทางรับข่าวที่มีผู้เลือกมากที่สุด",
          note: "เลือกได้หลายข้อ ผลรวมจึงเกินจำนวนผู้ตอบ",
          x: Q.channel, multi: true, agg: "count", sort: "value", top: 7,
          showPercent: true, valueUnit: "คน", blockUnit: "คน", color: C.drama,
          hint: "ช่องทางบนสุดคือจุดที่ควรเผยแพร่ข่าวโลกก่อน" },

        { type: "chips", wide: true, title: "ปัจจัยที่ผู้ตอบใช้ตัดสินใจเลือกดูข่าว", note: "คำถามนี้เลือกได้ไม่เกิน 3 ข้อ",
          x: Q.decide, multi: true, sort: "value", top: 10 },

        { type: "chips", wide: true, title: "ประเภทข่าวที่ผู้ตอบระบุว่าหยุดดู", note: "คำถามนี้เลือกได้หลายข้อ",
          x: Q.types, multi: true, sort: "value", top: 12 }
      ] }
  ]
};
