'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

export default function ChangePassword() {
  const supabase = createClient()
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function save() {
    setMsg(null)
    if (pw1.length < 6) { setMsg({ type: 'err', text: 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัวอักษร' }); return }
    if (pw1 !== pw2) { setMsg({ type: 'err', text: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' }); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw1 })
    setBusy(false)
    if (error) { setMsg({ type: 'err', text: 'เกิดข้อผิดพลาด: ' + error.message }); return }
    setMsg({ type: 'ok', text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว' })
    setPw1(''); setPw2('')
  }

  const fieldStyle = {
    width: '100%', padding: '8px 10px', fontSize: 14,
    borderRadius: 8, border: '1px solid #cbd5e1', marginTop: 4,
  } as const
  const labelStyle = { fontSize: 13, color: '#475569', fontWeight: 500 } as const

  return (
    <div className="card" style={{ maxWidth: 480, marginTop: 20 }}>
      <h2>เปลี่ยนรหัสผ่าน</h2>
      {msg && (
        <div style={{
          background: msg.type === 'ok' ? '#dcfce7' : '#fee2e2',
          color: msg.type === 'ok' ? '#166534' : '#991b1b',
          padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 14,
        }}>{msg.text}</div>
      )}
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
          <button className="btn" disabled={busy} onClick={save}>
            {busy ? 'กำลังบันทึก…' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </div>
      </div>
    </div>
  )
}
