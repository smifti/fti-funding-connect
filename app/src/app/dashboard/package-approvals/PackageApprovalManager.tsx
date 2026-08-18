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

type LogRow = {
  id: string
  new_status: string
  note: string | null
  changed_by_name: string | null
  changed_by_role: string | null
  created_at: string
}

type Pkg = {
  id: string
  owner_id: string
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
  profiles: { agency_name: string | null; full_name: string | null; agency_logo: string | null } | null
  package_approval_logs?: LogRow[]
}

type TabKey = 'pending' | 'approved' | 'rejected'

const STATUS_LABEL: Record<string, string> = {
  approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ', pending: 'กลับเป็นรอ',
}
const ROLE_LABEL: Record<string, string> = {
  admin: 'ผู้ดูแลระบบ', expert: 'ที่ปรึกษา',
}

// กลุ่มของบริการทั้งหมดที่เป็นของหน่วยงาน (agency) เดียวกัน ในแท็บสถานะเดียวกัน
type AgencyGroup = {
  ownerId: string
  agencyName: string
  agencyLogo: string | null
  packages: Pkg[]
}

// จัดกลุ่ม array ของ packages ตาม owner_id — คงลำดับเดิมของ packages ไว้ (agency แรกที่เจอ มาก่อน)
function groupByAgency(pkgs: Pkg[]): AgencyGroup[] {
  const groups: AgencyGroup[] = []
  const indexByOwner: Record<string, number> = {}

  for (const p of pkgs) {
    const key = p.owner_id ?? `__no_owner_${p.id}`
    if (indexByOwner[key] === undefined) {
      indexByOwner[key] = groups.length
      groups.push({
        ownerId: key,
        agencyName: p.profiles?.agency_name || p.profiles?.full_name || '—',
        agencyLogo: p.profiles?.agency_logo ?? null,
        packages: [],
      })
    }
    groups[indexByOwner[key]].packages.push(p)
  }
  return groups
}

