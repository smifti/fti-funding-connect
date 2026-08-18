'use client'
import { CATEGORY_LABELS } from './ApprovalManager'

type ApplicantUser = {
  id: string
  email: string
  full_name: string | null
  role: string
  requested_role: string | null
  agency_name: string | null
  agency_categories: string[] | null
  phone: string | null
  agency_email: string | null
  agency_website: string | null
  agency_description: string | null
  agency_logo: string | null
  created_at: string | null
}

const labelStyle = { fontSize: 12, color: '#94a3b8', fontWeight: 500 } as const
const valueStyle = { fontSize: 14, color: '#1e293b', marginTop: 2 } as const

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  )
}

export default function ApplicantDetailModal({
  user, onClose,
}: {
  user: ApplicantUser
  onClose: () => void
}) {
  const roleText = (user.role === 'agency' || user.requested_role === 'agency')
    ? 'หน่วยงาน / ผู้ให้บริการ'
    : 'ที่ปรึกษา / ผู้เชี่ยวชาญ'

  const createdText = user.created_at
    ? new Date(user.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 16,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '100%', maxWidth: 560,
          maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '18px 20px 0 20px',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{user.full_name || '—'}</h2>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>{user.email}</div>
            <div style={{ marginTop: 6 }}>
              <span style={{
                background: '#ece9fb', color: '#4733a8', fontSize: 12,
                padding: '3px 10px', borderRadius: 12,
              }}>
                {roleText}
              </span>
            </div>
          </div>
          <button onClick={onClose} aria-label="ปิด" style={{
            border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8',
            lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {user.agency_logo && (
              <div>
                <div style={{ ...labelStyle, marginBottom: 6 }}>โลโก้หน่วยงาน</div>
                <div style={{
                  width: 96, height: 96, borderRadius: 8, overflow: 'hidden',
                  border: '1px solid #e2e8f0', background: '#f8fafc',
                }}>
                  <img src={user.agency_logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Field label="เบอร์โทรศัพท์" value={user.phone} />
              <Field label="วันที่สมัคร" value={createdText} />
            </div>

            <Field label="ชื่อหน่วยงาน" value={user.agency_name} />
            <Field label="คำอธิบายหน่วยงาน" value={user.agency_description} />

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Field label="อีเมลหน่วยงาน" value={user.agency_email} />
              <Field
                label="เว็บไซต์หน่วยงาน"
                value={user.agency_website ? (
                  <a href={user.agency_website} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>
                    {user.agency_website}
                  </a>
                ) : null}
              />
            </div>

            {user.agency_categories && user.agency_categories.length > 0 && (
              <div>
                <div style={labelStyle}>ด้านที่ให้บริการ</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {user.agency_categories.map(c => (
                    <span key={c} style={{
                      background: '#e0f2fe', color: '#0369a1', fontSize: 12,
                      padding: '4px 8px', borderRadius: 12,
                    }}>
                      {CATEGORY_LABELS[c] ?? c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  )
}
