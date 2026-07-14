'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

type RoleType = 'sme' | 'agency' | 'expert'

const ROLE_OPTIONS: { value: RoleType; label: string; desc: string }[] = [
  { value: 'sme', label: 'ผู้ประกอบการ SME', desc: 'ยื่นคำขอรับการสนับสนุน' },
  { value: 'agency', label: 'หน่วยงาน / ผู้ให้บริการ', desc: 'ธนาคาร, NIA, depa ฯลฯ (รอ ส.อ.ท. อนุมัติ)' },
  { value: 'expert', label: 'ที่ปรึกษา / ผู้เชี่ยวชาญ', desc: 'คัดกรองคำขอ (รอ ส.อ.ท. อนุมัติ)' },
]

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [roleType, setRoleType] = useState<RoleType>('sme')
  const [form, setForm] = useState({
    fullName: '', email: '', password: '',
    companyName: '', smeOneId: '', province: '', orgName: '',
  })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })

  async function onSubmit() {
    setErr(''); setOk(''); setLoading(true)

    // ชื่อกิจการ: SME ใช้ companyName, หน่วยงานใช้ orgName
    const companyName = roleType === 'sme' ? form.companyName : form.orgName

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          requested_role: roleType,
          company_name: companyName,
          sme_one_id: form.smeOneId,
          province: form.province,
        },
      },
    })
    if (error) { setLoading(false); setErr(error.message); return }

    setLoading(false)
    if (roleType === 'sme') {
      setOk('ลงทะเบียนสำเร็จ — กำลังพาไปหน้าเข้าสู่ระบบ')
    } else {
      setOk('ลงทะเบียนสำเร็จ — บัญชีของท่านอยู่ระหว่างรอ ส.อ.ท. อนุมัติสิทธิ์ ท่านจะเข้าใช้งานได้เมื่อได้รับการอนุมัติ')
    }
    setTimeout(() => router.push('/login'), 2600)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>ลงทะเบียน</h1>
        <p className="sub">เลือกประเภทผู้ใช้ แล้วกรอกข้อมูลเพื่อสมัคร</p>
        {err && <div className="alert alert-err">{err}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        {/* เลือกประเภทผู้ใช้ */}
        <div className="field">
          <label>ประเภทผู้ใช้</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {ROLE_OPTIONS.map(opt => (
              <div
                key={opt.value}
                onClick={() => setRoleType(opt.value)}
                style={{
                  border: roleType === opt.value ? '2px solid #1e3a8a' : '1px solid #cbd5e1',
                  background: roleType === opt.value ? '#eef2ff' : '#fff',
                  borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{opt.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <label>ชื่อ-นามสกุล ผู้ติดต่อ</label>
          <input value={form.fullName} onChange={set('fullName')} />
        </div>

        {/* ช่องที่ปรับตามประเภท */}
        {roleType === 'sme' && (
          <>
            <div className="field">
              <label>ชื่อกิจการ</label>
              <input value={form.companyName} onChange={set('companyName')} />
            </div>
            <div className="field">
              <label>SME ONE ID (ถ้ามี)</label>
              <input value={form.smeOneId} onChange={set('smeOneId')} />
            </div>
            <div className="field">
              <label>จังหวัด</label>
              <input value={form.province} onChange={set('province')} />
            </div>
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

        <div className="field">
          <label>อีเมล</label>
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
