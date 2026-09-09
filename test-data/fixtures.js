/* [test] ชุดข้อมูลจำลองสำหรับทดสอบหน้าตาและการทำงานของระบบ
 *
 * แก้ไฟล์นี้เมื่อ: เพิ่มไฟล์ CSV ทดสอบใหม่ใน test-data/ แล้วอยากให้เลือกได้จาก dropdown
   เปิดด้วย ?demo=<id> เช่น  /?demo=realistic
   ทุกชุดใช้โครงสร้างคอลัมน์เดียวกับชีตจริง */

export const FIXTURES = [
  { id: 'realistic', file: 'test-data/realistic-25.csv',
    label: 'เหมือนของจริง · 25 คน',
    note: 'ช่วงอายุแคบ (18-25) จำนวนใกล้เคียงที่จะเก็บได้จริง' },

  { id: 'mixed', file: 'test-data/mixed-58.csv',
    label: 'หลากหลาย · 58 คน',
    note: 'ครบ 6 ช่วงอายุ ใช้ดูกราฟแบ่งกลุ่มและ heatmap เต็มรูปแบบ' },

  { id: 'single', file: 'test-data/single-group-20.csv',
    label: 'กลุ่มเดียวล้วน · 20 คน',
    note: 'ผู้ตอบอยู่ช่วงอายุเดียวกันหมด — ทดสอบว่าระบบซ่อนกราฟแบ่งกลุ่มให้' },

  { id: 'tiny', file: 'test-data/tiny-3.csv',
    label: 'น้อยมาก · 3 คน',
    note: 'ทดสอบคำเตือนกลุ่มตัวอย่างน้อย และกราฟที่มีข้อมูลไม่กี่จุด' },

  { id: 'world', file: 'test-data/world-wins-30.csv',
    label: 'ข่าวโลกนำ · 30 คน',
    note: 'คำตอบของงานวิจัยต้องพลิกเป็น “ไม่จริง”' },

  { id: 'tie', file: 'test-data/tie-40.csv',
    label: 'ก้ำกึ่ง · 40 คน',
    note: 'ส่วนต่างไม่ถึงเกณฑ์ ต้องขึ้นว่า “ก้ำกึ่ง”' },

  { id: 'messy', file: 'test-data/messy-32.csv',
    label: 'ข้อมูลรก · 32 คน',
    note: 'มีช่องว่างหน้า-หลัง ข้ามข้อ และคำตอบยาวผิดปกติ' },

  { id: 'dup', file: 'test-data/duplicate-header-15.csv',
    label: 'หัวคอลัมน์ซ้ำ · 15 คน',
    note: 'ฟอร์มถามซ้ำ — ทดสอบการตั้งชื่อคอลัมน์ไม่ให้ทับกัน' },

  { id: 'junk', file: 'test-data/junk-25.csv',
    label: 'มีคำตอบเล่น ๆ + พิมพ์ผิด · 25 คน',
    note: 'ชุดสำหรับลองปุ่มกรองคำตอบ — มีทั้งคำตอบนอกตัวเลือก ข้อความไม่มีเนื้อหา และคำที่พิมพ์ผิดให้ระบบเดาให้' },

  { id: 'empty', file: 'test-data/empty.csv',
    label: 'ยังไม่มีคำตอบ',
    note: 'มีแต่หัวคอลัมน์ — ทดสอบสถานะว่าง' }
];

export const findFixture = id => FIXTURES.find(f => f.id === id) || FIXTURES[0];
