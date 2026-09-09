/* หน้า 3 — เหตุผลเบื้องหลัง: อะไรทำให้กดดู และอะไรทำให้เลื่อนผ่าน */

import { Q, C } from './columns.js?v=120';

export default {
  id: "reasons",
  icon: "psychology",
  label: "เหตุผลเบื้องหลัง",
  navHint: "ทำไมเลือก / ไม่เลือก",
  title: "เหตุผลเบื้องหลัง",
  answers: "อะไรทำให้คนกดดู และอะไรทำให้เลื่อนผ่าน ทั้งฝั่งข่าวโลกและข่าวดราม่า",
  desc: "คำตอบที่บอกว่าอะไรทำให้กดดู และอะไรทำให้เลื่อนผ่าน",

  summary: [
    { label: "ระบุเหตุผลที่ไม่ดูข่าวโลก", column: Q.whyNotA, agg: "filled", unit: "%" },
    { label: "ผู้ตอบทั้งหมด", column: Q.age, agg: "count", unit: "คน" },
    { label: "บอกว่าดราม่าดึงดูดกว่า", tone: "accent", column: Q.appeal, agg: "share", equals: "ดราม่า", unit: "%" },
    { label: "สนใจสองแบบพอกัน", column: Q.appeal, agg: "share", equals: "ใกล้เคียง", unit: "%" }
  ],

  blocks: [
    { type: "charts",
      title: "เหตุผลที่ทำให้ “กดดู”",
      desc: "เหตุผลข้อเดียวกัน ฝั่งไหนคนเลือกมากกว่า เรียงจากข้อที่ต่างกันมากสุด",
      charts: [
        { type: "paired", wide: true, level: 1, accent: C.drama,
          title: "ทำไมถึงกดดู: ข่าวโลก vs ข่าวดราม่า",
          note: "เรียงจากข้อที่สองฝั่งต่างกันมากที่สุด",
          columnA: Q.whyA, columnB: Q.whyB,
          labelA: "ข่าวโลก", labelB: "ข่าวดราม่า",
          colorA: C.world, colorB: C.drama, top: 8, unit: "คน",
          hint: "ข้อที่ข่าวดราม่านำห่าง ๆ คือสิ่งที่ข่าวโลกยังทำไม่ได้" }
      ] },

    { type: "charts",
      title: "เหตุผลที่ทำให้ “เลื่อนผ่าน”",
      desc: "อุปสรรคของแต่ละฝั่ง เทียบกันทีละข้อ",
      charts: [
        { type: "paired", wide: true,
          title: "ทำไมถึงไม่กดดู: ข่าวโลก vs ข่าวดราม่า",
          note: "เรียงจากข้อที่สองฝั่งต่างกันมากที่สุด",
          columnA: Q.whyNotA, columnB: Q.whyNotB,
          labelA: "ข่าวโลก", labelB: "ข่าวดราม่า",
          colorA: C.world, colorB: C.drama, top: 8, unit: "คน",
          hint: "ข้อที่ข่าวโลกนำ คือปัญหาที่เกิดกับข่าวโลกโดยเฉพาะ ต้องแก้ก่อน" }
      ] },

    { type: "causes",
      title: "สรุปสาเหตุ + ทางแก้",
      desc: "จับคู่เหตุผลที่พบบ่อยกับแนวทางแก้",
      top: 6 }
  ]
};
