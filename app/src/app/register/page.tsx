'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', companyName: '', smeOneId: '', province: '',
  })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value })

  async function onSubmit() {
    setErr(''); setOk(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    })
    if (error) { setLoading(false); setErr(error.message); return }

    // สร้าง sme_profile หลังจาก trigger สร้าง profiles ให้แล้ว
    const uid = data.user?.id
    if (uid) {
      await supabase.from('sme_profiles').insert({
        owner_id: uid,
        company_name: form.companyName,
        sme_one_id: form.smeOneId || null,
        province: form.province || null,
      })
    }
    setLoading(false)
    setOk('ลงทะเบียนสำเร็จ — หากระบบเปิดยืนยันอีเมล โปรดตรวจสอบกล่องจดหมาย จากนั้นเข้าสู่ระบบ')
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>ลงทะเบียน SME</h1>
        <p className="sub">กรอกข้อมูลเพื่อยื่นใบสมัคร (ขั้นตอนที่ 1)</p>
        {err && <div className="alert alert-err">{err}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}
        <div className="field">
          <label>ชื่อ-นามสกุล ผู้ติดต่อ</label>
          <input value={form.fullName} onChange={set('fullName')} />
        </div>
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
