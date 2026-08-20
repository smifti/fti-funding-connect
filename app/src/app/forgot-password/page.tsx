'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState('')

  async function onSubmit() {
    if (!email.trim()) { setErr('กรุณากรอกอีเมล'); return }
    setErr(''); setLoading(true)
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    // ไม่บอกความแตกต่างระหว่าง "ไม่มีอีเมลนี้ในระบบ" กับ "ส่งสำเร็จ" เพื่อความปลอดภัย
    // (ป้องกันคนใช้ฟอร์มนี้ไล่เช็คว่าอีเมลไหนมีบัญชีอยู่ในระบบบ้าง)
    setSent(true)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>ลืมรหัสผ่าน</h1>
        <p className="sub">กรอกอีเมลที่ใช้สมัครสมาชิก ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้ทางอีเมล</p>

        {sent ? (
          <div className="alert alert-ok">
            หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้แล้ว
            กรุณาตรวจสอบกล่องข้อความ (รวมถึงโฟลเดอร์ Junk/Spam)
          </div>
        ) : (
          <>
            {err && <div className="alert alert-err">{err}</div>}
            <div className="field">
              <label>อีเมล</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && onSubmit()} placeholder="you@example.com" />
            </div>
            <button className="btn" onClick={onSubmit} disabled={loading}>
              {loading ? 'กำลังส่ง…' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
            </button>
          </>
        )}

        <div className="link-row">
          <Link href="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
        </div>
      </div>
    </div>
  )
}
