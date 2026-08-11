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
  approval_status: string | null
  requested_role: string | null
}
const roleLabel = (r: string) => ROLE_OPTIONS.find(([v]) => v === r)?.[1] ?? r

export default function UserManager({
  initialUsers, myId,
}: { initialUsers: User[]; myId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'all' | 'sme' | 'agency' | 'expert' | 'admin'>('all')
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

  const countByRole = (r: string) => initialUsers.filter(u => u.role === r).length

  let shown = initialUsers
  if (tab === 'sme') shown = initialUsers.filter(u => u.role === 'sme')
  else if (tab === 'agency') shown = initialUsers.filter(u => u.role === 'agency')
  else if (tab === 'expert') shown = initialUsers.filter(u => u.role === 'expert')
  else if (tab === 'admin') shown = initialUsers.filter(u => u.role === 'admin')

  const tabStyle = (active: boolean) => ({
    border: 'none', background: 'none', cursor: 'pointer',
    padding: '10px 6px', fontSize: 14, whiteSpace: 'nowrap' as const,
    fontWeight: active ? 600 : 400,
    color: active ? '#1e3a8a' : '#64748b',
    borderBottom: active ? '2px solid #1e3a8a' : '2px solid transparent',
  })

  return (
    <div>
      {msg && <div className="alert alert-err" style={{ marginBottom: 12 }}>{msg}</div>}

      {/* แท็บแยกตามบทบาท */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('all')} style={tabStyle(tab === 'all')}>
          ทั้งหมด ({initialUsers.length})
        </button>
        <button onClick={() => setTab('sme')} style={tabStyle(tab === 'sme')}>
          SME ({countByRole('sme')})
        </button>
        <button onClick={() => setTab('agency')} style={tabStyle(tab === 'agency')}>
          หน่วยงาน ({countByRole('agency')})
        </button>
        <button onClick={() => setTab('expert')} style={tabStyle(tab === 'expert')}>
          ที่ปรึกษา ({countByRole('expert')})
        </button>
        <button onClick={() => setTab('admin')} style={tabStyle(tab === 'admin')}>
          ผู้ดูแล ({countByRole('admin')})
        </button>
      </div>

      <div className="card">
        {shown.length === 0 ? (
          <p className="empty">ไม่มีผู้ใช้ในกลุ่มนี้</p>
        ) : (
          <table>
            <thead>
              <tr><th>ชื่อ / อีเมล</th><th>บทบาทปัจจุบัน</th><th>การจัดการ</th></tr>
            </thead>
            <tbody>
              {shown.map(u => (
                <tr key={u.id}>
                  <td>
                    {u.full_name || '—'}
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
                  </td>
                  <td>
                    {roleLabel(u.role)}
                    {u.approval_status === 'pending' && (
                      <span style={{ marginLeft: 6, background: '#fef9c3', color: '#a16207', fontSize: 11,
                        padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>รออนุมัติ</span>
                    )}
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
        )}
      </div>
    </div>
  )
}
