'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  async function onSubmit() {
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setErr('เข้าสู่ระบบไม่สำเร็จ — ตรวจสอบอีเมลและรหัสผ่าน'); return }
    router.push('/dashboard')
    router.refresh()
  }
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>FTI SME Funding Connect</h1>
        <p className="sub">แพลตฟอร์มเชื่อมโยง SME ผู้ให้บริการ และที่ปรึกษา เพื่อการสนับสนุนธุรกิจ</p>
        {err && <div className="alert alert-err">{err}</div>}
        <div className="field">
          <label>อีเมล</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && onSubmit()} placeholder="you@example.com" />
        </div>
       <div className="field">
          <label>รหัสผ่าน</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSubmit()}
              placeholder="••••••••"
              style={{ width: '100%', paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4,
                color: '#64748b', lineHeight: 1,
              }}
              title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>
              {showPassword ? '🙈' : '👁'}
            </button>
          </div>
        </div>
        <button className="btn" onClick={onSubmit} disabled={loading}>
          {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
        </button>
        <div className="link-row">
          ยังไม่มีบัญชี? <Link href="/register">ลงทะเบียนใช้งาน</Link>
        </div>
      </div>
    </div>
  )
}
