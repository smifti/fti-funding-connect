'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const ROLE_LABEL: Record<string, string> = {
  agency: 'หน่วยงาน / ผู้ให้บริการ',
  expert: 'ที่ปรึกษา / ผู้เชี่ยวชาญ',
  sme: 'ผู้ประกอบการ SME',
}

type Pending = {
  id: string
  email: string
  full_name: string | null
  requested_role: string
  company_name: string | null
  created_at: string
}

export default function ApprovalManager({ initialPending }: { initialPending: Pending[] }) {
  const router = useRouter()
  const supabase = createClient()
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

  if (initialPending.length === 0) {
    return (
      <div className="card">
        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>
          ไม่มีผู้ใช้ที่รออนุมัติในขณะนี้
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      {msg && <div className="alert alert-ok">{msg}</div>}
      <table>
        <thead>
          <tr><th>ชื่อ / อีเมล</th><th>สมัครเป็น</th><th>หน่วยงาน</th><th>การจัดการ</th></tr>
        </thead>
        <tbody>
          {initialPending.map(p => (
            <tr key={p.id}>
              <td>
                {p.full_name || '—'}
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.email}</div>
              </td>
              <td>
                <span style={{
                  background: '#fef9c3', color: '#a16207', fontSize: 12,
                  padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap',
                }}>
                  {ROLE_LABEL[p.requested_role] || p.requested_role}
                </span>
              </td>
              <td>{p.company_name || '—'}</td>
              <td>
                <button
                  className="btn btn-sm"
                  disabled={working === p.id}
                  onClick={() => approve(p.id, p.full_name || p.email)}
                >
                  {working === p.id ? 'กำลังอนุมัติ…' : 'อนุมัติ'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
