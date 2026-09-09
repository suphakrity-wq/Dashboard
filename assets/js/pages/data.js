/* หน้า 5 — ข้อมูลดิบ: คำตอบทุกแถวทุกคอลัมน์ */

import { Q } from './columns.js?v=146';

export default {
  id: "data",
  icon: "table_rows",
  label: "ข้อมูลดิบ",
  navHint: "คำตอบรายคน",
  title: "ข้อมูลดิบ",
  answers: "คำตอบดิบของแต่ละคนเป็นอย่างไร ตรวจสอบย้อนกลับได้",
  desc: "คำตอบดิบทุกแถวทุกคอลัมน์จาก Google Sheet — ค้นหา กรอง และกางดูรายคนได้",

  summary: [
    { label: "คำตอบทั้งหมด", column: Q.age, agg: "count", unit: "ชุด", sub: "หนึ่งชุด = ผู้ตอบหนึ่งคน" },
    { label: "ช่วงอายุที่พบ", column: Q.age, agg: "distinct", unit: "ช่วง", sub: "นับเฉพาะช่วงที่มีคนตอบ" },
    { label: "เพศที่พบ", column: Q.gender, agg: "distinct", unit: "เพศ", sub: "นับเฉพาะที่มีคนตอบ" },
    { label: "ช่องทางที่มีคนใช้", column: Q.channel, agg: "distinct", multi: true, unit: "ช่องทาง" }
  ],

  blocks: [
    { type: "table",
      title: "ตารางคำตอบ",
      desc: "ทุกคอลัมน์จากชีต · เลื่อนแนวนอนเพื่อดูคอลัมน์ที่เหลือ · คลิกที่แถวเพื่อกางคำตอบเต็มของคนนั้น",
      pageSize: 15 }
  ]
};
