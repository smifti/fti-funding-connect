'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import {
  buildHolidaySet, getSlaStatus, getStep3SlaDays, getStep4SlaDays, getSlaColor, formatDaysRemaining,
  SlaConfig,
} from '@/lib/sla'

// model ของแต่ละจุด กำหนดว่าใช้ชุดสถานะแบบไหน:
//   passfail   -> pending / passed / failed (มีเหตุผลตอนไม่ผ่าน)
//   coordinate -> pending / coordinating / in_progress (ดำเนินการ = ผ่านไปจุดถัดไป)
//   finish     -> pending / waiting / done (เสร็จสิ้น ต้องมีเหตุผลกำกับ)
type StepModel = 'passfail' | 'coordinate' | 'finish'
const STEPS: { key: string; label: string; model: StepModel; roles: string[] }[] = [
  { key: 'submitted', label: 'ยื่นสมัคร', model: 'passfail', roles: ['admin', 'expert'] },
  { key: 'screening', label: 'พิจารณาคุณสมบัติ', model: 'passfail', roles: ['admin', 'expert'] },
  { key: 'agency_received', label: 'หน่วยงานรับเรื่อง', model: 'coordinate', roles: ['admin', 'agency'] },
  { key: 'under_review', label: 'อยู่ระหว่างการพิจารณา', model: 'coordinate', roles: ['admin', 'agency'] },
  { key: 'completed', label: 'เสร็จสิ้น', model: 'finish', roles: ['admin', 'agency'] },
]
// สถานะที่ถือว่า "ผ่านจุดนี้แล้ว ไปจุดถัดไปได้" ของแต่ละ model
const ADVANCE_STATE: Record<StepModel, string> = {
  passfail: 'passed', coordinate: 'in_progress', finish: 'done',
}
const STEP_LABEL: Record<string, string> = Object.fromEntries(STEPS.map(s => [s.key, s.label]))
const STATE_LABEL: Record<string, string> = {
  passed: 'ผ่าน', failed: 'ไม่ผ่าน', pending: 'กลับเป็นรอ',
  coordinating: 'อยู่ในระหว่างการประสานงาน', in_progress: 'อยู่ระหว่างดำเนินการ',
  waiting: 'รอรับเรื่องต่อ', done: 'เสร็จสิ้น',
}
// บางจุดใช้คำเรียกสถานะต่างจากค่า state ที่เก็บจริงในฐานข้อมูล (เก็บ coordinating/in_progress/waiting/done
// เหมือนเดิมทุกจุด แค่ข้อความที่แสดงบนจอต่างกันไปตามจุด):
//   จุดที่ 4 (under_review): coordinating → "อยู่ระหว่างการดำเนินการ", in_progress → "เสร็จสิ้น"
//   จุดที่ 5 (completed):    waiting → "อนุมัติ" (เขียว), done → "ไม่อนุมัติ" (แดง)
function stepStatusLabel(stepKey: string, state: string): string {
  if (stepKey === 'agency_received') {
    if (state === 'in_progress') return 'เสร็จสิ้น'
  }
  if (stepKey === 'under_review') {
    if (state === 'coordinating') return 'อยู่ระหว่างการดำเนินการ'
    if (state === 'in_progress') return 'เสร็จสิ้น'
  }
  if (stepKey === 'completed') {
    if (state === 'waiting') return 'อนุมัติ'
    if (state === 'done') return 'ไม่อนุมัติ'
  }
  return STATE_LABEL[state] ?? state
}
const ROLE_LABEL: Record<string, string> = {
  agency: 'หน่วยงาน', expert: 'ที่ปรึกษา', admin: 'ผู้ดูแลระบบ',
}
// ตัวเลือกเหตุผล dropdown เฉพาะจุดที่ 4 (under_review) ตอนกด "อยู่ในระหว่างการประสานงาน"
const UNDER_REVIEW_COORDINATE_REASONS = [
  'ติดตามเอกสาร', 'อยู่ระหว่างประเมินหลักประกัน', 'อยู่ระหว่างต่อรอง', 'รอผลอนุมัติ',
]
const OTHER_REASON = 'อื่น ๆ'

type StepState = { state: string; note?: string }
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
  packages: { title: string; category: string; min_amount?: number | null; max_amount?: number | null } | null
  sme_profiles: { owner_id: string | null; company_name: string | null; province: string | null; sme_one_id: string | null } | null
  application_logs?: LogRow[]
  // เวลาเริ่มของแต่ละขั้น สำหรับคำนวณ SLA
  step1_started_at: string | null
  step2_started_at: string | null
  step3_started_at: string | null
  step4_started_at: string | null
}

