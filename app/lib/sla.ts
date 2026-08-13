// ============================================
// sla.ts — utility functions สำหรับคำนวณวันทำการ (business days) และสถานะ SLA
// นับจันทร์-ศุกร์ ตัดวันหยุดพิเศษ (เสาร์-อาทิตย์คำนวณอัตโนมัติ, วันหยุดนักขัตฤกษ์มาจากตาราง holidays)
// ============================================

export type SlaConfig = {
  step1_days: number
  step2_days: number
  step3_days_low: number
  step3_days_high: number
  step3_threshold_amount: number
}

export type SlaStatus = {
  daysUsed: number       // จำนวนวันทำการที่ใช้ไปแล้ว (นับถึง `now`)
  slaDays: number         // จำนวนวันทำการที่กำหนดไว้ (SLA)
  daysRemaining: number   // จำนวนวันทำการที่เหลือ (ติดลบถ้าเกิน SLA แล้ว)
  percentUsed: number     // % เวลาที่ใช้ไปเทียบ SLA (0-100+, อาจเกิน 100 ถ้าเลยกำหนด)
  isOverdue: boolean      // เกิน SLA แล้วหรือยัง
  deadline: Date          // วันที่ครบกำหนด (วันทำการสุดท้ายที่ยังอยู่ใน SLA)
}

/**
 * แปลง Date เป็น key รูปแบบ YYYY-MM-DD (local date, ไม่สนใจเวลา) ใช้เทียบกับ holidays set
 */
function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * เช็คว่าวันที่กำหนดเป็น "วันทำการ" หรือไม่
 * วันทำการ = ไม่ใช่เสาร์-อาทิตย์ และไม่อยู่ใน holidaySet
 */
export function isBusinessDay(date: Date, holidaySet: Set<string>): boolean {
  const day = date.getDay() // 0 = อาทิตย์, 6 = เสาร์
  if (day === 0 || day === 6) return false
  if (holidaySet.has(toDateKey(date))) return false
  return true
}

/**
 * สร้าง Set ของวันหยุด (YYYY-MM-DD) จาก array ของวันที่ (string หรือ Date) เพื่อเช็คได้เร็ว (O(1))
 */
export function buildHolidaySet(holidayDates: (string | Date)[]): Set<string> {
  const set = new Set<string>()
  for (const h of holidayDates) {
    const d = typeof h === 'string' ? new Date(h) : h
    set.add(toDateKey(d))
  }
  return set
}

/**
 * นับจำนวนวันทำการระหว่าง startDate (ไม่รวม) ถึง endDate (รวม)
 * ใช้สำหรับคำนวณว่า "ผ่านไปกี่วันทำการแล้ว" นับจากวันเริ่มขั้นตอน
 * ถ้า endDate <= startDate จะคืน 0
 */
export function countBusinessDaysBetween(
  startDate: Date,
  endDate: Date,
  holidaySet: Set<string>
): number {
  if (endDate <= startDate) return 0
  let count = 0
  const cursor = new Date(startDate)
  cursor.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)

  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1)
    if (isBusinessDay(cursor, holidaySet)) count++
  }
  return count
}

/**
 * บวกจำนวนวันทำการจากวันเริ่มต้น คืนวันที่ครบกำหนด (deadline)
 * เช่น startDate = จันทร์, days = 5 → คืนวันจันทร์ถัดไป (ข้ามเสาร์-อาทิตย์)
 */
export function addBusinessDays(
  startDate: Date,
  days: number,
  holidaySet: Set<string>
): Date {
  const cursor = new Date(startDate)
  cursor.setHours(0, 0, 0, 0)
  let remaining = days
  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + 1)
    if (isBusinessDay(cursor, holidaySet)) remaining--
  }
  return cursor
}

/**
 * คำนวณสถานะ SLA ของขั้นตอนหนึ่งๆ
 * @param startedAt เวลาที่ขั้นตอนนี้เริ่ม (เช่น step2_started_at)
 * @param slaDays จำนวนวันทำการที่กำหนดไว้สำหรับขั้นตอนนี้
 * @param holidaySet Set ของวันหยุดพิเศษ (จาก buildHolidaySet)
 * @param now เวลาปัจจุบัน (default = new Date())
 */
export function getSlaStatus(
  startedAt: Date,
  slaDays: number,
  holidaySet: Set<string>,
  now: Date = new Date()
): SlaStatus {
  const daysUsed = countBusinessDaysBetween(startedAt, now, holidaySet)
  const daysRemaining = slaDays - daysUsed
  const percentUsed = slaDays > 0 ? Math.round((daysUsed / slaDays) * 100) : 100
  const isOverdue = daysUsed > slaDays
  const deadline = addBusinessDays(startedAt, slaDays, holidaySet)

  return { daysUsed, slaDays, daysRemaining, percentUsed, isOverdue, deadline }
}

/**
 * เลือกจำนวนวัน SLA ของขั้นที่ 3 (ดำเนินการ → เสร็จสิ้น) ตามเกณฑ์วงเงิน
 * @param maxAmount วงเงินสูงสุดของ package (min_amount/max_amount)
 */
export function getStep3SlaDays(
  config: SlaConfig,
  maxAmount: number | null
): number {
  if (maxAmount != null && maxAmount >= config.step3_threshold_amount) {
    return config.step3_days_high
  }
  return config.step3_days_low
}

/**
 * สีสำหรับแสดงผลตาม % เวลาที่ใช้ไป (เขียว → เหลือง → แดง)
 * < 70% = เขียว, 70-100% = เหลือง, > 100% (เกิน SLA) = แดง
 */
export function getSlaColor(percentUsed: number): { bg: string; text: string } {
  if (percentUsed > 100) return { bg: '#dc2626', text: '#fff' }  // แดง — เกิน SLA
  if (percentUsed >= 70) return { bg: '#f59e0b', text: '#fff' }  // เหลือง — ใกล้ครบกำหนด
  return { bg: '#16a34a', text: '#fff' }                          // เขียว — ปกติ
}

/**
 * ข้อความแสดงจำนวนวันที่เหลือ/เกิน สำหรับแสดงบน progress bar
 */
export function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining > 0) return `เหลือ ${daysRemaining} วัน`
  if (daysRemaining === 0) return 'ครบกำหนดวันนี้'
  return `เกิน ${Math.abs(daysRemaining)} วัน`
}
