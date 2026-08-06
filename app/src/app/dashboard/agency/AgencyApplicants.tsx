'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

// หมุด timeline (เรียงลำดับ)
const STEPS = [
  { key: 'submitted', label: 'ยื่นสมัคร' },
  { key: 'screening', label: 'พิจารณาคุณสมบัติ' },
  { key: 'in_progress', label: 'ดำเนินการ' },
  { key: 'completed', label: 'เสร็จสิ้น' },
]
const STEP_INDEX: Record<string, number> = {
  submitted: 0, screening: 1, in_progress: 2, completed: 3,
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
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  async function moveTo(id: string, to: string, note: string | null) {
    setBusy(id); setMsg('')
    const { error } = await supabase
      .from('package_applications')
      .update({ status: to, status_note: note, updated_at: new Date().toISOString() })
      .eq('id', id)
    setBusy(null)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setRejectFor(null); setRejectNote('')
    router.refresh()
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {initial.map(a => {
          const rejected = a.status === 'rejected'
          const curIdx = STEP_INDEX[a.status] ?? 0
          return (
            <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
              {/* หัวข้อ: ชื่อกิจการ + แพ็กเกจ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{a.sme_profiles?.company_name ?? '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {a.sme_profiles?.province} {a.sme_profiles?.sme_one_id ? `· ${a.sme_profiles.sme_one_id}` : ''}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#475569', textAlign: 'right' }}>
                  แพ็กเกจ: <strong>{a.packages?.title ?? '—'}</strong>
                </div>
              </div>

              {rejected ? (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>
                  <strong>ไม่ผ่าน</strong>
                  {a.status_note && <div style={{ marginTop: 4, fontSize: 13 }}>เหตุผล: {a.status_note}</div>}
                </div>
              ) : (
                <>
                  {/* Timeline หมุดแนวนอน */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
                    {STEPS.map((step, i) => {
                      const done = i < curIdx
                      const current = i === curIdx
                      const isNext = i === curIdx + 1
                      const clickable = isNext && busy !== a.id
                      const dotColor = done || current ? '#16a34a' : (isNext ? '#1e3a8a' : '#cbd5e1')
                      return (
                        <div key={step.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                          {/* เส้นเชื่อมซ้าย */}
                          {i > 0 && (
                            <div style={{ position: 'absolute', top: 13, left: '-50%', width: '100%', height: 3,
                              background: i <= curIdx ? '#16a34a' : '#e2e8f0' }} />
                          )}
                          {/* หมุด */}
                          <button
                            disabled={!clickable}
                            onClick={() => clickable && moveTo(a.id, step.key, null)}
                            title={clickable ? `กดเพื่อเลื่อนไป: ${step.label}` : ''}
                            style={{
                              position: 'relative', zIndex: 1,
                              width: 28, height: 28, borderRadius: '50%',
                              border: `2px solid ${dotColor}`,
                              background: done || current ? dotColor : '#fff',
                              color: done || current ? '#fff' : dotColor,
                              cursor: clickable ? 'pointer' : 'default',
                              fontSize: 13, fontWeight: 600,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: clickable ? '0 0 0 4px rgba(30,58,138,.12)' : 'none',
                            }}>
                            {done ? '✓' : i + 1}
                          </button>
                          <div style={{ fontSize: 12, marginTop: 6,
                            color: current ? '#16a34a' : (isNext ? '#1e3a8a' : '#94a3b8'),
                            fontWeight: current || isNext ? 600 : 400 }}>
                            {step.label}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* ปุ่มไม่ผ่าน (ถ้ายังไม่เสร็จสิ้น) */}
                  {a.status !== 'completed' && (
                    rejectFor === a.id ? (
                      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea autoFocus rows={2}
                          placeholder="เหตุผลที่ไม่ผ่าน (SME จะเห็น)"
                          value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                          style={{ width: '100%', fontSize: 13, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm" disabled={busy === a.id || !rejectNote.trim()}
                            onClick={() => moveTo(a.id, 'rejected', rejectNote.trim())}>
                            {busy === a.id ? '…' : 'ยืนยันไม่ผ่าน'}
                          </button>
                          <button className="btn btn-sm btn-ghost"
                            onClick={() => { setRejectFor(null); setRejectNote('') }}>ยกเลิก</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 14, textAlign: 'right' }}>
                        <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626' }}
                          disabled={busy === a.id}
                          onClick={() => { setRejectFor(a.id); setRejectNote(''); setMsg('') }}>
                          ทำเครื่องหมายว่าไม่ผ่าน
                        </button>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
