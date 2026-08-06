'use client'
import { useState } from 'react'
import NewRequestForm from './NewRequestForm'
import ProfileForm from './ProfileForm'
import SmePackages from './SmePackages'

const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ',
  innovation: 'นวัตกรรม',
  management: 'บริหารจัดการ',
  marketing: 'การตลาด',
  production: 'การผลิต',
  upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'ยื่นแล้ว',
  screening: 'กำลังคัดกรอง',
  forwarded: 'ส่งต่อหน่วยงาน',
  in_review: 'หน่วยงานพิจารณา',
  approved: 'สำเร็จ',
  rejected: 'ไม่ผ่าน',
}

function Badge({ status }: { status: string }) {
  return <span className={`badge b-${status}`}>{STATUS_LABELS[status] ?? status}</span>
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

export default function SmeTabs({ sme, requests, health, packages, appliedIds }: { sme: any; requests: any[]; health: any; packages: any[]; appliedIds: string[] }) {
  const [tab, setTab] = useState<'overview' | 'packages' | 'profile'>('overview')
  const status = getStatus(sme)
  const info = STATUS_INFO[status]

  return (
    <>
      <h1 className="page-title">{sme.company_name}</h1>
      <p className="page-sub">
        {sme.sme_one_id ? `เลขนิติบุคคล: ${sme.sme_one_id} · ` : ''}{sme.province ?? '—'}
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => setTab('overview')}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', padding: '10px 4px', fontSize: 15,
            fontWeight: tab === 'overview' ? 600 : 400,
            color: tab === 'overview' ? '#1e3a8a' : '#64748b',
            borderBottom: tab === 'overview' ? '2px solid #1e3a8a' : '2px solid transparent',
          }}>
          ภาพรวม
        </button>
        <button onClick={() => setTab('packages')}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', padding: '10px 4px', fontSize: 15,
            fontWeight: tab === 'packages' ? 600 : 400,
            color: tab === 'packages' ? '#1e3a8a' : '#64748b',
            borderBottom: tab === 'packages' ? '2px solid #1e3a8a' : '2px solid transparent',
          }}>
          แพ็กเกจสนับสนุน ({packages.length})
        </button>
        <button onClick={() => setTab('profile')}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', padding: '10px 4px', fontSize: 15,
            fontWeight: tab === 'profile' ? 600 : 400,
            color: tab === 'profile' ? '#1e3a8a' : '#64748b',
            borderBottom: tab === 'profile' ? '2px solid #1e3a8a' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
          โปรไฟล์กิจการ
          <span style={{
            background: info.bg, color: info.color, fontSize: 11,
            padding: '2px 8px', borderRadius: 10, fontWeight: 500,
          }}>
            ●
          </span>
        </button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-2">
            <div className="card">
              <h2>คำขอรับการสนับสนุน</h2>
              {requests.length === 0 ? (
                <p className="empty">ยังไม่มีคำขอ — เริ่มยื่นคำขอด้านที่ต้องการได้เลย</p>
              ) : (
                <table>
                  <thead>
                    <tr><th>ด้าน</th><th>สถานะ</th><th>อัปเดตล่าสุด</th></tr>
                  </thead>
                  <tbody>
                    {requests.map(r => (
                      <>
                        <tr key={r.id}>
                          <td>{CATEGORY_LABELS[r.category]}</td>
                          <td><Badge status={r.status} /></td>
                          <td>{new Date(r.updated_at).toLocaleDateString('th-TH')}</td>
                        </tr>
                        {r.status === 'rejected' && r.reject_note && (
                          <tr key={r.id + '-note'}>
                            <td colSpan={3} style={{ padding: 0 }}>
                              <div style={{
                                background: '#fee2e2', color: '#991b1b',
                                padding: '8px 12px', borderRadius: 8,
                                fontSize: 13, margin: '2px 0 8px',
                                borderLeft: '3px solid #dc2626',
                              }}>
                                <strong>เหตุผลที่ไม่ผ่าน:</strong> {r.reject_note}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="card">
              <h2>ผลตรวจสุขภาพธุรกิจ (Health Check)</h2>
              {health ? <HealthView h={health} /> : <p className="empty">ยังไม่ได้ทำแบบประเมิน 5 ด้าน</p>}
            </div>
          </div>
          <div className="card">
            <h2>ยื่นคำขอใหม่</h2>
            <NewRequestForm smeId={sme.id} usedCategories={requests.map(r => r.category)} />
          </div>
        </>
      )}

      {tab === 'packages' && (
        <SmePackages smeId={sme.id} packages={packages} appliedIds={appliedIds} />
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
