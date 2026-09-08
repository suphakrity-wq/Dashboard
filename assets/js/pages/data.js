/* หน้า 5 — ข้อมูลดิบ: คำตอบทุกแถวทุกคอลัมน์ */

import { Q } from './columns.js?v=40';

export default {
  id: "data",
  icon: "table_rows",
  label: "ข้อมูลดิบ",
  navHint: "คำตอบรายคน",
  title: "ข้อมูลดิบ",
  answers: "คำตอบดิบของแต่ละคนเป็นอย่างไร ตรวจสอบย้อนกลับได้",
  desc: "คำตอบดิบทุกแถวทุกคอลัมน์จาก Google Sheet — ค้นหา กรอง และกางดูรายคนได้",

  summary: [
    { label: "จำนวนแถว", column: Q.age, agg: "count", unit: "แถว" },
    { label: "ช่วงอายุที่พบ", column: Q.age, agg: "distinct", unit: "ช่วง" },
    { label: "อาชีพ/กลุ่ม", column: Q.gender, agg: "distinct", unit: "กลุ่ม" },
    { label: "ช่องทางที่พบ", column: Q.channel, agg: "distinct", unit: "ช่องทาง" }
  ],

  blocks: [
    { type: "table",
      title: "ตารางคำตอบ",
      desc: "ทุกคอลัมน์จากชีต · เลื่อนแนวนอนเพื่อดูคอลัมน์ที่เหลือ · คลิกที่แถวเพื่อกางคำตอบเต็มของคนนั้น",
      pageSize: 15 }
  ]
};
