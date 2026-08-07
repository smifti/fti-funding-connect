'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
const STEPS = [
  { key: 'submitted', label: 'ยื่นสมัคร' },
  { key: 'screening', label: 'พิจารณาคุณสมบัติ' },
  { key: 'in_progress', label: 'ดำเนินการ' },
  { key: 'completed', label: 'เสร็จสิ้น' },
]
const STEP_LABEL: Record<string, string> = {
  submitted: 'ยื่นสมัคร', screening: 'พิจารณาคุณสมบัติ', in_progress: 'ดำเนินการ', completed: 'เสร็จสิ้น',
}
const STATE_LABEL: Record<string, string> = {
  passed: 'ผ่าน', failed: 'ไม่ผ่าน', pending: 'กลับเป็นรอ',
}
const ROLE_LABEL: Record<string, string> = {
  agency: 'หน่วยงาน', expert: 'ที่ปรึกษา', admin: 'ผู้ดูแลระบบ',
}
type StepState = { state: 'pending' | 'passed' | 'failed'; note?: string }
type LogRow = {
  id: string
  step_key: string
  new_state: string
  note: string | null
  changed_by_name: string | null
  changed_by_role: string | null
  created_at: string
}
type App = {
  id: string
  package_id?: string
  status: string
  steps: Record<string, StepState>
  created_at: string
  packages: { title: string; category: string } | null
  sme_profiles: { company_name: string | null; province: string | null; sme_one_id: string | null } | null
  application_logs?: LogRow[]
}
const STATE_COLOR = {
  pending: { border: '#cbd5e1', bg: '#fff', fg: '#94a3b8' },
  passed: { border: '#16a34a', bg: '#16a34a', fg: '#fff' },
  failed: { border: '#dc2626', bg: '#dc2626', fg: '#fff' },
}
export default function AgencyApplicants({
  initial, currentUser, filterPackageId, onClearFilter,
}: {
  initial: App[]
  currentUser: { id: string; name: string; role: string }
  filterPackageId?: string | null
  onClearFilter?: () => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState<{ appId: string; stepKey: string } | null>(null)
  const [failNote, setFailNote] = useState('')
  const [showLog, setShowLog] = useState<string | null>(null)

  function overallStatus(steps: Record<string, StepState>): string {
    if (Object.values(steps).some(s => s.state === 'failed')) return 'rejected'
    if (steps.completed?.state === 'passed') return 'completed'
    return 'in_progress'
  }
  async function setStep(app: App, stepKey: string, state: StepState['state'], note: string | null) {
    setBusy(app.id); setMsg('')
    const newSteps = { ...app.steps, [stepKey]: { state, ...(note ? { note } : {}) } }
    const { error } = await supabase
      .from('package_applications')
      .update({
        steps: newSteps,
        status: overallStatus(newSteps),
        updated_at: new Date().toISOString(),
      })
      .eq('id', app.id)
    if (error) { setBusy(null); setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    await supabase.from('application_logs').insert({
      application_id: app.id,
      step_key: stepKey,
      new_state: state,
      note: note,
      changed_by: currentUser.id,
      changed_by_name: currentUser.name,
      changed_by_role: currentUser.role,
    })
    setBusy(null)
    setEditing(null); setFailNote('')
    router.refresh()
  }
  function isStepOpen(steps: Record<string, StepState>, idx: number): boolean {
    if (idx === 0) return true
    const prevKey = STEPS[idx - 1].key
    return steps[prevKey]?.state === 'passed'
  }

  // กรองเฉพาะแพ็กเกจที่เลือก (ถ้ามี)
  const shown = filterPackageId
    ? initial.filter(a => a.package_id === filterPackageId)
    : initial
  const filterTitle = filterPackageId
    ? shown[0]?.packages?.title ?? 'แพ็กเกจที่เลือก'
    : null

  if (initial.length === 0) {
    return (
      <div className="card">
        <h2>ผู้สมัครแพ็กเกจ</h2>
        <p className="empty">ยังไม่มี SME สมัครแพ็กเกจ</p>
      </div>
    )
  }
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>
          ผู้สมัครแพ็กเกจ ({shown.length})
          {filterTitle && <span style={{ fontSize: 14, fontWeight: 400, color: '#64748b' }}> · {filterTitle}</span>}
        </h2>
        {filterPackageId && onClearFilter && (
          <button className="btn btn-ghost btn-sm" onClick={onClearFilter}>✕ ดูทุกแพ็กเกจ</button>
        )}
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, marginBottom: 12 }}>
        คลิกที่หมุดเพื่อกำหนดสถานะ (ผ่าน / ไม่ผ่าน) — ต้องผ่านหมุดก่อนหน้าจึงจะทำหมุดถัดไปได้
      </p>
      {msg && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px',
          borderRadius: 8, margin: '12px 0', fontSize: 14 }}>{msg}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {shown.length === 0 ? (
          <p className="empty">ไม่มีผู้สมัครในแพ็กเกจนี้</p>
        ) : shown.map(a => {
          const steps = a.steps ?? {}
          const logs = a.application_logs ?? []
          return (
            <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
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

              {/* Timeline หมุด */}
              <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
                {STEPS.map((step, i) => {
                  const st = steps[step.key]?.state ?? 'pending'
                  const c = STATE_COLOR[st]
                  const open = isStepOpen(steps, i)
                  const clickable = open && busy !== a.id
                  return (
                    <div key={step.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                      {i > 0 && (
                        <div style={{ position: 'absolute', top: 15, left: '-50%', width: '100%', height: 3,
                          background: (steps[STEPS[i - 1].key]?.state === 'passed') ? '#16a34a' : '#e2e8f0' }} />
                      )}
                      <button
                        disabled={!clickable}
                        onClick={() => { setEditing({ appId: a.id, stepKey: step.key }); setFailNote(steps[step.key]?.note ?? ''); setMsg('') }}
                        title={clickable ? `กำหนดสถานะ: ${step.label}` : 'ต้องผ่านหมุดก่อนหน้าก่อน'}
                        style={{
                          position: 'relative', zIndex: 1,
                          width: 32, height: 32, borderRadius: '50%',
                          border: `2px solid ${c.border}`, background: c.bg, color: c.fg,
                          cursor: clickable ? 'pointer' : 'default',
                          fontSize: 14, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          opacity: open ? 1 : 0.55,
                        }}>
                        {st === 'passed' ? '✓' : st === 'failed' ? '✕' : i + 1}
                      </button>
                      <div style={{ fontSize: 12, marginTop: 6,
                        color: st === 'passed' ? '#16a34a' : st === 'failed' ? '#dc2626' : '#94a3b8',
                        fontWeight: st !== 'pending' ? 600 : 400 }}>
                        {step.label}
                      </div>
                      {st === 'failed' && steps[step.key]?.note && (
                        <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2, maxWidth: 130, margin: '2px auto 0' }}>
                          {steps[step.key]?.note}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* เมนูจัดการหมุด */}
              {editing?.appId === a.id && (
                <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    กำหนดสถานะ: {STEPS.find(s => s.key === editing.stepKey)?.label}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button className="btn btn-sm" disabled={busy === a.id}
                      onClick={() => setStep(a, editing.stepKey, 'passed', null)}>
                      🟢 ผ่าน
                    </button>
                    <button className="btn btn-sm btn-ghost" disabled={busy === a.id}
                      onClick={() => setStep(a, editing.stepKey, 'pending', null)}>
                      ⚪ กลับเป็นรอ
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <textarea rows={2} placeholder="เหตุผลที่ไม่ผ่าน (SME จะเห็น)"
                      value={failNote} onChange={e => setFailNote(e.target.value)}
                      style={{ width: '100%', fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-sm" disabled={busy === a.id || !failNote.trim()}
                        onClick={() => setStep(a, editing.stepKey, 'failed', failNote.trim())}
                        style={{ background: '#dc2626' }}>
                        🔴 ไม่ผ่าน
                      </button>
                      <button className="btn btn-sm btn-ghost"
                        onClick={() => { setEditing(null); setFailNote('') }}>ปิด</button>
                    </div>
                  </div>
                </div>
              )}

              {/* ประวัติการแก้ไข */}
              {logs.length > 0 && (
                <div style={{ marginTop: 14, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <button
                    onClick={() => setShowLog(showLog === a.id ? null : a.id)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e3a8a',
                      fontSize: 13, padding: 0 }}>
                    {showLog === a.id ? '▼' : '▶'} ประวัติการปรับปรุง ({logs.length})
                  </button>
                  {showLog === a.id && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {logs.map(log => (
                        <div key={log.id} style={{ fontSize: 12, color: '#475569',
                          background: '#f8fafc', borderRadius: 6, padding: '6px 10px' }}>
                          <strong>{log.changed_by_name ?? '—'}</strong>
                          <span style={{ color: '#94a3b8' }}> ({ROLE_LABEL[log.changed_by_role ?? ''] ?? log.changed_by_role})</span>
                          {' '}กำหนด <strong>{STEP_LABEL[log.step_key] ?? log.step_key}</strong>
                          {' '}เป็น <strong>{STATE_LABEL[log.new_state] ?? log.new_state}</strong>
                          {log.note && <span style={{ color: '#991b1b' }}> — {log.note}</span>}
                          <div style={{ color: '#94a3b8', marginTop: 2 }}>
                            {new Date(log.created_at).toLocaleString('th-TH')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
