'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

// Timeline 5 สถานะ
const STATUS_LABELS: Record<string, { text: string; bg: string; color: string }> = {
  submitted: { text: 'ยื่นสมัคร', bg: '#dbeafe', color: '#1e40af' },
  screening: { text: 'พิจารณาคุณสมบัติ', bg: '#fef9c3', color: '#a16207' },
  in_progress: { text: 'อยู่ระหว่างดำเนินการ', bg: '#e0e7ff', color: '#3730a3' },
  completed: { text: 'ดำเนินการเสร็จสิ้น', bg: '#dcfce7', color: '#166534' },
  rejected: { text: 'ไม่ผ่าน', bg: '#fee2e2', color: '#991b1b' },
}

// ปุ่มที่กดได้ในแต่ละสถานะ
const NEXT_ACTIONS: Record<string, { to: string; label: string; danger?: boolean }[]> = {
  submitted: [{ to: 'screening', label: 'เริ่มพิจารณาคุณสมบัติ' }],
  screening: [
    { to: 'in_progress', label: 'ผ่าน → เริ่มดำเนินการ' },
    { to: 'rejected', label: 'ไม่ผ่าน', danger: true },
  ],
  in_progress: [
    { to: 'completed', label: 'เสร็จสิ้น' },
    { to: 'rejected', label: 'ไม่ผ่าน', danger: true },
  ],
  completed: [],
  rejected: [],
}

type App = {
  id: string
  status: string
  status_note: string | null
  created_at: string
  packages: { title: string; category: string } | null
  sme_profiles: { company_name: string | null; province: string | null; sme_one_id: string | null } | null
}

export default function AgencyApplicants({ initial }: { initial: App[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [noteFor, setNoteFor] = useState<{ id: string; to: string } | null>(null)
  const [noteText, setNoteText] = useState('')

  async function doChange(id: string, to: string, note: string | null) {
    setBusy(id); setMsg('')
    const { error } = await supabase
      .from('package_applications')
      .update({ status: to, status_note: note, updated_at: new Date().toISOString() })
      .eq('id', id)
    setBusy(null)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setNoteFor(null); setNoteText('')
    router.refresh()
  }

  function handleAction(id: string, to: string) {
    if (to === 'rejected') { setNoteFor({ id, to }); setNoteText(''); setMsg('') ; return }
    doChange(id, to, null)
  }

  if (initial.length === 0) {
    return (
      <div className="card">
        <h2>ผู้สมัครแพ็กเกจ</h2>
        <p className="empty">ยังไม่มี SME สมัครแพ็กเกจของท่าน</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>ผู้สมัครแพ็กเกจ ({initial.length})</h2>
      {msg && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px',
          borderRadius: 8, margin: '12px 0', fontSize: 14 }}>{msg}</div>
      )}
      <table style={{ marginTop: 12 }}>
        <thead>
          <tr><th>กิจการ</th><th>แพ็กเกจ</th><th>สถานะ</th><th>การดำเนินการ</th></tr>
        </thead>
        <tbody>
          {initial.map(a => {
            const st = STATUS_LABELS[a.status] ?? STATUS_LABELS.submitted
            const actions = NEXT_ACTIONS[a.status] ?? []
            const isEditingNote = noteFor?.id === a.id
            return (
              <tr key={a.id}>
                <td>
                  {a.sme_profiles?.company_name ?? '—'}
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {a.sme_profiles?.province} {a.sme_profiles?.sme_one_id ? `· ${a.sme_profiles.sme_one_id}` : ''}
                  </div>
                </td>
                <td style={{ fontSize: 13 }}>{a.packages?.title ?? '—'}</td>
                <td>
                  <span style={{ background: st.bg, color: st.color, fontSize: 12,
                    padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap' }}>
                    {st.text}
                  </span>
                  {a.status === 'rejected' && a.status_note && (
                    <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4, maxWidth: 200 }}>
                      เหตุผล: {a.status_note}
                    </div>
                  )}
                </td>
                <td>
                  {isEditingNote ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220 }}>
                      <textarea autoFocus rows={2}
                        placeholder="เหตุผลที่ไม่ผ่าน (SME จะเห็น)"
                        value={noteText} onChange={e => setNoteText(e.target.value)}
                        style={{ width: '100%', fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm" disabled={busy === a.id || !noteText.trim()}
                          onClick={() => doChange(noteFor!.id, noteFor!.to, noteText.trim())}>
                          {busy === a.id ? '…' : 'ยืนยันไม่ผ่าน'}
                        </button>
                        <button className="btn btn-sm btn-ghost" disabled={busy === a.id}
                          onClick={() => { setNoteFor(null); setNoteText('') }}>ยกเลิก</button>
                      </div>
                    </div>
                  ) : actions.length === 0 ? (
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>—</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {actions.map(act => (
                        <button key={act.to}
                          className={`btn btn-sm ${act.danger ? 'btn-ghost' : ''}`}
                          disabled={busy === a.id}
                          onClick={() => handleAction(a.id, act.to)}
                          style={act.danger ? { color: '#dc2626' } : {}}>
                          {busy === a.id ? '…' : act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
