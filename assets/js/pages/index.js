/* รวมทุกหน้าไว้ที่เดียว — ลำดับในอาร์เรย์คือลำดับในเมนูด้านซ้าย
   เพิ่มหน้าใหม่: สร้างไฟล์ในโฟลเดอร์นี้ แล้ว import มาต่อท้าย */

import summary  from './summary.js?v=113';
import present  from './present.js?v=113';
import gap      from './gap.js?v=113';
import reasons  from './reasons.js?v=113';
import behavior from './behavior.js?v=113';
import conclusion from './conclusion.js?v=113';
import data     from './data.js?v=113';

export const PAGES = [summary, present, gap, reasons, behavior, conclusion, data];

export { COMPUTED, TABS, FILTERS } from './columns.js?v=113';
export { ANALYSIS } from './analysis.js?v=113';
