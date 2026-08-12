'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import PackageDetailModal from '../shared-packages/PackageDetailModal'

type ImageMeta = {
  url: string
  filename: string
  size: number | null
  uploaded_at: string | null
}

type Pkg = {
  id: string
  template_type: string
  category: string
  title: string
  description: string | null
  price_amount: number | null
  price_note: string | null
  funding_type: string | null
  support_items: string | null
  target_sme: string | null
  target_industry: string | null
  open_period: string | null
  image_url: string | null
  approval_status: string
  is_active: boolean
  service_status: string
  package_type: string | null
  related_sectors: string[] | null
  min_amount: number | null
  max_amount: number | null
  eligibility_criteria: string | null
  loan_term: string | null
  collateral_required: string | null
  collateral_detail: string | null
  cover_banner: ImageMeta | null
  cover_square: ImageMeta | null
  detail_images: ImageMeta[] | null
  package_rate_structures?: any | null
  profiles: { agency_name: string | null; full_name: string | null } | null
}

type TabKey = 'pending' | 'approved' | 'rejected'

export default function PackageApprovalManager({
  initial, applicantCounts,
}: {
  initial: Pkg[]
  applicantCounts: Record<string, number>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [detail, setDetail] = useState<Pkg | null>(null)
  const [tab, setTab] = useState<TabKey>('pending') // default = รออนุมัติ

  async function decide(id: string, status: 'approved' | 'rejected' | 'pending') {
    setBusy(id); setMsg('')
    const { error } = await supabase
      .from('packages')
      .update({ approval_status: status })
      .eq('id', id)
    setBusy(null)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setRejectFor(null); setRejectNote('')
    router.refresh()
  }

  const pending = initial.filter(p => p.approval_status === 'pending')
  const approved = initial.filter(p => p.approval_status === 'approved')
  const rejected = initial.filter(p => p.approval_status === 'rejected')

  // แถวบรรทัดเดียว
  function compactRow(p: Pkg, statusLabel: { text: string; bg: string; color: string }, actions: React.ReactNode, extra?: React.ReactNode) {
    return (
      <div key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
        <div style={{ padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <span style={{ fontWeight: 600 }}>{p.title}</span>
            <span style={{ fontSize: 13, color: '#64748b' }}> · {p.profiles?.agency_name || p.profiles?.full_name || '—'}</span>
          </div>
          <span style={{ background: statusLabel.bg, color: statusLabel.color, fontSize: 12,
            padding: '2px 10px', borderRadius: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {statusLabel.text}
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setDetail(p)}>รายละเอียด</button>
            {actions}
          </div>
        </div>
        {extra}
      </div>
    )
  }

  const tabConfig: { key: TabKey; label: string; count: number; badgeBg: string }[] = [
    { key: 'pending', label: 'บริการที่รออนุมัติ', count: pending.length, badgeBg: pending.length > 0 ? '#dc2626' : '#94a3b8' },
    { key: 'approved', label: 'บริการที่อนุมัติแล้ว', count: approved.length, badgeBg: '#166534' },
    { key: 'rejected', label: 'บริการที่ไม่ผ่าน', count: rejected.length, badgeBg: rejected.length > 0 ? '#991b1b' : '#94a3b8' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {msg && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px',
          borderRadius: 8, fontSize: 14 }}>{msg}</div>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', flexWrap: 'wrap' }}>
        {tabConfig.map(t => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 15, fontWeight: 600,
                color: active ? '#1e3a8a' : '#64748b',
                borderBottom: active ? '2px solid #1e3a8a' : '2px solid transparent',
                marginBottom: -2,
              }}>
              {t.label}
              <span style={{
                background: t.badgeBg, color: '#fff',
                fontSize: 12, fontWeight: 700, borderRadius: 12, padding: '2px 9px',
              }}>
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* บริการที่รออนุมัติ — บรรทัดเดียว + ปุ่มอนุมัติ/ไม่อนุมัติในแถว */}
      {tab === 'pending' && (
        pending.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              ไม่มีบริการที่รออนุมัติในขณะนี้
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {pending.map(p => compactRow(p,
              { text: 'รออนุมัติ', bg: '#fef9c3', color: '#a16207' },
              <>
                <button className="btn btn-sm" disabled={busy === p.id}
                  onClick={() => decide(p.id, 'approved')}>
                  {busy === p.id ? '…' : 'อนุมัติ'}
                </button>
                <button className="btn btn-ghost btn-sm" disabled={busy === p.id}
                  onClick={() => { setRejectFor(rejectFor === p.id ? null : p.id); setRejectNote(''); setMsg('') }}
                  style={{ color: '#dc2626' }}>
                  ไม่อนุมัติ
                </button>
              </>,
              // ช่องกรอกเหตุผล (กางใต้แถวเมื่อกดไม่อนุมัติ)
              rejectFor === p.id ? (
                <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    autoFocus
                    placeholder="เหตุผลที่ไม่อนุมัติ (ผู้ให้บริการจะเห็นข้อความนี้)"
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    rows={2}
                    style={{ width: '100%', fontSize: 13, padding: 8, borderRadius: 8, border: '1px solid #cbd5e1' }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm" disabled={busy === p.id}
                      onClick={() => decide(p.id, 'rejected')}>
                      {busy === p.id ? '…' : 'ยืนยันไม่อนุมัติ'}
                    </button>
                    <button className="btn btn-sm btn-ghost" disabled={busy === p.id}
                      onClick={() => { setRejectFor(null); setRejectNote('') }}>
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : undefined
            ))}
          </div>
        )
      )}

      {/* บริการที่อนุมัติแล้ว */}
      {tab === 'approved' && (
        approved.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              ยังไม่มีบริการที่อนุมัติ
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {approved.map(p => compactRow(p,
              { text: 'อนุมัติแล้ว', bg: '#dcfce7', color: '#166534' },
              <button className="btn btn-ghost btn-sm" disabled={busy === p.id}
                onClick={() => decide(p.id, 'pending')} style={{ color: '#dc2626' }}>
                {busy === p.id ? '…' : 'ถอนอนุมัติ'}
              </button>
            ))}
          </div>
        )
      )}

      {/* บริการที่ไม่ผ่าน */}
      {tab === 'rejected' && (
        rejected.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              ไม่มีบริการที่ไม่ผ่าน
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {rejected.map(p => compactRow(p,
              { text: 'ไม่ผ่าน', bg: '#fee2e2', color: '#991b1b' },
              <button className="btn btn-ghost btn-sm" disabled={busy === p.id}
                onClick={() => decide(p.id, 'pending')} style={{ color: '#1e3a8a' }}>
                {busy === p.id ? '…' : 'นำกลับมาพิจารณา'}
              </button>
            ))}
          </div>
        )
      )}

      {/* Modal รายละเอียดบริการ — ใช้ pattern เดียวกับฝั่ง agency */}
      {detail && (
        <PackageDetailModal
          pkg={detail}
          applicantCount={applicantCounts[detail.id] ?? 0}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  )
}
