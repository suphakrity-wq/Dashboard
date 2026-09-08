/* รวมทุกหน้าไว้ที่เดียว — ลำดับในอาร์เรย์คือลำดับในเมนูด้านซ้าย
   เพิ่มหน้าใหม่: สร้างไฟล์ในโฟลเดอร์นี้ แล้ว import มาต่อท้าย */

import summary  from './summary.js';
import gap      from './gap.js';
import reasons  from './reasons.js';
import behavior from './behavior.js';
import conclusion from './conclusion.js';
import data     from './data.js';

export const PAGES = [summary, gap, reasons, behavior, conclusion, data];

export { COMPUTED, TABS, FILTERS } from './columns.js';
export { ANALYSIS } from './analysis.js';