// กลุ่มของผู้รับบริการ 1 ราย (จัดกลุ่มด้วย owner_id) ที่อาจมีหลายใบสมัคร/บริการ
type Group = {
  ownerId: string
  companyName: string
  province: string | null
  smeOneId: string | null
  apps: App[]
}

const STATE_COLOR: Record<string, { border: string; bg: string; fg: string }> = {
  pending: { border: '#cbd5e1', bg: '#fff', fg: '#94a3b8' },
  // pending แต่ผ่านหมุดก่อนหน้ามาแล้ว = กดได้ตอนนี้ (active) → เหลือง แทนที่จะเป็นขาวเฉยๆ
  active: { border: '#eab308', bg: '#eab308', fg: '#fff' },
  passed: { border: '#16a34a', bg: '#16a34a', fg: '#fff' },
  failed: { border: '#dc2626', bg: '#dc2626', fg: '#fff' },
  // จุดที่ 3/4 (coordinate model)
  coordinating: { border: '#0284c7', bg: '#0284c7', fg: '#fff' }, // ฟ้า: อยู่ในระหว่างการประสานงาน
  in_progress: { border: '#16a34a', bg: '#16a34a', fg: '#fff' }, // เขียว: อยู่ระหว่างดำเนินการ → ไปจุดถัดไป
  // จุดที่ 5 (finish model) — waiting = อนุมัติ (เขียว), done = ไม่อนุมัติ (แดง)
  waiting: { border: '#16a34a', bg: '#16a34a', fg: '#fff' },
  done: { border: '#dc2626', bg: '#dc2626', fg: '#fff' },
}
// ไอคอนกลางหมุดตามสถานะ (ไม่กำหนด = แสดงเลขลำดับจุดแทน)
const STATE_ICON: Record<string, string> = {
  passed: '✓', in_progress: '✓', waiting: '✓',
  failed: '✕', done: '✕',
  coordinating: '●',
}

