'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ', innovation: 'นวัตกรรม', management: 'บริหารจัดการ',
  marketing: 'การตลาด', production: 'การผลิต', upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}
const STATUS_LABELS: Record<string, string> = {
  submitted: 'ยื่นแล้ว', screening: 'กำลังคัดกรอง', forwarded: 'ส่งต่อหน่วยงาน',
  in_review: 'หน่วยงานพิจารณา', approved: 'สำเร็จ', rejected: 'ไม่ผ่าน',
}
type Req = {
  id: string
  category: string
  status: string
  detail: string | null
  company_name: string | null
}
const NEXT_ACTIONS: Record<string, { to: string; label: string; primary?: boolean }[]> = {
  submitted: [{ to: 'screening', label: 'เริ่มคัดกรอง', primary: true }],
  screening: [
    { to: 'forwarded', label: 'ส่งต่อหน่วยงาน', primary: true },
    { to: 'rejected', label: 'ไม่ผ่าน' },
  ],
  forwarded: [{ to: 'in_review', label: 'รับเรื่อง', primary: true }],
  in_review: [
    { to: 'approved', label: 'อนุมัติ', primary: true },
    { to: 'rejected', label: 'ไม่ผ่าน' },
  ],
  approved: [],
  rejected: [{ to: 'submitted', label: 'เปิดใหม่' }],
}
// สถานะที่ต้องกรอกเหตุผลก่อนเปลี่ยน
const REQUIRE_NOTE = ['rejected']
export default function AdminRequestManager({ initial }: { initial: Req[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  // เก็บสถานะการกรอกเหตุผล: คำขอไหน กำลังจะเปลี่ยนเป็นอะไร
  const [noteFor, setNoteFor] = useState<{ id: string; to: string } | null>(null)
  const [noteText, setNoteText] = useState('')

  async function doChange(id: string, to: string, note: string | null) {
    setBusy(id); setMsg('')
    // ถ้ามีเหตุผล ให้ส่งไปเก็บในฐานข้อมูลก่อน (trigger จะหยิบไปใส่ note)
    if (note && note.trim()) {
      const { error: noteErr } = await supabase.rpc('set_status_note', { p_note: note.trim() })
      if (noteErr) { setBusy(null); setMsg('เกิดข้อผิดพลาด: ' + noteErr.message); return }
    }
    const { error } = await supabase
      .from('funding_requests')
      .update({ status: to })
      .eq('id', id)
    setBusy(null)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setNoteFor(null); setNoteText('')
    router.refresh()
  }

  function handleAction(id: string, to: string) {
    // ถ้าสถานะปลายทางต้องกรอกเหตุผล → เปิดช่องกรอก
    if (REQUIRE_NOTE.includes(to)) {
      setNoteFor({ id, to }); setNoteText(''); setMsg('')
      return
    }
    doChange(id, to, null)
  }

  if (initial.length === 0) {
    return <p className="empty">ยังไม่มีคำขอในระบบ</p>
  }
  return (
    <div>
      {msg && <div className="alert alert-err">{msg}</div>}
      <table>
        <thead>
          <tr><th>กิจการ</th><th>ด้าน</th><th>สถานะ</th><th>การดำเนินการ</th></tr>
        </thead>
        <tbody>
          {initial.map(r => {
            const actions = NEXT_ACTIONS[r.status] ?? []
            const isEditingNote = noteFor?.id === r.id
            return (
              <tr key={r.id}>
                <td>
                  {r.company_name || '—'}
                  {r.detail && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 220 }}>{r.detail}</div>
                  )}
                </td>
                <td>{CATEGORY_LABELS[r.category]}</td>
                <td><span className={`badge b-${r.status}`}>{STATUS_LABELS[r.status]}</span></td>
                <td>
                  {isEditingNote ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 240 }}>
                      <textarea
                        autoFocus
                        placeholder="ระบุเหตุผลที่ไม่ผ่าน (SME จะเห็นข้อความนี้)"
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        rows={3}
                        style={{ width: '100%', fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid var(--border, #ccc)' }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-sm"
                          disabled={busy === r.id || !noteText.trim()}
                          onClick={() => doChange(noteFor!.id, noteFor!.to, noteText)}>
                          {busy === r.id ? '…' : 'ยืนยันไม่ผ่าน'}
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          disabled={busy === r.id}
                          onClick={() => { setNoteFor(null); setNoteText('') }}>
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : actions.length === 0 ? (
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>เสร็จสิ้น</span>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {actions.map(a => (
                        <button key={a.to}
                          className={`btn btn-sm ${a.primary ? '' : 'btn-ghost'}`}
                          disabled={busy === r.id}
                          onClick={() => handleAction(r.id, a.to)}>
                          {busy === r.id ? '…' : a.label}
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
