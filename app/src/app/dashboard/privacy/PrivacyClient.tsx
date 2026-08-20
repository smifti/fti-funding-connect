'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

type Consent = {
  id: string
  consent_type: string
  agency_name_snapshot: string | null
  package_title_snapshot: string | null
  consented_at: string
  withdrawn_at: string | null
}
type DsarRequest = {
  id: string
  request_type: string
  details: string | null
  status: string
  resolution_note: string | null
  created_at: string
  resolved_at: string | null
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

function formatDate(s: string | null) {
  if (!s) return '—'
  return new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function PrivacyClient({ consents, requests }: { consents: Consent[]; requests: DsarRequest[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [requestType, setRequestType] = useState('access')
  const [details, setDetails] = useState('')
  const [relatedConsentId, setRelatedConsentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit() {
    setLoading(true); setMsg('')
    const { error } = await supabase.from('dsar_requests').insert({
      request_type: requestType,
      details: details.trim() || null,
      related_consent_id: requestType === 'withdraw_consent' && relatedConsentId ? relatedConsentId : null,
    })
    setLoading(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setDetails(''); setRelatedConsentId(''); setShowForm(false)
    router.refresh()
  }

  return (
    <div>
      {/* ประวัติการยินยอม */}
      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>ประวัติการยินยอมของฉัน</h2>
        {consents.length === 0 ? (
          <p className="empty">ยังไม่มีประวัติการยินยอม</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {consents.map(c => (
              <div key={c.id} style={{
                border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 13,
                opacity: c.withdrawn_at ? 0.55 : 1,
              }}>
                <div style={{ fontWeight: 600 }}>
                  {c.consent_type === 'registration' ? '🔖 ยินยอมตอนสมัครสมาชิก' : '🔖 ยินยอมส่งข้อมูลไปยังสถาบันการเงิน'}
                  {c.withdrawn_at && <span style={{ color: '#dc2626', marginLeft: 8 }}>(ถอนความยินยอมแล้ว)</span>}
                </div>
                {c.consent_type === 'application' && (
                  <div style={{ color: '#475569', marginTop: 2 }}>
                    บริการ: {c.package_title_snapshot} · หน่วยงาน: {c.agency_name_snapshot}
                  </div>
                )}
                <div style={{ color: '#94a3b8', marginTop: 2 }}>
                  ยินยอมเมื่อ {formatDate(c.consented_at)}
                  {c.withdrawn_at && ` · ถอนเมื่อ ${formatDate(c.withdrawn_at)}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ยื่นคำขอใช้สิทธิ */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>ยื่นคำขอใช้สิทธิเจ้าของข้อมูล</h2>
          {!showForm && (
            <button className="btn btn-sm" onClick={() => setShowForm(true)}>+ ยื่นคำขอใหม่</button>
          )}
        </div>

        {showForm && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msg && <div className="alert alert-err">{msg}</div>}
            <div className="field">
              <label>ประเภทคำขอ</label>
              <select value={requestType} onChange={e => setRequestType(e.target.value)}>
                {Object.entries(REQUEST_TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {requestType === 'withdraw_consent' && consents.filter(c => !c.withdrawn_at).length > 0 && (
              <div className="field">
                <label>เลือกความยินยอมที่ต้องการถอน (ถ้าเจาะจง)</label>
                <select value={relatedConsentId} onChange={e => setRelatedConsentId(e.target.value)}>
                  <option value="">— ไม่เจาะจง / ถอนทั้งหมด —</option>
                  {consents.filter(c => !c.withdrawn_at).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.consent_type === 'registration' ? 'ยินยอมตอนสมัครสมาชิก' : `${c.package_title_snapshot} (${c.agency_name_snapshot})`}
                      {' — '}{formatDate(c.consented_at)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <label>รายละเอียดเพิ่มเติม {requestType !== 'withdraw_consent' && '(ระบุข้อมูลที่ต้องการให้ชัดเจน)'}</label>
              <textarea rows={4} value={details} onChange={e => setDetails(e.target.value)}
                placeholder="เช่น ต้องการแก้ไขเบอร์โทรศัพท์ที่ให้ไว้..." />
            </div>

            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              คำขอจะถูกส่งให้เจ้าหน้าที่ ส.อ.ท. ดำเนินการ ทั้งนี้การถอนความยินยอมจะไม่กระทบต่อการดำเนินการ
              ที่เกิดขึ้นโดยชอบด้วยกฎหมายก่อนการถอนความยินยอม
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" onClick={submit} disabled={loading}>
                {loading ? 'กำลังส่ง…' : 'ส่งคำขอ'}
              </button>
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); setMsg('') }} disabled={loading}>
                ยกเลิก
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ประวัติคำขอที่เคยยื่น */}
      <section className="card">
        <h2 style={{ fontSize: 16, margin: '0 0 12px' }}>ประวัติคำขอของฉัน</h2>
        {requests.length === 0 ? (
          <p className="empty">ยังไม่เคยยื่นคำขอ</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map(r => {
              const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending
              return (
                <div key={r.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{REQUEST_TYPE_LABEL[r.request_type] ?? r.request_type}</strong>
                    <span style={{ background: st.bg, color: st.color, fontSize: 12, fontWeight: 600,
                      borderRadius: 12, padding: '2px 10px' }}>{st.label}</span>
                  </div>
                  {r.details && <div style={{ color: '#475569', marginTop: 4 }}>{r.details}</div>}
                  <div style={{ color: '#94a3b8', marginTop: 4 }}>ยื่นเมื่อ {formatDate(r.created_at)}</div>
                  {r.resolution_note && (
                    <div style={{ background: '#f8fafc', borderRadius: 6, padding: 8, marginTop: 6 }}>
                      <strong>ผลการดำเนินการ:</strong> {r.resolution_note}
                      {r.resolved_at && <span style={{ color: '#94a3b8' }}> ({formatDate(r.resolved_at)})</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
