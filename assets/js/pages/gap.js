/* หน้า 2 — ช่องว่างการรับรู้: เทียบข่าวสองชุดที่ผู้ตอบรู้จักจริง */

import { Q, COL, C } from './columns.js?v=37';

export default {
  id: "gap",
  icon: "balance",
  label: "ช่องว่างการรับรู้",
  navHint: "ข่าวโลก vs ดราม่า",
  title: "ช่องว่างการรับรู้",
  answers: "ผู้ตอบรู้จักข่าวสองฝั่งต่างกันแค่ไหน และข่าวชิ้นไหนบ้างที่ทะลุถึงคนจริง",
  desc: "เปรียบเทียบว่าผู้ตอบรู้จักข่าวสองชุดต่างกันแค่ไหน และต่างกันในกลุ่มไหน",

  summary: [
    { label: "ข่าวโลก", tone: "world", column: COL.countA, agg: "avg", unit: "ข่าว" },
    { label: "ข่าวดราม่า", tone: "accent", column: COL.countB, agg: "avg", unit: "ข่าว" },
    { label: "รู้จักข่าวโลกสูงสุด", column: COL.countA, agg: "max", unit: "ข่าว" },
    { label: "รู้จักข่าวดราม่าสูงสุด", column: COL.countB, agg: "max", unit: "ข่าว" }
  ],

  blocks: [
    { type: "charts",
      charts: [
        { type: "gap", wide: true, level: 1, accent: C.drama,
          title: "ข่าวโลก vs ข่าวดราม่า",
          note: "จากข่าวฝั่งละ 10 ข่าวที่ยกมาให้เลือก · นับเฉลี่ยต่อคน",
          x: Q.age, sort: "label", agg: "avg", unit: "ข่าว/คน",
          groupLabel: "แยกตามกลุ่ม",
          // ถ้าผู้ตอบอยู่ช่วงอายุเดียวกันหมด ให้สลับไปดูตามเพศ แล้วค่อยเป็นช่องทางที่ใช้
          groupFallback: [Q.gender, Q.howFound],
          singleGroupNote: "ผู้ตอบทั้งหมดอยู่กลุ่มเดียวกัน จึงยังไม่มีการแยกกลุ่มให้เทียบ — ดูภาพรวมด้านบนได้เลย",
          hint: "แท่งยาวกว่า = คนรู้จักข่าวชุดนั้นมากกว่า ทั้งสองแท่งใช้สเกลเดียวกัน",
          ys: [
            { column: COL.countA, label: "ข่าวโลก",   color: C.world },
            { column: COL.countB, label: "ข่าวดราม่า", color: C.drama }
          ] }
      ] },

    { type: "charts",
      title: "ความหนาแน่นของคำตอบ",
      desc: "กลุ่มไหนรู้จักข่าวชุดไหนมากกว่ากัน",
      charts: [
        { type: "heatmap", wide: true,
          title: "ข่าวโลกแต่ละข่าว · แยกตามกลุ่มผู้ตอบ",
          note: "ยิ่งเข้ม = ยิ่งมีคนในกลุ่มนั้นรู้จัก",
          x: Q.newsA, group: Q.age, multi: true, top: 6,
          groupFallback: [Q.gender, Q.howFound],
          singleGroupNote: "ผู้ตอบอยู่กลุ่มเดียวกันทั้งหมด ตารางไขว้จึงยังไม่มีประโยชน์ — ดูอันดับข่าวด้านล่างแทน",
          hint: "ช่องว่างสีอ่อนคือข่าวที่กลุ่มนั้นแทบไม่รู้จักเลย" }
      ] },

    { type: "charts",
      title: "ข่าวรายชิ้น",
      desc: "ข่าวไหนที่ทะลุถึงผู้ชมจริง",
      charts: [
        { type: "rank", title: "ข่าวโลกที่รู้จักมากที่สุด", note: "เรียงจากมากไปน้อย",
          x: Q.newsA, multi: true, agg: "count", sort: "value", top: 10,
          color: C.world, accent: C.world, level: 2, showPercent: true },

        { type: "rank", title: "ข่าวดราม่าที่รู้จักมากที่สุด", note: "เรียงจากมากไปน้อย",
          x: Q.newsB, multi: true, agg: "count", sort: "value", top: 10,
          color: C.drama, accent: C.drama, level: 2, showPercent: true }
      ] }
  ]
};
