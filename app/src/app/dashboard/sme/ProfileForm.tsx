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

const FIELDS: { key: string; label: string; type?: string; required?: boolean; options?: string[] }[] = [
  { key: 'sme_one_id', label: 'เลขนิติบุคคล / เลขผู้เสียภาษี', required: true },
  { key: 'company_name', label: 'ชื่อบริษัท / กิจการ', required: true },
  { key: 'province', label: 'จังหวัด', type: 'select', options: PROVINCES, required: true },
  { key: 'business_type', label: 'ประเภทธุรกิจ', required: true },
  { key: 'owner_name', label: 'ชื่อ-นามสกุล เจ้าของ / ผู้มีอำนาจ' },
  { key: 'address', label: 'ที่ตั้งกิจการ' },
  { key: 'postal_code', label: 'รหัสไปรษณีย์' },
  { key: 'year_started', label: 'ปีที่เริ่มดำเนินกิจการ' },
  { key: 'employee_count', label: 'จำนวนพนักงาน' },
  { key: 'fti_member_id', label: 'เลขสมาชิก ส.อ.ท. (ถ้ามี)' },
  { key: 'industry_group', label: 'กลุ่มอุตสาหกรรม' },
  { key: 'main_product', label: 'ผลิตภัณฑ์ / บริการหลัก' },
  { key: 'brand', label: 'แบรนด์สินค้า' },
  { key: 'sales_channel', label: 'ช่องทางจำหน่าย' },
  { key: 'website', label: 'เว็บไซต์บริษัท' },
  { key: 'social_media', label: 'Social Media ของกิจการ' },
  { key: 'product_standard', label: 'มาตรฐานผลิตภัณฑ์ / โรงงาน' },
  { key: 'awards', label: 'รางวัลที่เคยได้รับ' },
  { key: 'export_history', label: 'ประวัติการส่งออก' },
  { key: 'export_countries', label: 'ประเทศที่เคยส่งออก' },
  { key: 'funding_history', label: 'ประวัติการได้รับทุน / การสนับสนุน' },
  { key: 'funding_agency', label: 'หน่วยงานที่เคยให้ทุน' },
  { key: 'funding_amount', label: 'วงเงิน / ประเภททุนที่เคยได้รับ' },
  { key: 'coordinator_name', label: 'ชื่อ-นามสกุล ผู้ประสานงาน', required: true },
  { key: 'coordinator_position', label: 'ตำแหน่ง' },
  { key: 'coordinator_phone', label: 'เบอร์โทรศัพท์', required: true },
  { key: 'coordinator_email', label: 'อีเมล', required: true },
  { key: 'coordinator_line', label: 'LINE ID (ถ้ามี)' },
  { key: 'coordinator_relation', label: 'ความสัมพันธ์กับกิจการ' },
]

const SECTIONS = [
  { title: 'ข้อมูลกิจการ', keys: ['sme_one_id', 'company_name', 'province', 'business_type', 'owner_name', 'address', 'postal_code', 'year_started', 'employee_count', 'fti_member_id'] },
  { title: 'ข้อมูลธุรกิจและสินค้า', keys: ['industry_group', 'main_product', 'brand', 'sales_channel', 'website', 'social_media'] },
  { title: 'ข้อมูลศักยภาพของกิจการ', keys: ['product_standard', 'awards', 'export_history', 'export_countries', 'funding_history', 'funding_agency', 'funding_amount'] },
  { title: 'ข้อมูลผู้ประสานงาน', keys: ['coordinator_name', 'coordinator_position', 'coordinator_phone', 'coordinator_email', 'coordinator_line', 'coordinator_relation'] },
]

export default function ProfileForm({ sme }: { sme: any }) {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    FIELDS.forEach(f => { init[f.key] = sme[f.key] ?? '' })
    return init
  })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })
  const fieldMap = Object.fromEntries(FIELDS.map(f => [f.key, f]))

  async function save() {
    setSaving(true); setMsg('')
    const payload: Record<string, any> = {}
    FIELDS.forEach(f => { payload[f.key] = form[f.key].trim() === '' ? null : form[f.key].trim() })
    const { error } = await supabase
      .from('sme_profiles')
      .update(payload)
      .eq('id', sme.id)
    setSaving(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setMsg('บันทึกข้อมูลเรียบร้อยแล้ว')
    router.refresh()
  }

  return (
    <div className="card">
      {msg && <div className={`alert ${msg.includes('เรียบร้อย') ? 'alert-ok' : 'alert-err'}`}>{msg}</div>}

      {SECTIONS.map(section => (
        <div key={section.title} style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 15, margin: '0 0 12px', color: '#1e3a8a', borderBottom: '1px solid #eef2ff', paddingBottom: 6 }}>
            {section.title}
          </div>
          {section.keys.map(key => {
            const f = fieldMap[key]
            return (
              <div className="field" key={key}>
                <label>
                  {f.label}
                  {f.required && <span style={{ color: '#dc2626' }}> *</span>}
                </label>
                {f.type === 'select' ? (
                  <select value={form[key]} onChange={set(key)}>
                    <option value="">— เลือกจังหวัด —</option>
                    {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input value={form[key]} onChange={set(key)} />
                )}
              </div>
            )
          })}
        </div>
      ))}

      <button className="btn" onClick={save} disabled={saving}>
        {saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
      </button>
    </div>
  )
}