export default function AgencyApplicants({
  initial, currentUser, filterPackageId, filterPackageTitle, onClearFilter, allPackages,
  slaConfig, holidays,
}: {
  initial: App[]
  currentUser: { id: string; name: string; role: string }
  filterPackageId?: string | null
  filterPackageTitle?: string | null
  onClearFilter?: () => void
  allPackages?: { id: string; title: string }[]
  slaConfig: SlaConfig
  holidays: string[] // array ของวันที่ YYYY-MM-DD
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [editing, setEditing] = useState<{ appId: string; stepKey: string } | null>(null)
  const [failNote, setFailNote] = useState('')
  // ตัวเลือกเหตุผล dropdown ตอนกด "ประสานงาน" ที่จุดที่ 4 (under_review) โดยเฉพาะ
  const [coordReason, setCoordReason] = useState('')
  const [coordOtherText, setCoordOtherText] = useState('')
  const [showLog, setShowLog] = useState<string | null>(null)
  const [localFilter, setLocalFilter] = useState<string | null>(filterPackageId ?? null)

  const holidaySet = buildHolidaySet(holidays)

  // ใช้แค่แสดงผลชั่วคราวระหว่างรอ router.refresh() — ค่าจริงคำนวณโดย RPC ในฐานข้อมูล
  function overallStatus(steps: Record<string, StepState>): string {
    if (Object.values(steps).some(s => s.state === 'failed')) return 'rejected'
    if (steps.completed?.state === 'done') return 'completed'
    return 'in_progress'
  }

  // กำหนดสถานะของจุดใดจุดหนึ่ง — ผ่าน RPC เดียวเสมอ (ตรวจสิทธิ์ตาม role ระดับฐานข้อมูล)
  async function setStep(app: App, stepKey: string, state: string, note: string | null) {
    setBusy(app.id); setMsg('')
    const { error } = await supabase.rpc('set_application_step_status', {
      p_app_id: app.id,
      p_step_key: stepKey,
      p_state: state,
      p_note: note,
    })
    if (error) { setBusy(null); setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setBusy(null)
    setEditing(null); setFailNote('')
    router.refresh()
  }

  function isStepOpen(steps: Record<string, StepState>, idx: number): boolean {
    if (idx === 0) return true
    const prevStep = STEPS[idx - 1]
    return steps[prevStep.key]?.state === ADVANCE_STATE[prevStep.model]
  }

  // ตรวจว่า role ปัจจุบันมีสิทธิ์แก้ไขจุดนี้หรือไม่ (เสริมจาก DB-level ที่บังคับจริงใน RPC)
  function canEditStep(stepKey: string): boolean {
    const step = STEPS.find(s => s.key === stepKey)
    return !!step && step.roles.includes(currentUser.role)
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
        คลิกที่หมุดเพื่อกำหนดสถานะ — ต้องผ่านหมุดก่อนหน้าจึงจะทำหมุดถัดไปได้ (แต่ละบทบาทกำหนดได้เฉพาะบางจุดเท่านั้น)
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
                        const editable = canEditStep(step.key)
                        const clickable = open && editable && busy !== a.id
                        // หมุดที่ยังไม่กำหนดสถานะ (pending) แต่ผ่านหมุดก่อนหน้ามาแล้ว = กดได้ตอนนี้ → แสดงสีเหลือง (active)
                        // ไม่ใช้สีขาวเฉยๆ เพราะจุดนี้เป็นจุดที่ต้องกดกำหนดสถานะต่อไป
                        const colorKey = st === 'pending' && open ? 'active' : st
                        const c = STATE_COLOR[colorKey] ?? STATE_COLOR.pending

                        // คำนวณสถานะ SLA ของ "เส้นที่นำไปสู่หมุดนี้" — badge "เหลือ/เกิน กี่วัน":
                        //   จุดทั่วไป (1→2, 2→3, 3→4): ขึ้นทันทีที่จุดปลายทาง "active" (open = เปิดให้กดได้แล้ว)
                        //   จุด 4→5 (ข้อยกเว้น): ไม่ต้องรอจุด 5 active — ขึ้นทันทีที่จุด 4 (ต้นทาง) มีสถานะแล้ว
                        //     (ตรงกับ anchor step4_started_at ที่ตั้งตั้งแต่จุด 4 มีสถานะครั้งแรกอยู่แล้ว)
                        let lineSla: ReturnType<typeof getSlaStatus> | null = null
                        let lineIsActive = false
                        // วันที่ครบกำหนดของหมุดนี้ (แสดงเหนือหมุด) — คำนวณไม่ว่าหมุดจะ passed หรือ active ก็ตาม
                        // ต่างจาก lineSla ตรงที่ยังต้องใช้แสดงผลแม้หมุด passed ไปแล้ว (โชว์ค้างไว้เป็นข้อมูลอ้างอิง)
                        let stepDeadline: Date | null = null
                        if (i > 0) {
                          const prevKey = STEPS[i - 1].key
                          const showSlaBadge = step.key === 'completed' ? true : open
                          lineIsActive = st !== ADVANCE_STATE[step.model] && showSlaBadge

                          let startedAtStr: string | null = null
                          let slaDays = 0
                          if (prevKey === 'submitted') {
                            startedAtStr = a.step1_started_at ?? a.created_at
                            slaDays = slaConfig.step1_days
                          } else if (prevKey === 'screening') {
                            startedAtStr = a.step2_started_at
                            slaDays = slaConfig.step2_days
                          } else if (prevKey === 'agency_received') {
                            startedAtStr = a.step3_started_at
                            slaDays = getStep3SlaDays(slaConfig, a.packages?.max_amount ?? null)
                          } else if (prevKey === 'under_review') {
                            startedAtStr = a.step4_started_at
                            slaDays = getStep4SlaDays(slaConfig, a.packages?.max_amount ?? null)
                          }

                          if (startedAtStr) {
                            const sla = getSlaStatus(new Date(startedAtStr), slaDays, holidaySet)
                            stepDeadline = sla.deadline
                            if (lineIsActive) lineSla = sla
                          }
                        }

                        return (
                          <div key={step.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                            {/* วันที่กำกับเหนือหมุด: หมุดแรก = วันที่ยื่นจริง, หมุดอื่น = วันที่ครบกำหนด (ถ้ามีข้อมูล) */}
                            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, minHeight: 14 }}>
                              {i === 0
                                ? formatShortThaiDate(a.step1_started_at ?? a.created_at)
                                : (stepDeadline ? `กำหนด ${formatShortThaiDate(stepDeadline.toISOString())}` : '')}
                            </div>
                            {i > 0 && (
                              st === ADVANCE_STATE[step.model] ? (
                                // หมุดปลายทาง (หมุดนี้เอง) ผ่านแล้ว — เส้นนำไปสู่หมุดนี้จบสมบูรณ์ → เขียวทึบนิ่ง
                                <div style={{ position: 'absolute', top: 33, left: '-50%', width: '100%', height: 3,
                                  background: '#16a34a' }} />
                              ) : lineSla ? (
                                // หมุดปลายทางยังไม่ผ่าน (pending/active) และมีข้อมูลเริ่มนับ SLA แล้ว — แสดง progress bar
                                <SlaLine sla={lineSla} />
                              ) : (
                                // ยังไปไม่ถึงช่วงนี้ (หมุดก่อนหน้ายังไม่ผ่าน) หรือยังไม่มีเวลาเริ่มนับ — เทาทึบนิ่ง
                                <div style={{ position: 'absolute', top: 33, left: '-50%', width: '100%', height: 3,
                                  background: '#e2e8f0' }} />
                              )
                            )}
                            <button
                              disabled={!clickable}
                              onClick={() => { setEditing({ appId: a.id, stepKey: step.key }); setFailNote(steps[step.key]?.note ?? ''); setCoordReason(''); setCoordOtherText(''); setMsg('') }}
                              title={
                                clickable ? `กำหนดสถานะ: ${step.label}`
                                : !open ? 'ต้องผ่านหมุดก่อนหน้าก่อน'
                                : !editable ? 'บทบาทของท่านไม่มีสิทธิ์กำหนดสถานะจุดนี้'
                                : undefined
                              }
                              style={{
                                position: 'relative', zIndex: 1,
                                width: 32, height: 32, borderRadius: '50%',
                                border: `2px solid ${c.border}`, background: c.bg, color: c.fg,
                                cursor: clickable ? 'pointer' : 'default',
                                fontSize: 14, fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                opacity: open ? 1 : 0.55,
                              }}>
                              {STATE_ICON[st] ?? (i + 1)}
                            </button>
                            <div style={{ fontSize: 12, marginTop: 6,
                              color: st === 'pending' ? (open ? '#ca8a04' : '#94a3b8')
                                : step.model === 'finish' ? '#334155'
                                : c.border,
                              fontWeight: st !== 'pending' ? 600 : (open ? 600 : 400) }}>
                              {step.label}
                            </div>
                            {(step.model === 'coordinate' || step.model === 'finish') && st !== 'pending' && (
                              <div style={{ fontSize: 11, marginTop: 2, color: c.border, fontWeight: 600 }}>
                                {stepStatusLabel(step.key, st)}
                              </div>
                            )}
                            {steps[step.key]?.note && !(step.key === 'under_review' && st === 'in_progress') && (
                              <div style={{ fontSize: 11, color: st === 'failed' ? '#dc2626' : '#475569',
                                marginTop: 2, maxWidth: 130, margin: '2px auto 0' }}>
                                {steps[step.key]?.note}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* เมนูจัดการหมุด */}
                    {editing?.appId === a.id && (() => {
                      const editStep = STEPS.find(s => s.key === editing.stepKey)!
                      return (
                      <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                          กำหนดสถานะ: {editStep.label}
                        </div>

                        {editStep.model === 'passfail' && (
                          <>
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
                          </>
                        )}

                        {editStep.model === 'coordinate' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {editing.stepKey === 'under_review' ? (
                              <>
                                <label style={{ fontSize: 12, color: '#475569' }}>เหตุผลที่อยู่ระหว่างดำเนินการ</label>
                                <select value={coordReason} onChange={e => setCoordReason(e.target.value)}
                                  style={{ width: '100%', fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }}>
                                  <option value="">— เลือกเหตุผล —</option>
                                  {UNDER_REVIEW_COORDINATE_REASONS.map(r => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                  <option value={OTHER_REASON}>อื่น ๆ (ใส่เหตุผล)</option>
                                </select>
                                {coordReason === OTHER_REASON && (
                                  <textarea rows={2} placeholder="ระบุเหตุผล"
                                    value={coordOtherText} onChange={e => setCoordOtherText(e.target.value)}
                                    style={{ width: '100%', fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                                )}
                                <button className="btn btn-sm" disabled={busy === a.id || !coordReason
                                  || (coordReason === OTHER_REASON && !coordOtherText.trim())}
                                  style={{ background: '#0284c7' }}
                                  onClick={() => setStep(a, editing.stepKey, 'coordinating',
                                    coordReason === OTHER_REASON ? coordOtherText.trim() : coordReason)}>
                                  🔵 อยู่ระหว่างการดำเนินการ
                                </button>
                              </>
                            ) : (
                              <button className="btn btn-sm" disabled={busy === a.id}
                                style={{ background: '#0284c7' }}
                                onClick={() => setStep(a, editing.stepKey, 'coordinating', null)}>
                                🔵 อยู่ในระหว่างการประสานงาน
                              </button>
                            )}
                            <textarea rows={2} placeholder="โน้ตเพิ่มเติม (ไม่บังคับ)"
                              value={failNote} onChange={e => setFailNote(e.target.value)}
                              style={{ width: '100%', fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button className="btn btn-sm" disabled={busy === a.id}
                                onClick={() => setStep(a, editing.stepKey, 'in_progress', failNote.trim() || null)}>
                                🟢 เสร็จสิ้น (ไปจุดถัดไป)
                              </button>
                              <button className="btn btn-sm btn-ghost" disabled={busy === a.id}
                                onClick={() => setStep(a, editing.stepKey, 'pending', null)}>⚪ กลับเป็นรอ
                              </button>
                              <button className="btn btn-sm btn-ghost"
                                onClick={() => { setEditing(null); setFailNote(''); setCoordReason(''); setCoordOtherText('') }}>ปิด</button>
                            </div>
                          </div>
                        )}

                        {editStep.model === 'finish' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-sm" disabled={busy === a.id}
                                style={{ background: '#16a34a' }}
                                onClick={() => setStep(a, editing.stepKey, 'waiting', null)}>
                                🟢 อนุมัติ
                              </button>
                              <button className="btn btn-sm btn-ghost" disabled={busy === a.id}
                                onClick={() => setStep(a, editing.stepKey, 'pending', null)}>⚪ กลับเป็นรอ
                              </button>
                            </div>
                            <textarea rows={2} placeholder="เหตุผลที่ไม่อนุมัติ (จำเป็นต้องกรอก)"
                              value={failNote} onChange={e => setFailNote(e.target.value)}
                              style={{ width: '100%', fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }} />
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-sm" disabled={busy === a.id || !failNote.trim()}
                                style={{ background: '#dc2626' }}
                                onClick={() => setStep(a, editing.stepKey, 'done', failNote.trim())}>
                                🔴 ไม่อนุมัติ
                              </button>
                              <button className="btn btn-sm btn-ghost"
                                onClick={() => { setEditing(null); setFailNote('') }}>ปิด</button>
                            </div>
                          </div>
                        )}
                      </div>
                      )
                    })()}

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

// แสดงวันที่แบบสั้น (วัน/เดือน/ปี พ.ศ. 2 หลัก) สำหรับกำกับเหนือหมุด — กระชับ ไม่กินพื้นที่มาก
function formatShortThaiDate(iso: string): string {
  const d = new Date(iso)
  const buddhistYear = d.getFullYear() + 543
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(buddhistYear).slice(-2)
  return `${dd}/${mm}/${yy}`
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

// เส้นเชื่อมระหว่างหมุดที่กำลังดำเนินการ (ยังไม่ passed) — progress bar ไล่สีตาม % SLA พร้อม animation และเลขวันกำกับ
function SlaLine({ sla }: { sla: ReturnType<typeof getSlaStatus> }) {
  const color = getSlaColor(sla.percentUsed)
  const fillPercent = Math.min(sla.percentUsed, 100) // แถบสีเติมเต็มที่ 100% แม้เกิน SLA (ไม่ล้นเส้น)

  return (
    <div style={{
      position: 'absolute', top: 33, left: '-50%', width: '100%', height: 3,
      background: '#e2e8f0', overflow: 'visible',
    }}>
      {/* แถบสีที่ไล่ตาม % เวลาใช้ไป พร้อม shimmer animation บอกว่ากำลังดำเนินอยู่ */}
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%',
        width: `${fillPercent}%`, background: color.bg,
        backgroundImage: `linear-gradient(90deg, ${color.bg} 0%, rgba(255,255,255,0.6) 50%, ${color.bg} 100%)`,
        backgroundSize: '200% 100%',
        animation: 'sla-shimmer 1.6s linear infinite',
        borderRadius: 2,
      }} />
      {/* เลขจำนวนวันกำกับกลางเส้น */}
      <div style={{
        position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
        background: color.bg, color: color.text, fontSize: 10, fontWeight: 700,
        padding: '1px 6px', borderRadius: 8, whiteSpace: 'nowrap',
      }}>
        {formatDaysRemaining(sla.daysRemaining)}
      </div>
      <style>{`
        @keyframes sla-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
