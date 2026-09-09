/* รวมทุกหน้าไว้ที่เดียว — ลำดับในอาร์เรย์คือลำดับในเมนูด้านซ้าย
   เพิ่มหน้าใหม่: สร้างไฟล์ในโฟลเดอร์นี้ แล้ว import มาต่อท้าย */

import summary  from './summary.js?v=79';
import present  from './present.js?v=79';
import gap      from './gap.js?v=79';
import reasons  from './reasons.js?v=79';
import behavior from './behavior.js?v=79';
import conclusion from './conclusion.js?v=79';
import data     from './data.js?v=79';

export const PAGES = [summary, present, gap, reasons, behavior, conclusion, data];

export { COMPUTED, TABS, FILTERS } from './columns.js?v=79';
export { ANALYSIS } from './analysis.js?v=79';
