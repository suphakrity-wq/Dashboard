/* จุดเริ่มต้นของแอป — ต่อ core (ข้อมูล/คำนวณ) เข้ากับ ui (หน้าตา)
   core/  = ตรรกะล้วน ไม่มี DOM   |   ui/ = วาดหน้าจอ   |   pages/ = นิยามเนื้อหาแต่ละหน้า */

import { $ } from './ui/dom.js?v=159';
import { store, refresh, visibleRows, subscribe } from './core/store.js?v=159';
import { BLOCKS, onRerender } from './ui/blocks.js?v=159';
import { renderNav, renderTabs, renderFilters, renderSummary, renderStatus, markDemo, setupNav, renderSourcePicker, renderOddToggle, restoreOddChoice } from './ui/shell.js?v=159';
import { PAGES, COMPUTED, TABS, FILTERS, ANALYSIS } from './pages/index.js?v=159';
import { FIXTURES, findFixture } from '../../test-data/fixtures.js?v=159';

/* config.js = ตั้งค่าที่ผู้ใช้แก้บ่อย ส่วนเนื้อหาหน้าอยู่ใน pages/ */
const CFG = {
  ...(window.DASHBOARD_CONFIG || {}),
  pages: PAGES, computed: COMPUTED, tabs: TABS, filters: FILTERS, analysis: ANALYSIS
};

/* โหมดทดลอง: ?demo=<id> เลือกชุดข้อมูลจำลองจาก test-data/fixtures.js
   (ข้อมูลจริงในชีตไม่ถูกแตะต้อง และไม่เขียนแคชทับกัน) */
const demoParam = new URLSearchParams(location.search).get('demo');
const DEMO = demoParam !== null;
let fixture = null;
if (DEMO) {
  fixture = findFixture(demoParam);
  delete CFG.sheetId; delete CFG.gid; delete CFG.sources;
  CFG.csvUrl = fixture.file;
  CFG.cacheMinutes = 0;
  document.documentElement.classList.add('is-demo');
}

const pages = () => CFG.pages || [];
let pageId = null;
const currentPage = () => pages().find(p => p.id === pageId) || pages()[0];

function render() {
  const page = currentPage();
  if (!page) return;
  const rows = visibleRows(CFG);

  $('#crumb').textContent = page.crumb || 'รายงานผลสำรวจ';
  $('#page-title').innerHTML = (page.title || page.label).replace(/\[(.+?)\]/g, '<em>$1</em>');
  /* หัวหน้าเหลือบรรทัดเดียว: answers บอกได้ตรงกว่าว่าหน้านี้ให้คำตอบอะไร
     ส่วน desc เก็บไว้ในไฟล์หน้าเป็นบันทึกของคนทำ ไม่ต้องขึ้นจอซ้ำอีกบรรทัด */
  $('#page-desc').textContent = '';
  const ans = $('#page-answers');
  ans.textContent = page.answers || '';
  ans.hidden = !page.answers;
  document.body.dataset.page = page.id;

  renderSummary(page, rows);
  renderStatus();

  const host = $('#page-body');
  host.innerHTML = '';
  (page.blocks || []).forEach(b => BLOCKS[b.type]?.(host, b, rows, CFG));
}

function goto(id) {
  pageId = pages().some(p => p.id === id) ? id : pages()[0]?.id;
  store.page = 0;
  renderNav(pages(), pageId);
  render();
  window.scrollTo({ top: 0 });
}

/* ---------- เริ่มทำงาน ---------- */
document.title = (CFG.title || 'Dashboard').replace(/[\[\]]/g, '');
$('#side-title').textContent = CFG.brand || 'Dashboard';
$('#side-sub').textContent = CFG.brandSub || '';
$('#refresh').onclick = () => refresh(CFG, { useCache: false });

restoreOddChoice();
renderSourcePicker(FIXTURES, DEMO ? fixture?.id : null);
if (DEMO) markDemo(fixture);
onRerender(render);
subscribe(() => {
  if (store.status === 'ready') {
    renderTabs(CFG, render); renderFilters(CFG, render); renderOddToggle(CFG, render);
  }
  render();
});

window.addEventListener('hashchange', () => goto(location.hash.replace('#/', '')));
pageId = location.hash.replace('#/', '') || null;
renderNav(pages(), pageId);
setupNav();
goto(pageId);
refresh(CFG);

if (CFG.refreshMinutes > 0) setInterval(() => refresh(CFG, { useCache: false }), CFG.refreshMinutes * 60000);

// ไอคอน Material Symbols: แสดงเมื่อฟอนต์พร้อม
document.fonts?.load('24px "Material Symbols Rounded"').then(() => {
  if (document.fonts.check('24px "Material Symbols Rounded"'))
    document.documentElement.classList.add('icons-ready');
}).catch(() => {});
