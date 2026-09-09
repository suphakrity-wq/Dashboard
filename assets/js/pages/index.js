/* รวมทุกหน้าไว้ที่เดียว — ลำดับในอาร์เรย์คือลำดับในเมนูด้านซ้าย
   เพิ่มหน้าใหม่: สร้างไฟล์ในโฟลเดอร์นี้ แล้ว import มาต่อท้าย */

import summary  from './summary.js?v=73';
import gap      from './gap.js?v=73';
import reasons  from './reasons.js?v=73';
import behavior from './behavior.js?v=73';
import conclusion from './conclusion.js?v=73';
import data     from './data.js?v=73';

export const PAGES = [summary, gap, reasons, behavior, conclusion, data];

export { COMPUTED, TABS, FILTERS } from './columns.js?v=73';
export { ANALYSIS } from './analysis.js?v=73';
