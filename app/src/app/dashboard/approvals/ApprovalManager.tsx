'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const ROLE_LABEL: Record<string, string> = {
  agency: 'หน่วยงาน / ผู้ให้บริการ',
  expert: 'ที่ปรึกษา / ผู้เชี่ยวชาญ',
  sme: 'ผู้ประกอบการ SME',
}
const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ', innovation: 'นวัตกรรม', management: 'บริหารจัดการ',
  marketing: 'การตลาด', production: 'การผลิต', upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}
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

export default function ApprovalManager({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'agency' | 'expert'>('agency')
  const [msg, setMsg] = useState('')
  const [working, setWorking] = useState<string | null>(null)

  async function approve(userId: string, name: string) {
    setWorking(userId); setMsg('')
    const { error } = await supabase.rpc('admin_approve_user', { target_user_id: userId })
    setWorking(null)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setMsg(`อนุมัติ ${name} เรียบร้อยแล้ว`)
    router.refresh()
  }

  // เป็นผู้ให้บริการ/ที่ปรึกษา (ทั้งที่อนุมัติแล้ว และรออนุมัติ)
  // รออนุมัติ = approval_status === 'pending' (ยังไม่ได้ role จริง แต่ requested_role บอกว่าขออะไร)
  function belongsTo(u: User, target: 'agency' | 'expert'): boolean {
    // ถ้าอนุมัติแล้ว: ดูจาก role จริง
    if (u.role === target) return true
    // ถ้ายังรออนุมัติ: ดูจาก requested_role
    if (u.approval_status === 'pending' && u.requested_role === target) return true
    return false
  }

  const list = initialUsers.filter(u => belongsTo(u, tab))
  const pendingList = list.filter(u => u.approval_status === 'pending')
  const approvedList = list.filter(u => u.approval_status !== 'pending')

  // นับจำนวนรออนุมัติแต่ละกลุ่ม (สำหรับ badge)
  const pendingAgency = initialUsers.filter(u => u.approval_status === 'pending' && u.requested_role === 'agency').length
  const pendingExpert = initialUsers.filter(u => u.approval_status === 'pending' && u.requested_role === 'expert').length

  const tabStyle = (active: boolean) => ({
    border: 'none', background: 'none', cursor: 'pointer',
    padding: '10px 8px', fontSize: 15, whiteSpace: 'nowrap' as const,
    fontWeight: active ? 600 : 400,
    color: active ? '#1e3a8a' : '#64748b',
    borderBottom: active ? '2px solid #1e3a8a' : '2px solid transparent',
    display: 'flex', alignItems: 'center', gap: 6,
  })
  const redBadge = (n: number) => (
    <span style={{ background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700,
      minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
  )

  function renderRow(u: User, isPending: boolean) {
    return (
      <tr key={u.id}>
        <td>{u.full_name || '—'}
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
        </td>
        <td>{u.agency_name || '—'}
          {u.role === 'agency' && u.agency_categories && u.agency_categories.length > 0 && (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {u.agency_categories.map(c => CATEGORY_LABELS[c] ?? c).join(', ')}
            </div>
          )}
        </td>
        <td>
          {isPending ? (
            <span style={{ background: '#fef9c3', color: '#a16207', fontSize: 12,
              padding: '3px 10px', borderRadius: 10, fontWeight: 600 }}>รออนุมัติ</span>
          ) : (
            <span style={{ background: '#dcfce7', color: '#166534', fontSize: 12,
              padding: '3px 10px', borderRadius: 10, fontWeight: 600 }}>อนุมัติแล้ว</span>
          )}
        </td>
        <td>
          {isPending ? (
            <button className="btn btn-sm" disabled={working === u.id}
              onClick={() => approve(u.id, u.full_name || u.email)}>
              {working === u.id ? 'กำลังอนุมัติ…' : '✓ อนุมัติ'}
            </button>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>—</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div>
      {msg && <div className="alert alert-ok" style={{ marginBottom: 12 }}>{msg}</div>}

      {/* แท็บ ผู้ให้บริการ / ที่ปรึกษา */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => setTab('agency')} style={tabStyle(tab === 'agency')}>
          ผู้ให้บริการ {pendingAgency > 0 && redBadge(pendingAgency)}
        </button>
        <button onClick={() => setTab('expert')} style={tabStyle(tab === 'expert')}>
          ที่ปรึกษา {pendingExpert > 0 && redBadge(pendingExpert)}
        </button>
      </div>

      {/* รออนุมัติ */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>รออนุมัติ ({pendingList.length})</h2>
        {pendingList.length === 0 ? (
          <p className="empty">ไม่มีผู้ใช้ที่รออนุมัติในกลุ่มนี้</p>
        ) : (
          <table>
            <thead>
              <tr><th>ชื่อ / อีเมล</th><th>หน่วยงาน / ด้าน</th><th>สถานะ</th><th>การจัดการ</th></tr>
            </thead>
            <tbody>{pendingList.map(u => renderRow(u, true))}</tbody>
          </table>
        )}
      </div>

      {/* อนุมัติแล้ว */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>อนุมัติแล้ว ({approvedList.length})</h2>
        {approvedList.length === 0 ? (
          <p className="empty">ยังไม่มีผู้ใช้ที่อนุมัติในกลุ่มนี้</p>
        ) : (
          <table>
            <thead>
              <tr><th>ชื่อ / อีเมล</th><th>หน่วยงาน / ด้าน</th><th>สถานะ</th><th>การจัดการ</th></tr>
            </thead>
            <tbody>{approvedList.map(u => renderRow(u, false))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}
