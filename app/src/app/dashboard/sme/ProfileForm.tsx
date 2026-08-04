'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const PROVINCES = [
  'กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร','ขอนแก่น','จันทบุรี','ฉะเชิงเทรา',
  'ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร','เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก',
  'นครปฐม','นครพนม','นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน',
  'บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี','พระนครศรีอยุธยา',
  'พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี','เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม',
  'มุกดาหาร','แม่ฮ่องสอน','ยโสธร','ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง',
  'ลำพูน','เลย','ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร',
  'สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์','หนองคาย',
  'หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี','อุบลราชธานี',
]

const FIELD_LABELS: Record<string, string> = {
  sme_one_id: 'เลขนิติบุคคล / เลขผู้เสียภาษี',
  company_name: 'ชื่อบริษัท / กิจการ',
  province: 'จังหวัด',
  business_type: 'ประเภทธุรกิจ',
  owner_name: 'ชื่อ-นามสกุล เจ้าของ / ผู้มีอำนาจ',
  address: 'ที่ตั้งกิจการ',
  postal_code: 'รหัสไปรษณีย์',
  year_started: 'ปีที่เริ่มดำเนินกิจการ',
  employee_count: 'จำนวนพนักงาน',
  fti_member_id: 'เลขสมาชิก ส.อ.ท. (ถ้ามี)',
  industry_group: 'กลุ่มอุตสาหกรรม',
  main_product: 'ผลิตภัณฑ์ / บริการหลัก',
  brand: 'แบรนด์สินค้า',
  sales_channel: 'ช่องทางจำหน่าย',
  website: 'เว็บไซต์บริษัท',
  social_media: 'Social Media ของกิจการ',
  product_standard: 'มาตรฐานผลิตภัณฑ์ / โรงงาน',
  awards: 'รางวัลที่เคยได้รับ',
  export_history: 'ประวัติการส่งออก',
  export_countries: 'ประเทศที่เคยส่งออก',
  funding_history: 'ประวัติการได้รับทุน / การสนับสนุน',
  funding_agency: 'หน่วยงานที่เคยให้ทุน',
  funding_amount: 'วงเงิน / ประเภททุนที่เคยได้รับ',
  coordinator_name: 'ชื่อ-นามสกุล ผู้ประสานงาน',
  coordinator_position: 'ตำแหน่ง',
  coordinator_phone: 'เบอร์โทรศัพท์',
  coordinator_email: 'อีเมล',
  coordinator_line: 'LINE ID (ถ้ามี)',
  coordinator_relation: 'ความสัมพันธ์กับกิจการ',
}
const REQUIRED = new Set(['sme_one_id','company_name','province','business_type','coordinator_name','coordinator_phone','coordinator_email'])
const ALL_KEYS = Object.keys(FIELD_LABELS)

const STEPS = [
  { title: 'ข้อมูลกิจการ', keys: ['sme_one_id','company_name','province','business_type','owner_name','address','postal_code','year_started','employee_count','fti_member_id'] },
  { title: 'ธุรกิจและสินค้า', keys: ['industry_group','main_product','brand','sales_channel','website','social_media'] },
  { title: 'ศักยภาพของกิจการ', keys: ['product_standard','awards','export_history','export_countries','funding_history','funding_agency','funding_amount'] },
  { title: 'ผู้ประสานงาน', keys: ['coordinator_name','coordinator_position','coordinator_phone','coordinator_email','coordinator_line','coordinator_relation'] },
]

export default function ProfileForm({ sme }: { sme: any }) {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    ALL_KEYS.forEach(k => { init[k] = sme[k] ?? '' })
    return init
  })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  async function save() {
    setSaving(true); setMsg('')
    const payload: Record<string, any> = {}
    ALL_KEYS.forEach(k => { payload[k] = form[k].trim() === '' ? null : form[k].trim() })
    const { error } = await supabase.from('sme_profiles').update(payload).eq('id', sme.id)
    setSaving(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setMsg('บันทึกข้อมูลเรียบร้อยแล้ว')
    router.refresh()
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <div key={s.title} onClick={() => setStep(i)} style={{ flex: 1, cursor: 'pointer' }}>
            <div style={{
              height: 4, borderRadius: 2, marginBottom: 6,
              background: i <= step ? '#1e3a8a' : '#e2e8f0',
            }} />
            <div style={{
              fontSize: 12, textAlign: 'center',
              color: i === step ? '#1e3a8a' : '#94a3b8',
              fontWeight: i === step ? 600 : 400,
            }}>
              {i + 1}. {s.title}
            </div>
          </div>
        ))}
      </div>

      {msg && <div className={`alert ${msg.includes('เรียบร้อย') ? 'alert-ok' : 'alert-err'}`}>{msg}</div>}

      <div style={{ fontWeight: 600, fontSize: 16, margin: '0 0 14px', color: '#1e3a8a' }}>
        {current.title}
      </div>

      {current.keys.map(key => (
        <div className="field" key={key}>
          <label>
            {FIELD_LABELS[key]}
            {REQUIRED.has(key) && <span style={{ color: '#dc2626' }}> *</span>}
          </label>
          {key === 'province' ? (
            <select value={form[key]} onChange={set(key)}>
              <option value="">— เลือกจังหวัด —</option>
              {PROVINCES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input value={form[key]} onChange={set(key)} />
          )}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 10 }}>
        <button
          className="btn btn-ghost"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          style={{ visibility: step === 0 ? 'hidden' : 'visible' }}
        >
          ← ย้อนกลับ
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={save} disabled={saving}>
            {saving ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
          {!isLast && (
            <button className="btn" onClick={() => setStep(step + 1)}>
              ถัดไป →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
