/* หน้า 1 — สรุปผล: คำตอบของคำถามวิจัย + สาเหตุหลัก */

import { Q, COL, C } from './columns.js?v=122';

export default {
  id: "summary",
  icon: "target",
  label: "สรุปผล",
  navHint: "คำตอบของงานวิจัย",
  crumb: "หน้าหลัก",
  title: "สรุปผล",
  answers: "ข้อมูลที่เก็บมาตอบว่าจริงหรือไม่ และสาเหตุอันดับต้น ๆ คืออะไร",
  desc: "คำตอบของคำถามวิจัย และสาเหตุหลักที่พบ",

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
      desc: "ถ้าคนส่วนใหญ่เจอข่าวโดยบังเอิญ แปลว่าแอปเป็นคนเลือกข่าวให้ ไม่ใช่ตัวเราเลือกเอง",
      charts: [
        { type: "waffle", wide: true,
          title: "ผู้ตอบเจอข่าวได้อย่างไร",
          note: "ตัวเลขข้างขวาคือจำนวนคนจริง ส่วนจุด 100 จุดคือการเทียบให้เห็นเป็นสัดส่วน",
          x: Q.howFound, agg: "count", sort: "value", colors: C.scale,
          hint: "นับจุดเอาได้เลย ไม่ต้องอ่านตัวเลข" }
      ] },

    { type: "causes",
      title: "สาเหตุหลักที่คนไม่ดูข่าวโลก",
      desc: "เรียงจากคำตอบจริงในแบบสอบถาม พร้อมทางแก้ที่ทำได้",
      top: 4 },

    { type: "pull",
      title: "สิ่งที่ดึงคนไปหาข่าวดราม่า",
      desc: "สิ่งที่ข่าวดราม่ามี แต่ข่าวโลกมักไม่มี",
      top: 3,
      note: "อยากให้คนดูข่าวโลก ต้องหยิบอย่างน้อยหนึ่งข้อจากนี้ไปใช้" }
  ]
};
