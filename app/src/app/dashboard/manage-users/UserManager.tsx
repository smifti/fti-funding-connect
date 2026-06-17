'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const ROLE_OPTIONS: [string, string][] = [
  ['sme', 'ผู้ประกอบการ SME'],
  ['agency', 'หน่วยงานสนับสนุน'],
  ['expert', 'ที่ปรึกษา / ผู้เชี่ยวชาญ'],
  ['admin', 'ผู้ดูแลระบบ (ส.อ.ท.)'],
]

const CATEGORY_OPTIONS: [string, string][] = [
  ['credit', 'สินเชื่อ'],
  ['innovation', 'นวัตกรรม'],
  ['management', 'บริหารจัดการ'],
  ['marketing', 'การตลาด'],
  ['production', 'การผลิต'],
  ['upskill', 'Upskill / Reskill'],
  ['other', 'อื่น ๆ (ESG)'],
]

type User = {
  id: string
  email: string
  full_name: string | null
  role: string
  agency_name: string | null
  agency_categories: string[] | null
}

export default function UserManager({
  initialUsers, myId,
}: { initialUsers: User[]; myId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [role, setRole] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [cats, setCats] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(u: User) {
    setEditing(u.id)
    setRole(u.role)
    setAgencyName(u.agency_name ?? '')
    setCats(u.agency_categories ?? [])
    setMsg('')
  }

  function toggleCat(c: string) {
    setCats(cats.includes(c) ? cats.filter(x => x !== c) : [...cats, c])
  }

  async function save(userId: string) {
    setSaving(true); setMsg('')
    const { error } = await supabase.rpc('admin_update_role', {
      target_user_id: userId,
      new_role: role,
      new_agency_name: role === 'agency' ? agencyName : null,
      new_agency_categories: role === 'agency' ? cats : null,
    })
    setSaving(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setEditing(null)
    router.refresh()
  }

  const roleLabel = (r: string) =>
    ROLE_OPTIONS.find(([v]) => v === r)?.[1] ?? r

  return (
    <div className="card">
      {msg && <div className="alert alert-err">{msg}</div>}
      <table>
        <thead>
          <tr><th>ชื่อ / อีเมล</th><th>บทบาทปัจจุบัน</th><th>การจัดการ</th></tr>
        </thead>
        <tbody>
          {initialUsers.map(u => (
            <tr key={u.id}>
              <td>
                {u.full_name || '—'}
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
              </td>
              <td>
                {roleLabel(u.role)}
                {u.role === 'agency' && u.agency_categories && u.agency_categories.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {u.agency_name} · {u.agency_categories.map(c =>
                      CATEGORY_OPTIONS.find(([v]) => v === c)?.[1]).join(', ')}
                  </div>
                )}
              </td>
              <td>
                {editing === u.id ? (
                  <div style={{ minWidth: 280 }}>
                    <select value={role} onChange={e => setRole(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 8 }}>
                      {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>

                    {role === 'agency' && (
                      <>
                        <input value={agencyName} onChange={e => setAgencyName(e.target.value)}
                          placeholder="ชื่อหน่วยงาน เช่น SME D Bank"
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 8 }} />
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>เลือกด้านที่รับผิดชอบ:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                          {CATEGORY_OPTIONS.map(([v, l]) => (
                            <button key={v} type="button"
                              className={`cat-chip ${cats.includes(v) ? 'active' : ''}`}
                              onClick={() => toggleCat(v)}>{l}</button>
                          ))}
                        </div>
                      </>
                    )}

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm" disabled={saving} onClick={() => save(u.id)}>
                        {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>ยกเลิก</button>
                    </div>
                  </div>
                ) : (
                  u.id === myId ? (
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>บัญชีของคุณ</span>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(u)}>
                      เปลี่ยนสิทธิ์
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
