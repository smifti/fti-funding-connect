'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

type SlaConfigRow = {
  id: string
  step1_days: number
  step2_days: number
  step3_days_low: number
  step3_days_high: number
  step3_threshold_amount: number
} | null

type HolidayRow = {
  id: string
  holiday_date: string // YYYY-MM-DD
  label: string | null
}

const fieldStyle = {
  width: '100%', padding: '8px 10px', fontSize: 14,
  borderRadius: 8, border: '1px solid #cbd5e1', marginTop: 4,
} as const
const labelStyle = { fontSize: 13, color: '#475569', fontWeight: 500 } as const

export default function SystemSettingsManager({
  initialSlaConfig, initialHolidays, currentUserId,
}: {
  initialSlaConfig: SlaConfigRow
  initialHolidays: HolidayRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const supabase = createClient()

  // ---- SLA form state ----
  const [slaForm, setSlaForm] = useState({
    step1_days: String(initialSlaConfig?.step1_days ?? 5),
    step2_days: String(initialSlaConfig?.step2_days ?? 5),
    step3_days_low: String(initialSlaConfig?.step3_days_low ?? 20),
    step3_days_high: String(initialSlaConfig?.step3_days_high ?? 30),
    step3_threshold_amount: String(initialSlaConfig?.step3_threshold_amount ?? 15000000),
  })
  const [slaBusy, setSlaBusy] = useState(false)
  const [slaMsg, setSlaMsg] = useState('')

  // ---- Holidays state ----
  const [holidays, setHolidays] = useState<HolidayRow[]>(initialHolidays)
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayLabel, setNewHolidayLabel] = useState('')
  const [holidayBusy, setHolidayBusy] = useState(false)
  const [holidayMsg, setHolidayMsg] = useState('')

  function setSlaField(k: string, v: string) {
    setSlaForm(f => ({ ...f, [k]: v }))
  }

  async function saveSla() {
    // validation เบื้องต้น: ต้องเป็นตัวเลขบวกทั้งหมด
    const values = {
      step1_days: Number(slaForm.step1_days),
      step2_days: Number(slaForm.step2_days),
      step3_days_low: Number(slaForm.step3_days_low),
      step3_days_high: Number(slaForm.step3_days_high),
      step3_threshold_amount: Number(slaForm.step3_threshold_amount),
    }
    for (const [key, val] of Object.entries(values)) {
      if (!Number.isFinite(val) || val < 0) {
        setSlaMsg(`ค่า "${key}" ต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0`)
        return
      }
    }

    setSlaBusy(true); setSlaMsg('')
    const payload = { ...values, updated_at: new Date().toISOString(), updated_by: currentUserId }

    let error
    if (initialSlaConfig?.id) {
      const res = await supabase.from('sla_config').update(payload).eq('id', initialSlaConfig.id)
      error = res.error
    } else {
      // เผื่อกรณียังไม่มีแถวเลย (ไม่ควรเกิดขึ้นถ้ารัน migration แล้ว แต่กันไว้)
      const res = await supabase.from('sla_config').insert(payload)
      error = res.error
    }

    setSlaBusy(false)
    if (error) { setSlaMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setSlaMsg('บันทึกค่า SLA เรียบร้อยแล้ว')
    router.refresh()
  }

  async function addHoliday() {
    if (!newHolidayDate) { setHolidayMsg('กรุณาเลือกวันที่'); return }
    if (holidays.some(h => h.holiday_date === newHolidayDate)) {
      setHolidayMsg('วันที่นี้ถูกเพิ่มไว้แล้ว')
      return
    }
    setHolidayBusy(true); setHolidayMsg('')
    const { data, error } = await supabase
      .from('holidays')
      .insert({
        holiday_date: newHolidayDate,
        label: newHolidayLabel.trim() || null,
        created_by: currentUserId,
      })
      .select()
      .single()
    setHolidayBusy(false)
    if (error) { setHolidayMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setHolidays(prev => [...prev, data as HolidayRow].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)))
    setNewHolidayDate('')
    setNewHolidayLabel('')
    router.refresh()
  }

  async function removeHoliday(id: string) {
    if (!confirm('ต้องการลบวันหยุดนี้ใช่หรือไม่?')) return
    setHolidayBusy(true); setHolidayMsg('')
    const { error } = await supabase.from('holidays').delete().eq('id', id)
    setHolidayBusy(false)
    if (error) { setHolidayMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setHolidays(prev => prev.filter(h => h.id !== id))
    router.refresh()
  }

  function formatThaiDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    const buddhistYear = d.getFullYear() + 543
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}/${mm}/${buddhistYear}`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ส่วนที่ 1: ตั้งค่า SLA */}
      <div className="card">
        <h2 style={{ margin: '0 0 4px' }}>ระยะเวลา SLA (วันทำการ)</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
          กำหนดจำนวนวันทำการสูงสุดของแต่ละขั้นตอน (นับเฉพาะวันจันทร์–ศุกร์ ไม่นับวันหยุดสุดสัปดาห์และวันหยุดพิเศษด้านล่าง)
        </p>

        {slaMsg && (
          <div style={{
            background: slaMsg.startsWith('บันทึก') ? '#dcfce7' : '#fee2e2',
            color: slaMsg.startsWith('บันทึก') ? '#166534' : '#991b1b',
            padding: '8px 12px', borderRadius: 8, marginBottom: 14, fontSize: 14,
          }}>
            {slaMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              ① ยื่นสมัคร → พิจารณาคุณสมบัติ
            </div>
            <div style={{ maxWidth: 200 }}>
              <label style={labelStyle}>จำนวนวันทำการ</label>
              <input style={fieldStyle} type="number" min={0} value={slaForm.step1_days}
                onChange={e => setSlaField('step1_days', e.target.value)} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              ② พิจารณาคุณสมบัติ → ดำเนินการ (จากหน่วยร่วม)
            </div>
            <div style={{ maxWidth: 200 }}>
              <label style={labelStyle}>จำนวนวันทำการ</label>
              <input style={fieldStyle} type="number" min={0} value={slaForm.step2_days}
                onChange={e => setSlaField('step2_days', e.target.value)} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              ③ ดำเนินการ → เสร็จสิ้น (แบ่งตามวงเงิน)
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={labelStyle}>จำนวนวันทำการ (วงเงินต่ำกว่าเกณฑ์)</label>
                <input style={fieldStyle} type="number" min={0} value={slaForm.step3_days_low}
                  onChange={e => setSlaField('step3_days_low', e.target.value)} />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={labelStyle}>จำนวนวันทำการ (วงเงินตั้งแต่เกณฑ์ขึ้นไป)</label>
                <input style={fieldStyle} type="number" min={0} value={slaForm.step3_days_high}
                  onChange={e => setSlaField('step3_days_high', e.target.value)} />
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={labelStyle}>เกณฑ์วงเงิน (บาท)</label>
                <input style={fieldStyle} type="number" min={0} value={slaForm.step3_threshold_amount}
                  onChange={e => setSlaField('step3_threshold_amount', e.target.value)} />
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
              เช่น วงเงินต่ำกว่า {Number(slaForm.step3_threshold_amount || 0).toLocaleString('th-TH')} บาท ใช้ {slaForm.step3_days_low || 0} วัน,
              {' '}ตั้งแต่ {Number(slaForm.step3_threshold_amount || 0).toLocaleString('th-TH')} บาทขึ้นไป ใช้ {slaForm.step3_days_high || 0} วัน
            </div>
          </div>

          <div>
            <button className="btn" disabled={slaBusy} onClick={saveSla}>
              {slaBusy ? 'กำลังบันทึก…' : 'บันทึกค่า SLA'}
            </button>
          </div>
        </div>
      </div>

      {/* ส่วนที่ 2: จัดการวันหยุดพิเศษ */}
      <div className="card">
        <h2 style={{ margin: '0 0 4px' }}>วันหยุดพิเศษ ({holidays.length})</h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>
          กำหนดวันหยุดนักขัตฤกษ์หรือวันหยุดพิเศษอื่น ๆ เพื่อไม่ให้นับรวมเป็นวันทำการ (เสาร์–อาทิตย์ถูกตัดออกให้อัตโนมัติอยู่แล้ว ไม่ต้องเพิ่มที่นี่)
        </p>

        {holidayMsg && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px',
            borderRadius: 8, marginBottom: 14, fontSize: 14 }}>
            {holidayMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>วันที่</label>
            <input style={fieldStyle} type="date" value={newHolidayDate}
              onChange={e => setNewHolidayDate(e.target.value)} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={labelStyle}>ชื่อวันหยุด (ไม่บังคับ)</label>
            <input style={fieldStyle} value={newHolidayLabel}
              onChange={e => setNewHolidayLabel(e.target.value)}
              placeholder="เช่น วันสงกรานต์" />
          </div>
          <button className="btn btn-sm" disabled={holidayBusy} onClick={addHoliday}>
            + เพิ่มวันหยุด
          </button>
        </div>

        {holidays.length === 0 ? (
          <p className="empty">ยังไม่มีวันหยุดพิเศษที่กำหนดไว้</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {holidays.map(h => (
              <div key={h.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 8, background: '#f8fafc',
              }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{formatThaiDate(h.holiday_date)}</span>
                  {h.label && <span style={{ fontSize: 13, color: '#64748b' }}> · {h.label}</span>}
                </div>
                <button className="btn btn-ghost btn-sm" disabled={holidayBusy}
                  onClick={() => removeHoliday(h.id)} style={{ color: '#dc2626' }}>
                  ลบ
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
