'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const justConfirmed = searchParams.get('confirmed') === '1'
  const confirmError = searchParams.get('confirm_error') === '1'
  const justReset = searchParams.get('reset') === '1'

  async function onSubmit() {
    setErr(''); setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setLoading(false)
      setErr('เข้าสู่ระบบไม่สำเร็จ — ตรวจสอบอีเมลและรหัสผ่าน')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, approval_confirmed_at')
      .eq('id', data.user.id)
      .single()

    if (profile && (profile.role === 'agency' || profile.role === 'expert' || profile.role === 'sme') && !profile.approval_confirmed_at) {
      await supabase.auth.signOut()
      setLoading(false)
      setErr('บัญชีของท่านได้รับการอนุมัติแล้ว แต่ยังไม่ได้ยืนยันตัวตน กรุณาตรวจสอบอีเมลที่ระบบส่งให้และกดยืนยันก่อนเข้าสู่ระบบ')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>FTI SME Funding Connect</h1>
        <p className="sub">แพลตฟอร์มเชื่อมโยง SME ผู้ให้บริการ และที่ปรึกษา เพื่อการสนับสนุนธุรกิจ</p>
        {justConfirmed && (
          <div className="alert alert-ok">ยืนยันตัวตนสำเร็จ กรุณาเข้าสู่ระบบ</div>
        )}
        {justReset && (
          <div className="alert alert-ok">ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่</div>
        )}
        {confirmError && (
          <div className="alert alert-err">ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุแล้ว กรุณาติดต่อผู้ดูแลระบบ</div>
        )}
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
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <Link href="/forgot-password" style={{ fontSize: 13 }}>ลืมรหัสผ่าน?</Link>
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
