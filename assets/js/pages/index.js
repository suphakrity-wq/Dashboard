/* รวมทุกหน้าไว้ที่เดียว ลำดับในอาร์เรย์คือลำดับของเมนูด้านซ้าย
   ลำดับนี้เดินตามเส้นเรื่องของรายงาน:
     ภาพรวมการสำรวจ -> ผลการสำรวจ -> เหตุผลของคำตอบ
     -> ทางเลือกของผู้ตอบ -> สรุปผลและข้อเสนอแนะ
   สองหน้าท้ายเป็นส่วนประกอบ: สไลด์สำหรับนำเสนอ และข้อมูลดิบสำหรับตรวจสอบย้อนกลับ
   เพิ่มหน้าใหม่: สร้างไฟล์ในโฟลเดอร์นี้ แล้ว import เข้ามาต่อในอาร์เรย์ */

import summary  from './summary.js?v=159';
import present  from './present.js?v=159';
import gap      from './gap.js?v=159';
import reasons  from './reasons.js?v=159';
import behavior from './behavior.js?v=159';
import conclusion from './conclusion.js?v=159';
import data     from './data.js?v=159';

export const PAGES = [summary, gap, reasons, behavior, conclusion, present, data];

export { COMPUTED, TABS, FILTERS } from './columns.js?v=159';
export { ANALYSIS } from './analysis.js?v=159';
