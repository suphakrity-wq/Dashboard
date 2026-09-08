/* รวมทุกหน้าไว้ที่เดียว — ลำดับในอาร์เรย์คือลำดับในเมนูด้านซ้าย
   เพิ่มหน้าใหม่: สร้างไฟล์ในโฟลเดอร์นี้ แล้ว import มาต่อท้าย */

import summary  from './summary.js?v=33';
import gap      from './gap.js?v=33';
import reasons  from './reasons.js?v=33';
import behavior from './behavior.js?v=33';
import conclusion from './conclusion.js?v=33';
import data     from './data.js?v=33';

export const PAGES = [summary, gap, reasons, behavior, conclusion, data];

export { COMPUTED, TABS, FILTERS } from './columns.js?v=33';
export { ANALYSIS } from './analysis.js?v=33';
