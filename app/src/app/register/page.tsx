'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

type RoleType = 'sme' | 'agency' | 'expert'

const SERVICE_OPTIONS = ['สินเชื่อ', 'ทุนนวัตกรรม', 'ทุนดิจิทัล', 'โครงการพัฒนาธุรกิจ']

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [roleType, setRoleType] = useState<RoleType>('sme')
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    taxId: '', companyName: '', ownerName: '', province: '', businessType: '',
    coordPhone: '', coordEmail: '',
    orgName: '',
  })
  const [services, setServices] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })
  const roleDesc = roleType === 'sme' ? 'ยื่นคำขอรับการสนับสนุน'
    : roleType === 'agency' ? 'ธนาคาร, NIA, depa ฯลฯ (รอ ส.อ.ท. อนุมัติ)'
    : 'คัดกรองคำขอ (รอ ส.อ.ท. อนุมัติ)'

  function toggleService(s: string) {
    setServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function onSubmit() {
    setErr(''); setOk(''); setLoading(true)
    const companyName = roleType === 'sme' ? form.companyName : form.orgName

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          requested_role: roleType,
          company_name: companyName,
          sme_one_id: form.taxId,
          province: form.province,
          owner_name: form.ownerName,
          business_type: form.businessType,
          coordinator_phone: form.coordPhone,
          coordinator_email: form.coordEmail,
          services_wanted: services.join(','),
        },
      },
    })
    if (error) { setLoading(false); setErr(error.message); return }

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

        <div className="field">
          <label>ชื่อ-นามสกุล ผู้ติดต่อ</label>
          <input value={form.fullName} onChange={set('fullName')} />
        </div>

        {roleType === 'sme' && (
          <>
            <div style={{ fontWeight: 600, fontSize: 14, margin: '16px 0 8px', color: '#1e3a8a' }}>ข้อมูลกิจการ</div>
            <div className="field">
              <label>เลขนิติบุคคล / เลขผู้เสียภาษี</label>
              <input value={form.taxId} onChange={set('taxId')} />
            </div>
            <div className="field">
              <label>ชื่อบริษัท / กิจการ</label>
              <input value={form.companyName} onChange={set('companyName')} />
            </div>
            <div className="field">
              <label>ชื่อ-นามสกุล เจ้าของ / ผู้มีอำนาจ</label>
              <input value={form.ownerName} onChange={set('ownerName')} />
            </div>
            <div className="field">
              <label>จังหวัด</label>
              <input value={form.province} onChange={set('province')} />
            </div>
            <div className="field">
              <label>ประเภทธุรกิจ</label>
              <input value={form.businessType} onChange={set('businessType')} />
            </div>

            <div style={{ fontWeight: 600, fontSize: 14, margin: '16px 0 8px', color: '#1e3a8a' }}>ผู้ประสานงาน</div>
            <div className="field">
              <label>เบอร์โทรศัพท์</label>
              <input value={form.coordPhone} onChange={set('coordPhone')} />
            </div>
            <div className="field">
              <label>อีเมลผู้ประสานงาน</label>
              <input value={form.coordEmail} onChange={set('coordEmail')} />
            </div>

            <div style={{ fontWeight: 600, fontSize: 14, margin: '16px 0 8px', color: '#1e3a8a' }}>บริการที่ต้องการ</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {SERVICE_OPTIONS.map(s => (
                <button key={s} type="button" onClick={() => toggleService(s)}
                  style={{
                    border: services.includes(s) ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                    background: services.includes(s) ? '#eef2ff' : '#fff',
                    color: '#1e293b', borderRadius: 20, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
                  }}>
                  {services.includes(s) ? '✓ ' : ''}{s}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 12, color: '#94a3b8', margin: '10px 0 0' }}>
              ข้อมูลกิจการเพิ่มเติม (ที่ตั้ง แบรนด์ มาตรฐาน รางวัล ประวัติส่งออก ฯลฯ) กรอกได้ภายหลังในหน้าโปรไฟล์
            </p>
          </>
        )}
        {roleType === 'agency' && (
          <div className="field">
            <label>ชื่อหน่วยงาน / ผู้ให้บริการ</label>
            <input value={form.orgName} onChange={set('orgName')} placeholder="เช่น ธนาคารกรุงไทย" />
          </div>
        )}
        {roleType === 'expert' && (
          <div className="field">
            <label>สังกัด / หน่วยงาน (ถ้ามี)</label>
            <input value={form.orgName} onChange={set('orgName')} />
          </div>
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
