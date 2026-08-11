'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function ChangePassword() {
  const supabase = createClient()

  // อีเมลปัจจุบัน
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // รหัสผ่าน
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentEmail(data.user?.email ?? '')
    })
  }, [])

  async function saveEmail() {
    setEmailMsg(null)
    const email = newEmail.trim()
    if (!email || !email.includes('@')) { setEmailMsg({ type: 'err', text: 'กรุณากรอกอีเมลให้ถูกต้อง' }); return }
    if (email === currentEmail) { setEmailMsg({ type: 'err', text: 'อีเมลใหม่ต้องต่างจากอีเมลเดิม' }); return }
    setEmailBusy(true)
    const { error } = await supabase.auth.updateUser({ email })
    setEmailBusy(false)
    if (error) { setEmailMsg({ type: 'err', text: 'เกิดข้อผิดพลาด: ' + error.message }); return }
    setEmailMsg({ type: 'ok', text: 'ส่งลิงก์ยืนยันไปที่อีเมลใหม่แล้ว กรุณาเปิดอีเมลเพื่อยืนยันการเปลี่ยนแปลง' })
    setNewEmail('')
  }

  async function savePassword() {
    setPwMsg(null)
    if (pw1.length < 6) { setPwMsg({ type: 'err', text: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' }); return }
    if (pw1 !== pw2) { setPwMsg({ type: 'err', text: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' }); return }
    setPwBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setPwBusy(false)
    if (error) { setPwMsg({ type: 'err', text: 'เกิดข้อผิดพลาด: ' + error.message }); return }
    setPwMsg({ type: 'ok', text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' })
    setPw1(''); setPw2('')
  }

  const fieldStyle = {
    width: '100%', padding: '8px 10px', fontSize: 14,
    borderRadius: 8, border: '1px solid #cbd5e1', marginTop: 4,
  } as const
  const labelStyle = { fontSize: 13, color: '#475569', fontWeight: 500 } as const
  const msgBox = (m: { type: 'ok' | 'err'; text: string }) => ({
    background: m.type === 'ok' ? '#dcfce7' : '#fee2e2',
    color: m.type === 'ok' ? '#166534' : '#991b1b',
    padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 14,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
      {/* เปลี่ยนอีเมล */}
      <div className="card">
        <h2>เปลี่ยนอีเมล</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: -4, marginBottom: 12 }}>
          อีเมลปัจจุบัน: <strong>{currentEmail || '—'}</strong>
        </p>
        {emailMsg && <div style={msgBox(emailMsg)}>{emailMsg.text}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>อีเมลใหม่</label>
            <input type="email" style={fieldStyle}
              value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <button className="btn" disabled={emailBusy} onClick={saveEmail}>
              {emailBusy ? 'กำลังส่ง…' : 'เปลี่ยนอีเมล'}
            </button>
          </div>
        </div>
      </div>

      {/* เปลี่ยนรหัสผ่าน */}
      <div className="card">
        <h2>เปลี่ยนรหัสผ่าน</h2>
        {pwMsg && <div style={msgBox(pwMsg)}>{pwMsg.text}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>รหัสผ่านใหม่</label>
            <input type={show ? 'text' : 'password'} style={fieldStyle}
              value={pw1} onChange={e => setPw1(e.target.value)} placeholder="อย่างน้อย 6 ตัวอักษร" />
          </div>
          <div>
            <label style={labelStyle}>ยืนยันรหัสผ่านใหม่</label>
            <input type={show ? 'text' : 'password'} style={fieldStyle}
              value={pw2} onChange={e => setPw2(e.target.value)} />
          </div>
          <label style={{ fontSize: 13, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />
            แสดงรหัสผ่าน
          </label>
          <div>
            <button className="btn" disabled={pwBusy} onClick={savePassword}>
              {pwBusy ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
