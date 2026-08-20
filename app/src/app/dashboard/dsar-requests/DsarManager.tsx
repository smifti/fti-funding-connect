'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

type Row = {
  id: string
  request_type: string
  details: string | null
  status: string
  resolution_note: string | null
  created_at: string
  resolved_at: string | null
  user_id: string
  user_full_name: string
  user_email: string
  user_role: string
}

const REQUEST_TYPE_LABEL: Record<string, string> = {
  access: 'ขอเข้าถึง/ขอรับสำเนาข้อมูล',
  rectify: 'ขอแก้ไขข้อมูลให้ถูกต้อง',
  delete: 'ขอให้ลบ/ทำลายข้อมูล',
  restrict: 'ขอให้ระงับการใช้ข้อมูล',
  object: 'คัดค้านการประมวลผลข้อมูล',
  portability: 'ขอรับ/โอนย้ายข้อมูล',
  withdraw_consent: 'ถอนความยินยอม',
}
const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: 'รอดำเนินการ', bg: '#fef3c7', color: '#92400e' },
  in_progress: { label: 'กำลังดำเนินการ', bg: '#dbeafe', color: '#1e40af' },
  completed: { label: 'เสร็จสิ้น', bg: '#dcfce7', color: '#166534' },
  rejected: { label: 'ปฏิเสธคำขอ', bg: '#fee2e2', color: '#991b1b' },
}
const ROLE_LABEL: Record<string, string> = {
  sme: 'SME', agency: 'หน่วยงาน', expert: 'ที่ปรึกษา', admin: 'แอดมิน',
}

function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function DsarManager({ initial }: { initial: Row[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'rejected'>('pending')
  const [editing, setEditing] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const shown = filter === 'all' ? initial : initial.filter(r => r.status === filter)

  async function resolve(id: string, status: string) {
    setBusy(id); setMsg('')
    const { error } = await supabase.rpc('admin_resolve_dsar_request', {
      p_request_id: id, p_status: status, p_resolution_note: note.trim() || null,
    })
    setBusy(null)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setEditing(null); setNote('')
    router.refresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['pending', 'in_progress', 'completed', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', fontSize: 13, borderRadius: 20, cursor: 'pointer',
              border: `1px solid ${filter === f ? '#1e3a8a' : '#cbd5e1'}`,
              background: filter === f ? '#1e3a8a' : '#fff',
              color: filter === f ? '#fff' : '#475569',
            }}>
            {f === 'all' ? 'ทั้งหมด' : STATUS_LABEL[f].label}
            {' '}({f === 'all' ? initial.length : initial.filter(r => r.status === f).length})
          </button>
        ))}
      </div>

      {msg && <div className="alert alert-err">{msg}</div>}

      {shown.length === 0 ? (
        <p className="empty">ไม่มีคำขอในสถานะนี้</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(r => {
            const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending
            return (
              <div key={r.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <strong>{REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type}</strong>
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                      {r.user_full_name} ({ROLE_LABEL[r.user_role] ?? r.user_role}) · {r.user_email}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                      ยื่นเมื่อ {formatDate(r.created_at)}
                    </div>
                  </div>
                  <span style={{ background: st.bg, color: st.color, fontSize: 12, fontWeight: 600,
                    borderRadius: 12, padding: '3px 12px', whiteSpace: 'nowrap' }}>{st.label}</span>
                </div>

                {r.details && (
                  <div style={{ background: '#f8fafc', borderRadius: 6, padding: 10, marginTop: 10, fontSize: 13 }}>
                    {r.details}
                  </div>
                )}

                {r.resolution_note && (
                  <div style={{ background: '#f0fdf4', borderRadius: 6, padding: 10, marginTop: 8, fontSize: 13 }}>
                    <strong>ผลการดำเนินการ:</strong> {r.resolution_note}
                    {r.resolved_at && <span style={{ color: '#94a3b8' }}> ({formatDate(r.resolved_at)})</span>}
                  </div>
                )}

                {editing === r.id ? (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                      placeholder="บันทึกผลการดำเนินการ (จะแสดงให้ผู้ยื่นคำขอเห็น)" />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn btn-sm" disabled={busy === r.id} onClick={() => resolve(r.id, 'in_progress')}>
                        🔵 กำลังดำเนินการ
                      </button>
                      <button className="btn btn-sm" disabled={busy === r.id} onClick={() => resolve(r.id, 'completed')}>
                        🟢 เสร็จสิ้น
                      </button>
                      <button className="btn btn-sm" disabled={busy === r.id}
                        style={{ background: '#dc2626' }} onClick={() => resolve(r.id, 'rejected')}>
                        🔴 ปฏิเสธคำขอ
                      </button>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setEditing(null); setNote('') }}>ปิด</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-sm btn-ghost" style={{ marginTop: 10 }}
                    onClick={() => { setEditing(r.id); setNote(r.resolution_note ?? '') }}>
                    จัดการคำขอนี้
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
