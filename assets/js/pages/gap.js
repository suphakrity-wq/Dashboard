/* หน้า 2 ผลการสำรวจ: ผลการวัดว่าผู้ตอบรู้จักข่าวสองชุดต่างกันเท่าใด
   เป็นหน้าที่ตอบคำถามหลักของงานด้วยตัวเลข ก่อนจะไปหาเหตุผลในหน้าถัดไป */

import { Q, COL, C } from './columns.js?v=159';

export default {
  id: "gap",
  icon: "balance",
  label: "ผลการสำรวจ",
  navHint: "ข่าวโลกเทียบข่าวดราม่า",
  title: "ผลการสำรวจ",
  answers: "ผู้ตอบรู้จักข่าวสองชุดต่างกันเท่าใด และข่าวชิ้นใดที่เข้าถึงผู้ตอบได้จริง",
  desc: "ผลการเปรียบเทียบจำนวนข่าวที่ผู้ตอบรู้จัก ทั้งภาพรวม จำแนกตามกลุ่ม และรายชิ้น",

  summary: [
    { label: "ข่าวโลกที่รู้จักเฉลี่ย", tone: "world", column: COL.countA, agg: "avg", unit: "ข่าว", sub: "ต่อคน จาก 10 ข่าว" },
    { label: "ข่าวดราม่าที่รู้จักเฉลี่ย", tone: "accent", column: COL.countB, agg: "avg", unit: "ข่าว", sub: "ต่อคน จาก 10 ข่าว" },
    { label: "คนที่รู้จักข่าวโลกมากสุด", column: COL.countA, agg: "max", unit: "ข่าว", sub: "ค่าสูงสุดที่พบในผู้ตอบหนึ่งคน" },
    { label: "คนที่รู้จักข่าวดราม่ามากสุด", column: COL.countB, agg: "max", unit: "ข่าว", sub: "ค่าสูงสุดที่พบในผู้ตอบหนึ่งคน" }
  ],

  blocks: [
    { type: "charts",
      charts: [
        { type: "gap", wide: true, level: 1, accent: C.drama,
          title: "จำนวนข่าวที่ผู้ตอบรู้จัก: ข่าวโลกเทียบข่าวดราม่า",
          note: "ชุดละ 10 ข่าว · ค่าเฉลี่ยต่อคน",
          x: Q.age, sort: "label", agg: "avg", unit: "ข่าว/คน",
          groupLabel: "แยกตามกลุ่ม",
          // ถ้าผู้ตอบอยู่ช่วงอายุเดียวกันหมด ให้สลับไปดูตามเพศ แล้วค่อยเป็นช่องทางที่ใช้
          groupFallback: [Q.gender, Q.howFound],
          singleGroupNote: "ผู้ตอบทั้งหมดอยู่ในกลุ่มเดียวกัน จึงยังจำแนกกลุ่มเพื่อเปรียบเทียบไม่ได้ กรุณาดูภาพรวมด้านบนประกอบ",
          hint: "สองแท่งใช้สเกลเดียวกัน เทียบความยาวได้โดยตรง",
          ys: [
            { column: COL.countA, label: "ข่าวโลก",   color: C.world },
            { column: COL.countB, label: "ข่าวดราม่า", color: C.drama }
          ] }
      ] },

    { type: "charts",
      title: "การกระจายของคำตอบ",
      desc: "ค่าเฉลี่ยบอกแค่จุดกึ่งกลาง ส่วนนี้บอกว่าคนส่วนใหญ่อยู่ช่วงใด",
      charts: [
        { type: "grouped", wide: true,
          title: "จำนวนผู้ตอบในแต่ละช่วงของข่าวที่รู้จัก",
          note: "แบ่งเป็น 3 ช่วง · ทุกแท่งเริ่มจากเส้นฐานเดียวกัน",
          unit: "ข่าว",
          series: [
            { column: COL.countA, label: "ข่าวโลก",   color: C.world },
            { column: COL.countB, label: "ข่าวดราม่า", color: C.drama }
          ], },

        { type: "pie", wide: true,
          title: "สัดส่วนผู้ตอบ จำแนกตามชุดข่าวที่รู้จักมากกว่า",
          note: "ผู้ตอบหนึ่งคนอยู่ได้กลุ่มเดียว",
          columnA: COL.countA, columnB: COL.countB,
          groups: [
            { label: "รู้จักข่าวดราม่ามากกว่า", color: C.drama },
            { label: "รู้จักข่าวโลกมากกว่า",   color: C.world },
            { label: "รู้จักเท่ากันทั้งสองชุด",   color: "var(--gray)" }
          ],
          hint: "เกินครึ่งวง = เป็นลักษณะของคนส่วนใหญ่ ไม่ใช่ของไม่กี่คน" }
      ] },

    { type: "charts",
      title: "ผลการสำรวจรายชิ้น จำแนกตามกลุ่มผู้ตอบ",
      desc: "ข่าวแต่ละชิ้นเข้าถึงกลุ่มใดได้มากกว่า",
      charts: [
        { type: "heatmap", wide: true,
          title: "ข่าวโลกรายชิ้น จำแนกตามกลุ่มผู้ตอบ",
          note: "% ของคนในกลุ่มที่รู้จักข่าวชิ้นนั้น · ยิ่งเข้มยิ่งสูง",
          x: Q.newsA, group: Q.age, multi: true, top: 6,
          groupFallback: [Q.gender, Q.howFound],
          singleGroupNote: "ผู้ตอบทั้งหมดอยู่ในกลุ่มเดียวกัน ตารางนี้จึงยังไม่มีข้อมูลให้เปรียบเทียบ กรุณาดูอันดับข่าวด้านล่างประกอบ",
          hint: "ช่องสีอ่อน = กลุ่มนั้นแทบไม่รู้จักข่าวชิ้นนี้" }
      ] },

    { type: "charts",
      title: "อันดับข่าวที่ผู้ตอบรู้จัก",
      desc: "ข่าวชิ้นใดเข้าถึงผู้ตอบได้มากที่สุด",
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
