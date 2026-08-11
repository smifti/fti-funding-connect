'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ', innovation: 'นวัตกรรม', management: 'บริหารจัดการ',
  marketing: 'การตลาด', production: 'การผลิต', upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}
const TEMPLATE_LABELS: Record<string, string> = {
  loan: 'สินเชื่อ', grant: 'หน่วยงานให้ทุน / บริการอื่น ๆ',
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
  approval_status: string | null
  profiles: { agency_name: string | null; full_name: string | null } | null
}
export default function PackageApprovalManager({ initial }: { initial: Pkg[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  async function decide(id: string, status: 'approved' | 'rejected') {
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

  // แยกบริการเป็น 2 กลุ่ม
  const pending = initial.filter(p => p.approval_status === 'pending')
  const approved = initial.filter(p => p.approval_status === 'approved')

  // การ์ดบริการ 1 ใบ
  function renderCard(p: Pkg, showActions: boolean) {
    return (
      <div key={p.id} className="card">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {p.image_url && (
            <img src={p.image_url} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: 12, padding: '2px 10px', borderRadius: 10 }}>
                {TEMPLATE_LABELS[p.template_type] ?? p.template_type}
              </span>
              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 12, padding: '2px 10px', borderRadius: 10 }}>
                {CATEGORY_LABELS[p.category] ?? p.category}
              </span>
              {p.approval_status === 'approved' && (
                <span style={{ background: '#dcfce7', color: '#166534', fontSize: 12, padding: '2px 10px', borderRadius: 10, fontWeight: 600 }}>
                  อนุมัติแล้ว
                </span>
              )}
            </div>
            <h2 style={{ margin: '0 0 4px' }}>{p.title}</h2>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
              โดย: {p.profiles?.agency_name || p.profiles?.full_name || '—'}
            </div>
            {p.description && <p style={{ fontSize: 14, margin: '0 0 8px' }}>{p.description}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 13, color: '#475569' }}>
              {p.price_amount != null && <div><strong>วงเงิน:</strong> {p.price_amount.toLocaleString('th-TH')} บาท {p.price_note}</div>}
              {p.funding_type && <div><strong>รูปแบบทุน:</strong> {p.funding_type}</div>}
              {p.support_items && <div><strong>สิ่งที่สนับสนุน:</strong> {p.support_items}</div>}
              {p.target_sme && <div><strong>SME ที่เหมาะ:</strong> {p.target_sme}</div>}
              {p.target_industry && <div><strong>อุตสาหกรรม:</strong> {p.target_industry}</div>}
              {p.open_period && <div><strong>เปิดรับ:</strong> {p.open_period}</div>}
            </div>
          </div>
        </div>
        {showActions && (
          rejectFor === p.id ? (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          ) : (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
              <button className="btn btn-sm" disabled={busy === p.id}
                onClick={() => decide(p.id, 'approved')}>
                {busy === p.id ? 'กำลังบันทึก…' : 'อนุมัติ'}
              </button>
              <button className="btn btn-sm btn-ghost" disabled={busy === p.id}
                onClick={() => { setRejectFor(p.id); setRejectNote(''); setMsg('') }}
                style={{ color: '#dc2626' }}>
                ไม่อนุมัติ
              </button>
            </div>
          )
        )}
        {/* บริการที่อนุมัติแล้ว — มีปุ่มถอนอนุมัติ (กลับเป็นรอ) */}
        {!showActions && p.approval_status === 'approved' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
            <button className="btn btn-sm btn-ghost" disabled={busy === p.id}
              onClick={() => decide(p.id, 'rejected')}
              style={{ color: '#dc2626' }}>
              {busy === p.id ? '…' : 'ถอนอนุมัติ'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {msg && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px',
          borderRadius: 8, fontSize: 14 }}>{msg}</div>
      )}

      {/* บริการที่รออนุมัติ */}
      <div>
        <h2 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          บริการที่รออนุมัติ
          <span style={{ background: pending.length > 0 ? '#dc2626' : '#94a3b8', color: '#fff',
            fontSize: 13, fontWeight: 700, borderRadius: 12, padding: '2px 10px' }}>
            {pending.length}
          </span>
        </h2>
        {pending.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              ไม่มีบริการที่รออนุมัติในขณะนี้
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pending.map(p => renderCard(p, true))}
          </div>
        )}
      </div>

      {/* บริการที่อนุมัติแล้ว */}
      <div>
        <h2 style={{ margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          บริการที่อนุมัติแล้ว
          <span style={{ background: '#166534', color: '#fff',
            fontSize: 13, fontWeight: 700, borderRadius: 12, padding: '2px 10px' }}>
            {approved.length}
          </span>
        </h2>
        {approved.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              ยังไม่มีบริการที่อนุมัติ
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {approved.map(p => renderCard(p, false))}
          </div>
        )}
      </div>
    </div>
  )
}
