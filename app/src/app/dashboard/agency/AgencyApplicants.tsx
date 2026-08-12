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
  sme_profiles: { owner_id: string | null; company_name: string | null; province: string | null; sme_one_id: string | null } | null
  application_logs?: LogRow[]
}

// กลุ่มของผู้รับบริการ 1 ราย (จัดกลุ่มด้วย owner_id) ที่อาจมีหลายใบสมัคร/บริการ
type Group = {
  ownerId: string
  companyName: string
  province: string | null
  smeOneId: string | null
  apps: App[]
}

const STATE_COLOR = {
  pending: { border: '#cbd5e1', bg: '#fff', fg: '#94a3b8' },
  // pending แต่ผ่านหมุดก่อนหน้ามาแล้ว = กดได้ตอนนี้ (active) → เหลือง แทนที่จะเป็นขาวเฉยๆ
  active: { border: '#eab308', bg: '#eab308', fg: '#fff' },
  passed: { border: '#16a34a', bg: '#16a34a', fg: '#fff' },
  failed: { border: '#dc2626', bg: '#dc2626', fg: '#fff' },
}

export default function AgencyApplicants({
  initial, currentUser, filterPackageId, filterPackageTitle, onClearFilter, allPackages,
}: {
  initial: App[]
  currentUser: { id: string; name: string; role: string }
  filterPackageId?: string | null
  filterPackageTitle?: string | null
  onClearFilter?: () => void
  allPackages?: { id: string; title: string }[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState<{ appId: string; stepKey: string } | null>(null)
  const [failNote, setFailNote] = useState('')
  const [showLog, setShowLog] = useState<string | null>(null)
  const [localFilter, setLocalFilter] = useState<string | null>(filterPackageId ?? null)

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

  // นับจำนวนผู้สมัครต่อบริการ (นับเป็นใบสมัคร ไม่ใช่รายบุคคล — ใช้สำหรับ chip กรอง)
  const countByPkg: Record<string, number> = {}
  const titleByPkg: Record<string, string> = {}
  for (const a of initial) {
    const pid = a.package_id
    if (!pid) continue
    countByPkg[pid] = (countByPkg[pid] ?? 0) + 1
    if (a.packages?.title) titleByPkg[pid] = a.packages.title
  }

  // รายชื่อ chip — ใช้บริการทั้งหมด (รวมที่ 0 คน) ถ้าส่งมา, ไม่งั้น fallback จากใบสมัคร
  const pkgList: { id: string; title: string; count: number }[] =
    (allPackages && allPackages.length > 0)
      ? allPackages.map(p => ({ id: p.id, title: p.title, count: countByPkg[p.id] ?? 0 }))
      : Object.keys(countByPkg).map(pid => ({ id: pid, title: titleByPkg[pid] ?? '—', count: countByPkg[pid] }))

  // กรองตาม chip ที่เลือก
  const shown = localFilter
    ? initial.filter(a => a.package_id === localFilter)
    : initial

  const activeTitle = localFilter
    ? (pkgList.find(p => p.id === localFilter)?.title ?? filterPackageTitle ?? 'บริการที่เลือก')
    : null

  function clearAll() {
    setLocalFilter(null)
    onClearFilter?.()
  }

  // จัดกลุ่มใบสมัครที่ผ่านการกรองแล้ว ตาม owner_id ของ SME
  // ผู้รับบริการคนเดียวกัน (owner_id เดียวกัน) ที่สมัครหลายบริการ จะรวมอยู่ในการ์ดเดียวกัน
  const groups: Group[] = []
  const groupIndexByOwner: Record<string, number> = {}
  for (const a of shown) {
    const ownerId = a.sme_profiles?.owner_id
    // ถ้าไม่มี owner_id (ข้อมูลเก่า/ผิดปกติ) ใช้ application id ตัวเองแทนกันชนกับกลุ่มอื่น — ไม่รวมกับใคร
    const key = ownerId ?? `__no_owner_${a.id}`
    if (groupIndexByOwner[key] === undefined) {
      groupIndexByOwner[key] = groups.length
      groups.push({
        ownerId: key,
        companyName: a.sme_profiles?.company_name ?? '—',
        province: a.sme_profiles?.province ?? null,
        smeOneId: a.sme_profiles?.sme_one_id ?? null,
        apps: [],
      })
    }
    groups[groupIndexByOwner[key]].apps.push(a)
  }
  // เรียงใบสมัครภายในแต่ละกลุ่มตามวันที่ล่าสุดก่อน (ตาม order เดิมของ initial ซึ่ง sort มาจาก server แล้ว)

  if (initial.length === 0) {
    return (
      <div className="card">
        <h2>ผู้รับบริการ/ผลิตภัณฑ์/โครงการ</h2>
        <p className="empty">ยังไม่มี SME สมัครรับบริการ/ผลิตภัณฑ์/โครงการ</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>
          ผู้รับบริการ/ผลิตภัณฑ์/โครงการ ({groups.length})
          {activeTitle && <span style={{ fontSize: 14, fontWeight: 400, color: '#64748b' }}> · {activeTitle}</span>}
        </h2>
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, marginBottom: 12 }}>
        คลิกที่หมุดเพื่อกำหนดสถานะ (ผ่าน / ไม่ผ่าน) — ต้องผ่านหมุดก่อนหน้าจึงจะทำหมุดถัดไปได้
      </p>

      {/* แถบ chip กรองตามบริการ */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <button onClick={clearAll} style={chipStyle(localFilter === null)}>
          ทั้งหมด ({initial.length})
        </button>
        {pkgList.map(p => (
          <button key={p.id} onClick={() => setLocalFilter(p.id)} style={chipStyle(localFilter === p.id)}>
            {p.title} ({p.count})
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px',
          borderRadius: 8, margin: '12px 0', fontSize: 14 }}>{msg}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {groups.length === 0 ? (
          <p className="empty">ไม่มีผู้รับบริการในบริการนี้</p>
        ) : groups.map(group => (
          <div key={group.ownerId} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
            {/* หัวการ์ด: ข้อมูล SME (แสดงครั้งเดียวต่อผู้รับบริการ 1 ราย) */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{group.companyName}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {group.province} {group.smeOneId ? `· ${group.smeOneId}` : ''}
                {group.apps.length > 1 && (
                  <span style={{ marginLeft: 6, color: '#1e3a8a', fontWeight: 600 }}>
                    · สมัคร {group.apps.length} บริการ
                  </span>
                )}
              </div>
            </div>

            {/* แต่ละบริการที่ผู้รับบริการรายนี้สมัคร แสดง progress bar ของตัวเอง */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {group.apps.map((a, appIdx) => {
                const steps = a.steps ?? {}
                const logs = a.application_logs ?? []
                return (
                  <div key={a.id} style={appIdx > 0 ? { borderTop: '1px solid #f1f5f9', paddingTop: 18 } : undefined}>
                    <div style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                      บริการ: <strong>{a.packages?.title ?? '—'}</strong>
                    </div>

                    {/* Timeline หมุด */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative' }}>
                      {STEPS.map((step, i) => {
                        const st = steps[step.key]?.state ?? 'pending'
                        const open = isStepOpen(steps, i)
                        const clickable = open && busy !== a.id
                        // หมุดที่ยังไม่กำหนดสถานะ (pending) แต่ผ่านหมุดก่อนหน้ามาแล้ว = กดได้ตอนนี้ → แสดงสีเหลือง (active)
                        // ไม่ใช้สีขาวเฉยๆ เพราะจุดนี้เป็นจุดที่ต้องกดกำหนดสถานะต่อไป
                        const colorKey = st === 'pending' && open ? 'active' : st
                        const c = STATE_COLOR[colorKey]
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
                              color: st === 'passed' ? '#16a34a' : st === 'failed' ? '#dc2626' : (open ? '#ca8a04' : '#94a3b8'),
                              fontWeight: st !== 'pending' ? 600 : (open ? 600 : 400) }}>
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
                            onClick={() => setStep(a, editing.stepKey, 'pending', null)}>⚪ กลับเป็นรอ
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
        ))}
      </div>
    </div>
  )
}

function chipStyle(active: boolean) {
  return {
    padding: '6px 14px', fontSize: 13, borderRadius: 20, cursor: 'pointer',
    border: `1px solid ${active ? '#1e3a8a' : '#cbd5e1'}`,
    background: active ? '#1e3a8a' : '#fff',
    color: active ? '#fff' : '#475569',
    fontWeight: active ? 600 : 400,
  } as const
}
