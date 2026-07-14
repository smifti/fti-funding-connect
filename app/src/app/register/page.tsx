'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

type RoleType = 'sme' | 'agency' | 'expert'

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

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [roleType, setRoleType] = useState<RoleType>('sme')
  const [form, setForm] = useState({
    email: '', password: '',
    taxId: '', companyName: '', province: '', businessType: '',
    coordName: '', coordPhone: '', coordEmail: '',
    orgName: '',
  })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })
  const roleDesc = roleType === 'sme' ? 'ยื่นคำขอรับการสนับสนุน'
    : roleType === 'agency' ? 'ธนาคาร, NIA, depa ฯลฯ (รอ ส.อ.ท. อนุมัติ)'
    : 'คัดกรองคำขอ (รอ ส.อ.ท. อนุมัติ)'

  async function onSubmit() {
    setErr(''); setOk(''); setLoading(true)
    const companyName = roleType === 'sme' ? form.companyName : form.orgName

    // เช็กเลขนิติบุคคลซ้ำก่อน (เฉพาะ SME ที่กรอกเลข)
    if (roleType === 'sme' && form.taxId.trim() !== '') {
      const { data: dup } = await supabase
        .from('sme_profiles')
        .select('id')
        .eq('sme_one_id', form.taxId.trim())
        .maybeSingle()
      if (dup) {
        setLoading(false)
        setErr('เลขนิติบุคคลนี้มีในระบบแล้ว หากเป็นกิจการของท่าน กรุณาเข้าสู่ระบบ หรือติดต่อ ส.อ.ท.')
        return
      }
    }

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.coordName,
          requested_role: roleType,
          company_name: companyName,
          sme_one_id: form.taxId,
          province: form.province,
          business_type: form.businessType,
          coordinator_name: form.coordName,
          coordinator_phone: form.coordPhone,
          coordinator_email: form.coordEmail,
        },
      },
    })
    if (error) {
      setLoading(false)
      const msg = error.message || ''
      if (msg.includes('sme_one_id') || msg.includes('duplicate') || msg.includes('Database error')) {
        setErr('เลขนิติบุคคลนี้มีในระบบแล้ว หากเป็นกิจการของท่าน กรุณาเข้าสู่ระบบ')
      } else if (msg.includes('already registered') || msg.includes('User already')) {
        setErr('อีเมลนี้เคยลงทะเบียนแล้ว กรุณาเข้าสู่ระบบ')
      } else {
        setErr('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาตรวจสอบข้อมูลแล้วลองใหม่')
      }
      return
    }

    setLoading(false)
    if (roleType === 'sme') {
      setOk('ลงทะเบียนสำเร็จ — สามารถเพิ่มข้อมูลกิจการเต็มได้ภายหลังในหน้าโปรไฟล์ กำลังพาไปหน้าเข้าสู่ระบบ')
    } else {
      setOk('ลงทะเบียนสำเร็จ — บัญชีของท่านอยู่ระหว่างรอ ส.อ.ท. อนุมัติสิทธิ์')
    }
    setTimeout(() => router.push('/login'), 2800)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>ลงทะเบียน</h1>
        <p className="sub">เลือกประเภทผู้ใช้ แล้วกรอกข้อมูลเพื่อสมัคร</p>
        {err && <div className="alert alert-err">{err}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 4, borderRadius: 10, marginBottom: 6 }}>
          {(['sme', 'agency', 'expert'] as RoleType[]).map(v => (
            <button key={v} type="button" onClick={() => setRoleType(v)}
              style={{
                flex: 1, border: 'none', cursor: 'pointer', borderRadius: 8, padding: '8px 6px', fontSize: 13,
                fontWeight: roleType === v ? 600 : 400,
                background: roleType === v ? '#1e3a8a' : 'transparent',
                color: roleType === v ? '#fff' : '#475569',
              }}>
              {v === 'sme' ? 'SME' : v === 'agency' ? 'ผู้ให้บริการ' : 'ที่ปรึกษา'}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>{roleDesc}</p>

        {roleType === 'sme' && (
          <>
            <div style={{ fontWeight: 600, fontSize: 14, margin: '4px 0 8px', color: '#1e3a8a' }}>ข้อมูลกิจการ</div>
            <div className="field">
              <label>เลขนิติบุคคล / เลขผู้เสียภาษี</label>
              <input value={form.taxId} onChange={set('taxId')} />
            </div>
            <div className="field">
              <label>ชื่อบริษัท / กิจการ</label>
              <input value={form.companyName} onChange={set('companyName')} />
            </div>
            <div className="field">
              <label>จังหวัด</label>
              <select value={form.province} onChange={set('province')}>
                <option value="">— เลือกจังหวัด —</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label>ประเภทธุรกิจ</label>
              <input value={form.businessType} onChange={set('businessType')} />
            </div>

            <div style={{ fontWeight: 600, fontSize: 14, margin: '16px 0 8px', color: '#1e3a8a' }}>ผู้ประสานงาน</div>
            <div className="field">
              <label>ชื่อ-นามสกุล</label>
              <input value={form.coordName} onChange={set('coordName')} />
            </div>
            <div className="field">
              <label>เบอร์โทรศัพท์</label>
              <input value={form.coordPhone} onChange={set('coordPhone')} />
            </div>
            <div className="field">
              <label>อีเมลผู้ประสานงาน</label>
              <input value={form.coordEmail} onChange={set('coordEmail')} />
            </div>

            <p style={{ fontSize: 12, color: '#94a3b8', margin: '10px 0 0' }}>
              ข้อมูลกิจการเพิ่มเติมและบริการที่ต้องการ เลือกได้ภายหลังในระบบ
            </p>
          </>
        )}
        {roleType === 'agency' && (
          <>
            <div className="field">
              <label>ชื่อหน่วยงาน / ผู้ให้บริการ</label>
              <input value={form.orgName} onChange={set('orgName')} placeholder="เช่น ธนาคารกรุงไทย" />
            </div>
            <div className="field">
              <label>ชื่อ-นามสกุล ผู้ประสานงาน</label>
              <input value={form.coordName} onChange={set('coordName')} />
            </div>
          </>
        )}
        {roleType === 'expert' && (
          <>
            <div className="field">
              <label>สังกัด / หน่วยงาน (ถ้ามี)</label>
              <input value={form.orgName} onChange={set('orgName')} />
            </div>
            <div className="field">
              <label>ชื่อ-นามสกุล</label>
              <input value={form.coordName} onChange={set('coordName')} />
            </div>
          </>
        )}

        <div style={{ fontWeight: 600, fontSize: 14, margin: '16px 0 8px', color: '#1e3a8a' }}>บัญชีเข้าระบบ</div>
        <div className="field">
          <label>อีเมล (สำหรับเข้าระบบ)</label>
          <input type="email" value={form.email} onChange={set('email')} />
        </div>
        <div className="field">
          <label>รหัสผ่าน</label>
          <input type="password" value={form.password} onChange={set('password')} />
        </div>
        <button className="btn" onClick={onSubmit} disabled={loading}>
          {loading ? 'กำลังลงทะเบียน…' : 'ลงทะเบียน'}
        </button>
        <div className="link-row">
          มีบัญชีแล้ว? <Link href="/login">เข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  )
}