export default function PackageApprovalManager({
  initial, applicantCounts, currentUser,
}: {
  initial: Pkg[]
  applicantCounts: Record<string, number>
  currentUser: { id: string; name: string; role: string }
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [detail, setDetail] = useState<Pkg | null>(null)
  const [tab, setTab] = useState<TabKey>('pending') // default = รออนุมัติ
  const [showLog, setShowLog] = useState<string | null>(null)

  async function decide(id: string, status: 'approved' | 'rejected' | 'pending', note: string | null = null) {
    setBusy(id); setMsg('')
    const { error } = await supabase
      .from('packages')
      .update({ approval_status: status })
      .eq('id', id)
    if (error) { setBusy(null); setMsg('เกิดข้อผิดพลาด: ' + error.message); return }

    // บันทึกประวัติการปรับปรุง — ใครเปลี่ยนสถานะเป็นอะไร เมื่อไหร่
    await supabase.from('package_approval_logs').insert({
      package_id: id,
      new_status: status,
      note,
      changed_by: currentUser.id,
      changed_by_name: currentUser.name,
      changed_by_role: currentUser.role,
    })

    setBusy(null)
    setRejectFor(null); setRejectNote('')
    router.refresh()
  }

  const pending = initial.filter(p => p.approval_status === 'pending')
  const approved = initial.filter(p => p.approval_status === 'approved')
  const rejected = initial.filter(p => p.approval_status === 'rejected')

  const pendingGroups = groupByAgency(pending)
  const approvedGroups = groupByAgency(approved)
  const rejectedGroups = groupByAgency(rejected)

  // แถวบรรทัดเดียวของบริการ 1 รายการ (ไม่โชว์ชื่อ agency ซ้ำ เพราะย้ายไปอยู่หัวการ์ดกลุ่มแล้ว)
  function compactRow(p: Pkg, statusLabel: { text: string; bg: string; color: string }, actions: React.ReactNode, extra?: React.ReactNode) {
    const logs = p.package_approval_logs ?? []
    return (
      <div key={p.id} style={{ borderTop: '1px solid #f1f5f9' }}>
        <div style={{ padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <span style={{ fontWeight: 600 }}>{p.title}</span>
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
        {logs.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <button
              onClick={() => setShowLog(showLog === p.id ? null : p.id)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e3a8a',
                fontSize: 13, padding: 0 }}>
              {showLog === p.id ? '▼' : '▶'} ประวัติการปรับปรุง ({logs.length})
            </button>
            {showLog === p.id && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {logs.map(log => (
                  <div key={log.id} style={{ fontSize: 12, color: '#475569',
                    background: '#f8fafc', borderRadius: 6, padding: '6px 10px' }}>
                    <strong>{log.changed_by_name ?? '—'}</strong>
                    <span style={{ color: '#94a3b8' }}> ({ROLE_LABEL[log.changed_by_role ?? ''] ?? log.changed_by_role})</span>
                    {' '}เปลี่ยนสถานะเป็น <strong>{STATUS_LABEL[log.new_status] ?? log.new_status}</strong>
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
  }

  // การ์ดกลุ่มของหน่วยงาน 1 แห่ง — หัวการ์ดโชว์โลโก้ + ชื่อ agency + จำนวนบริการ ข้างในลิสต์บริการทั้งหมดของ agency นั้น
  function agencyGroupCard(group: AgencyGroup, renderRow: (p: Pkg) => React.ReactNode) {
    return (
      <div key={group.ownerId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
              border: '1px solid #e2e8f0', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {group.agencyLogo ? (
                <img src={group.agencyLogo} alt={group.agencyName}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 22, color: '#cbd5e1' }}>🏢</span>
              )}
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>{group.agencyName}</span>
          </div>
          <span style={{ fontSize: 12, color: '#64748b' }}>{group.packages.length} บริการ</span>
        </div>
        <div>
          {group.packages.map(p => renderRow(p))}
        </div>
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

      {/* บริการที่รออนุมัติ — จัดกลุ่มตามหน่วยงาน + ปุ่มอนุมัติ/ไม่อนุมัติในแถว */}
      {tab === 'pending' && (
        pendingGroups.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              ไม่มีบริการที่รออนุมัติในขณะนี้
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pendingGroups.map(group => agencyGroupCard(group, p => compactRow(p,
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
                      onClick={() => decide(p.id, 'rejected', rejectNote.trim())}>
                      {busy === p.id ? '…' : 'ยืนยันไม่อนุมัติ'}
                    </button>
                    <button className="btn btn-sm btn-ghost" disabled={busy === p.id}
                      onClick={() => { setRejectFor(null); setRejectNote('') }}>
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : undefined
            )))}
          </div>
        )
      )}

      {/* บริการที่อนุมัติแล้ว — จัดกลุ่มตามหน่วยงาน */}
      {tab === 'approved' && (
        approvedGroups.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              ยังไม่มีบริการที่อนุมัติ
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {approvedGroups.map(group => agencyGroupCard(group, p => compactRow(p,
              { text: 'อนุมัติแล้ว', bg: '#dcfce7', color: '#166534' },
              <button className="btn btn-ghost btn-sm" disabled={busy === p.id}
                onClick={() => decide(p.id, 'pending')} style={{ color: '#dc2626' }}>
                {busy === p.id ? '…' : 'ถอนอนุมัติ'}
              </button>
            )))}
          </div>
        )
      )}

      {/* บริการที่ไม่ผ่าน — จัดกลุ่มตามหน่วยงาน */}
      {tab === 'rejected' && (
        rejectedGroups.length === 0 ? (
          <div className="card">
            <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>
              ไม่มีบริการที่ไม่ผ่าน
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rejectedGroups.map(group => agencyGroupCard(group, p => compactRow(p,
              { text: 'ไม่ผ่าน', bg: '#fee2e2', color: '#991b1b' },
              <button className="btn btn-ghost btn-sm" disabled={busy === p.id}
                onClick={() => decide(p.id, 'pending')} style={{ color: '#1e3a8a' }}>
                {busy === p.id ? '…' : 'นำกลับมาพิจารณา'}
              </button>
            )))}
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
