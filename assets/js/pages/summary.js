/* หน้า 1 — สรุปผล: คำตอบของคำถามวิจัย + สาเหตุหลัก */

import { Q, COL, C } from './columns.js?v=105';

export default {
  id: "summary",
  icon: "target",
  label: "สรุปผล",
  navHint: "คำตอบของงานวิจัย",
  crumb: "หน้าหลัก",
  title: "สรุปผล",
  answers: "คำถามวิจัยนี้ ข้อมูลที่เก็บมาสนับสนุนหรือไม่ และสาเหตุอันดับต้น ๆ คืออะไร",
  desc: "ภาพรวมคำตอบของคำถามวิจัย และสาเหตุหลักที่พบจากข้อมูล",

  summary: [
    { label: "ผู้ตอบแบบสอบถาม", column: Q.age, agg: "count", unit: "คน" },
    { label: "ข่าวโลกที่รู้จักเฉลี่ย", tone: "world", column: COL.countA, agg: "avg", unit: "ข่าว", sub: "จาก 10 ข่าว" },
    { label: "ข่าวดราม่าที่รู้จักเฉลี่ย", tone: "accent", column: COL.countB, agg: "avg", unit: "ข่าว", sub: "จาก 10 ข่าว" },
    { label: "เจอข่าวโดยบังเอิญ", tone: "accent", column: Q.howFound, agg: "share", equals: "บังเอิญ", unit: "%", sub: "ไม่ได้ตั้งใจหา" }
  ],

  blocks: [
    { type: "verdict" },

    { type: "pageDigest",
      title: "สรุปทุกหน้าในที่เดียว",
      desc: "ตัวเลขสำคัญของแต่ละหน้า กดเข้าไปดูรายละเอียดได้",
      channelColumn: Q.channel },

    { type: "charts",
      title: "คนเจอข่าวได้อย่างไร",
      desc: "ถ้าคนส่วนใหญ่เจอข่าวโดยบังเอิญ แปลว่าฟีดเป็นคนเลือกข่าวให้ ไม่ใช่ตัวผู้ใช้",
      charts: [
        { type: "waffle", wide: true,
          title: "ผู้ตอบเจอข่าวได้อย่างไร",
          note: "ตัวเลขในคำอธิบายคือจำนวนคนจริง ส่วน 100 จุดคือการเทียบเป็นสัดส่วน",
          x: Q.howFound, agg: "count", sort: "value", colors: C.scale,
          hint: "นับจุดได้ด้วยตา ไม่ต้องเทียบกับแกน" }
      ] },

    { type: "causes",
      title: "สาเหตุหลักที่คนไม่ดูข่าวโลก",
      desc: "เรียงจากคำตอบจริงในแบบสอบถาม พร้อมทางแก้ที่ทำได้",
      top: 4 },

    { type: "pull",
      title: "สิ่งที่ดึงคนไปหาข่าวดราม่า",
      desc: "องค์ประกอบที่ข่าวโลกมักไม่มี",
      top: 3,
      note: "ถ้าอยากให้คนดูข่าวโลก ต้องใส่อย่างน้อยหนึ่งอย่างจากนี้เข้าไป" }
  ]
};
