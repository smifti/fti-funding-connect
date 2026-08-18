'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import ProfileForm from './ProfileForm'
import SmePackages from './SmePackages'
import ChangePassword from '@/components/ChangePassword'
const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ',
  innovation: 'นวัตกรรม',
  management: 'บริหารจัดการ',
  marketing: 'การตลาด',
  production: 'การผลิต',
  upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}
// หมุด timeline
const STEPS = [
  { key: 'submitted', label: 'ยื่นสมัคร' },
  { key: 'screening', label: 'พิจารณาคุณสมบัติ' },
  { key: 'in_progress', label: 'ดำเนินการ' },
  { key: 'completed', label: 'เสร็จสิ้น' },
]
const STATE_COLOR: Record<string, { border: string; bg: string; fg: string }> = {
  pending: { border: '#cbd5e1', bg: '#fff', fg: '#94a3b8' },
  passed: { border: '#16a34a', bg: '#16a34a', fg: '#fff' },
  failed: { border: '#dc2626', bg: '#dc2626', fg: '#fff' },
}
// ป้ายสถานะแพ็กเกจ (คำนวณจาก approval_status + service_status)
function packageStatusBadge(pkg: any): { label: string; bg: string; color: string } | null {
  if (!pkg) return null
  const approval = pkg.approval_status
  const service = pkg.service_status ?? 'open'
  if (approval !== 'approved') {
    return { label: '🟡 กำลังปรับปรุง / รออนุมัติจาก ส.อ.ท.', bg: '#fef9c3', color: '#a16207' }
  }
  if (service === 'paused') {
    return { label: '⚪ ผู้ให้บริการปิดรับชั่วคราว', bg: '#f1f5f9', color: '#64748b' }
  }
  if (service === 'ended') {
    return { label: '⚫ สิ้นสุดโครงการแล้ว', bg: '#e2e8f0', color: '#475569' }
  }
  return null  // เปิดปกติ = ไม่ต้องมีป้าย
}

