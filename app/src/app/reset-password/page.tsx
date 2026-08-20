'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(!!data.user)
      setChecking(false)
    })
  }, [])

  async function onSubmit() {
    setErr('')
    if (password.length < 6) { setErr('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return }
    if (password !== password2) { setErr('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setLoading(false)
      setErr('ตั้งรหัสผ่านใหม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      return
    }
    await supabase.auth.signOut()
    router.push('/login?reset=1')
  }

  if (checking) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <p className="sub">กำลังตรวจสอบลิงก์…</p>
        </div>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว</h1>
          <p className="sub">ลิงก์รีเซ็ตรหัสผ่านใช้ได้ครั้งเดียวและมีอายุจำกัด กรุณาขอลิงก์ใหม่อีกครั้ง</p>
          <Link href="/forgot-password"><button className="btn">ขอลิงก์ใหม่</button></Link>
          <div className="link-row">
            <Link href="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>ตั้งรหัสผ่านใหม่</h1>
        <p className="sub">กรอกรหัสผ่านใหม่ที่ต้องการใช้เข้าสู่ระบบ</p>
        {err && <div className="alert alert-err">{err}</div>}
        <div className="field">
          <label>รหัสผ่านใหม่</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
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
        <div className="field">
          <label>ยืนยันรหัสผ่านใหม่</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSubmit()}
            placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
          />
        </div>
        <button className="btn" onClick={onSubmit} disabled={loading}>
          {loading ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}
        </button>
      </div>
    </div>
  )
}
