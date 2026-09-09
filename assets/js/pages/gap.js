/* หน้า 2 — ช่องว่างการรับรู้: เทียบข่าวสองชุดที่ผู้ตอบรู้จักจริง */

import { Q, COL, C } from './columns.js?v=147';

export default {
  id: "gap",
  icon: "balance",
  label: "ช่องว่างการรับรู้",
  navHint: "ข่าวโลก vs ดราม่า",
  title: "ช่องว่างการรับรู้",
  answers: "คนรู้จักข่าวสองฝั่งต่างกันแค่ไหน และข่าวชิ้นไหนที่คนจำได้จริง",
  desc: "เทียบว่าคนรู้จักข่าวสองชุดต่างกันแค่ไหน และต่างกันในกลุ่มไหน",

  summary: [
    { label: "ข่าวโลกที่รู้จักเฉลี่ย", tone: "world", column: COL.countA, agg: "avg", unit: "ข่าว", sub: "ต่อคน จาก 10 ข่าว" },
    { label: "ข่าวดราม่าที่รู้จักเฉลี่ย", tone: "accent", column: COL.countB, agg: "avg", unit: "ข่าว", sub: "ต่อคน จาก 10 ข่าว" },
    { label: "คนที่รู้จักข่าวโลกมากสุด", column: COL.countA, agg: "max", unit: "ข่าว", sub: "ของผู้ตอบคนเดียว" },
    { label: "คนที่รู้จักข่าวดราม่ามากสุด", column: COL.countB, agg: "max", unit: "ข่าว", sub: "ของผู้ตอบคนเดียว" }
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
          hint: "แท่งยาวกว่า = คนรู้จักข่าวชุดนั้นมากกว่า สองแท่งวัดด้วยไม้บรรทัดอันเดียวกัน เทียบกันได้ตรง ๆ",
          ys: [
            { column: COL.countA, label: "ข่าวโลก",   color: C.world },
            { column: COL.countB, label: "ข่าวดราม่า", color: C.drama }
          ] }
      ] },

    { type: "charts",
      title: "คนกระจุกอยู่ตรงไหน",
      desc: "ค่าเฉลี่ยบอกจุดกึ่งกลาง แต่ไม่บอกว่าคนส่วนใหญ่อยู่ตรงไหน",
      charts: [
        { type: "grouped", wide: true,
          title: "คนส่วนใหญ่รู้จักกี่ข่าว",
          note: "แบ่งเป็น 3 ช่วง · ในแต่ละช่วงเทียบสองฝั่งจากเส้นเริ่มต้นเดียวกัน",
          unit: "ข่าว",
          series: [
            { column: COL.countA, label: "ข่าวโลก",   color: C.world },
            { column: COL.countB, label: "ข่าวดราม่า", color: C.drama }
          ],
          hint: "ดูทีละช่วง แท่งไหนยาวกว่าแปลว่าฝั่งนั้นมีคนอยู่ช่วงนั้นมากกว่า" },

        { type: "split", wide: true,
          title: "ผู้ตอบแต่ละคน รู้จักฝั่งไหนมากกว่า",
          note: "แบ่งผู้ตอบทุกคนออกเป็น 3 กลุ่ม",
          columnA: COL.countA, columnB: COL.countB,
          groups: [
            { label: "รู้จักข่าวดราม่ามากกว่า", color: C.drama },
            { label: "รู้จักข่าวโลกมากกว่า",   color: C.world },
            { label: "รู้จักพอ ๆ กัน",          color: "var(--gray)" }
          ],
          hint: "ถ้ากลุ่มเดียวกินสัดส่วนเกินครึ่ง แปลว่าเป็นกันคนส่วนใหญ่ ไม่ใช่แค่บางคนที่ดึงค่าเฉลี่ย" }
      ] },

    { type: "charts",
      title: "ความหนาแน่นของคำตอบ",
      desc: "กลุ่มไหนรู้จักข่าวชุดไหนมากกว่ากัน",
      charts: [
        { type: "heatmap", wide: true,
          title: "ข่าวโลกแต่ละข่าว · แยกตามกลุ่มผู้ตอบ",
          note: "ตัวเลขคือสัดส่วนคนในกลุ่มนั้นที่รู้จักข่าวชิ้นนั้น · ยิ่งเข้ม = ยิ่งรู้จักเยอะ",
          x: Q.newsA, group: Q.age, multi: true, top: 6,
          groupFallback: [Q.gender, Q.howFound],
          singleGroupNote: "ผู้ตอบอยู่กลุ่มเดียวกันหมด ตารางนี้เลยยังไม่มีอะไรให้เทียบ — ดูอันดับข่าวด้านล่างแทนได้",
          hint: "ช่องว่างสีอ่อนคือข่าวที่กลุ่มนั้นแทบไม่รู้จักเลย" }
      ] },

    { type: "charts",
      title: "ข่าวรายชิ้น",
      desc: "ข่าวไหนที่ทะลุถึงผู้ชมจริง",
      charts: [
        { type: "rank", title: "ข่าวโลกที่รู้จักมากที่สุด", note: "เรียงจากมากไปน้อย",
          x: Q.newsA, multi: true, agg: "count", sort: "value", top: 10,
          color: C.world, accent: C.world, level: 2, showPercent: true, blockUnit: "คน" },

        { type: "rank", title: "ข่าวดราม่าที่รู้จักมากที่สุด", note: "เรียงจากมากไปน้อย",
          x: Q.newsB, multi: true, agg: "count", sort: "value", top: 10,
          color: C.drama, accent: C.drama, level: 2, showPercent: true, blockUnit: "คน" }
      ] }
  ]
};