const REQUIRED_FIELDS = [
  'company_name', 'sme_one_id', 'province', 'business_type',
  'coordinator_name', 'coordinator_phone', 'coordinator_email',
]
const OPTIONAL_FIELDS = [
  'address', 'year_started', 'employee_count', 'fti_member_id',
  'industry_group', 'main_product', 'brand', 'sales_channel', 'website', 'social_media',
  'product_standard', 'awards', 'export_history', 'export_countries',
  'funding_history', 'funding_agency', 'funding_amount',
  'coordinator_position', 'coordinator_line', 'coordinator_relation',
]
function filled(v: any) { return v !== null && v !== undefined && String(v).trim() !== '' }
function getStatus(sme: any): 'green' | 'yellow' | 'red' {
  const reqOk = REQUIRED_FIELDS.every(f => filled(sme[f]))
  if (!reqOk) return 'red'
  const optOk = OPTIONAL_FIELDS.every(f => filled(sme[f]))
  return optOk ? 'green' : 'yellow'
}
const STATUS_INFO = {
  green: { color: '#16a34a', bg: '#dcfce7', label: 'ข้อมูลครบถ้วน' },
  yellow: { color: '#a16207', bg: '#fef9c3', label: 'ข้อมูลจำเป็นครบ (เพิ่มเติมได้)' },
  red: { color: '#dc2626', bg: '#fee2e2', label: 'ข้อมูลจำเป็นยังไม่ครบ' },
}
// Timeline สำหรับ SME (อ่านอย่างเดียว)
function AppTimeline({ steps }: { steps: Record<string, any> }) {
  const s = steps ?? {}
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', marginTop: 10 }}>
      {STEPS.map((step, i) => {
        const st = s[step.key]?.state ?? 'pending'
        const c = STATE_COLOR[st] ?? STATE_COLOR.pending
        const prevPassed = i > 0 && s[STEPS[i - 1].key]?.state === 'passed'
        return (
          <div key={step.key} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{ position: 'absolute', top: 13, left: '-50%', width: '100%', height: 3,
                background: prevPassed ? '#16a34a' : '#e2e8f0' }} />
            )}
            <div style={{
              position: 'relative', zIndex: 1, margin: '0 auto',
              width: 28, height: 28, borderRadius: '50%',
              border: `2px solid ${c.border}`, background: c.bg, color: c.fg,
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {st === 'passed' ? '✓' : st === 'failed' ? '✕' : i + 1}
            </div>
            <div style={{ fontSize: 11, marginTop: 6,
              color: st === 'passed' ? '#16a34a' : st === 'failed' ? '#dc2626' : '#94a3b8',
              fontWeight: st !== 'pending' ? 600 : 400 }}>
              {step.label}
            </div>
            {st === 'failed' && s[step.key]?.note && (
              <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2, maxWidth: 120, margin: '2px auto 0' }}>
                {s[step.key].note}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
export default function SmeTabs({
  sme, requests, health, packages, appliedIds, savedIds, myApplications,
}: {
  sme: any
  requests: any[]
  health: any
  packages: any[]
  appliedIds: string[]
  savedIds: string[]
  myApplications: any[]
}) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'overview' | 'packages' | 'profile' | 'settings'>('overview')

  // ถ้ามาจากลิงก์แชร์ (?package=xxx) ให้สลับไปแท็บ "แพ็กเกจสนับสนุน" อัตโนมัติ
  // ตัวโมดัลจริงจะถูกเปิดโดย SmePackages เอง (เช็ค query เดียวกัน)
  useEffect(() => {
    if (searchParams.get('package')) setTab('packages')
  }, [])

  const status = getStatus(sme)
  const info = STATUS_INFO[status]
  const tabStyle = (active: boolean) => ({
    border: 'none', background: 'none', cursor: 'pointer', padding: '10px 4px', fontSize: 15,
    fontWeight: active ? 600 : 400,
    color: active ? '#1e3a8a' : '#64748b',
    borderBottom: active ? '2px solid #1e3a8a' : '2px solid transparent',
  })
  return (
    <>
      <h1 className="page-title">{sme.company_name}</h1>
      <p className="page-sub">
        {sme.sme_one_id ? `เลขนิติบุคคล: ${sme.sme_one_id} · ` : ''}{sme.province ?? '—'}
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => setTab('overview')} style={tabStyle(tab === 'overview')}>
          ภาพรวม
        </button>
        <button onClick={() => setTab('packages')} style={tabStyle(tab === 'packages')}>
          บริการที่สนับสนุน ({packages.length})
        </button>
        <button onClick={() => setTab('profile')}
          style={{ ...tabStyle(tab === 'profile'), display: 'flex', alignItems: 'center', gap: 8 }}>
          โปรไฟล์กิจการ
          <span style={{
            background: info.bg, color: info.color, fontSize: 11,
            padding: '2px 8px', borderRadius: 10, fontWeight: 500,
          }}>
            ●
          </span>
        </button>
<button onClick={() => setTab('settings')}
          style={{ ...tabStyle(tab === 'settings'), marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>⚙️</span> ตั้งค่า
        </button>
      </div>
      {tab === 'overview' && (
        <>
          <div className="grid grid-2">
            <div className="card">
              <h2>คำขอรับการสนับสนุน</h2>
              <p className="empty">เร็ว ๆ นี้</p>
            </div>
            <div className="card">
              <h2>ผลตรวจสุขภาพธุรกิจ (Health Check)</h2>
              {health ? <HealthView h={health} /> : <p className="empty">ยังไม่ได้ทำแบบประเมิน 5 ด้าน</p>}
            </div>
          </div>

          <div className="card">
            <h2>บริการที่ฉันสมัคร ({myApplications.length})</h2>
            {myApplications.length === 0 ? (
              <p className="empty">ยังไม่ได้สมัครบริการ — ไปที่แท็บ "บริการที่สนับสนุน" เพื่อเลือกสมัคร</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {myApplications.map(app => {
                  const badge = packageStatusBadge(app.packages)
                  return (
                    <div key={app.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontWeight: 600 }}>{app.packages?.title ?? '—'}</div>
                        <div style={{ fontSize: 13, color: '#64748b' }}>
                          {app.packages?.profiles?.agency_name ?? ''}
                        </div>
                      </div>
                      {badge && (
                        <div style={{ marginTop: 8, background: badge.bg, color: badge.color,
                          padding: '6px 12px', borderRadius: 8, fontSize: 13, display: 'inline-block' }}>
                          {badge.label}
                        </div>
                      )}
                      <AppTimeline steps={app.steps} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
      {tab === 'packages' && (
        <SmePackages smeId={sme.id} packages={packages} appliedIds={appliedIds} savedIds={savedIds} />
      )}
      {tab === 'profile' && (
        <>
          <div style={{
            background: info.bg, color: info.color, padding: '10px 16px',
            borderRadius: 10, marginBottom: 16, fontSize: 14, fontWeight: 500,
          }}>
            สถานะข้อมูล: {info.label}
          </div>
          <ProfileForm sme={sme} />
        </>
      )}
      {tab === 'settings' && <ChangePassword />}
    </>
  )
}
function HealthView({ h }: { h: any }) {
  const rows = [
    ['การเงิน', h.score_finance],
    ['การตลาด', h.score_marketing],
    ['การดำเนินงาน', h.score_operations],
    ['บุคลากร', h.score_hr],
    ['นวัตกรรม', h.score_innovation],
  ]
  return (
    <div>
      {rows.map(([label, val]) => (
        <div key={label as string} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span>{label}</span><span>{val ?? 0}</span>
          </div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${val ?? 0}%` }} /></div>
        </div>
      ))}
      {h.recommendation && (
        <p style={{ marginTop: 14, fontSize: 14, color: 'var(--muted)' }}>
          <strong>คำแนะนำ:</strong> {h.recommendation}
        </p>
      )}
    </div>
  )
}
