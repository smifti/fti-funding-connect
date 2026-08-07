'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ', innovation: 'นวัตกรรม', management: 'บริหารจัดการ',
  marketing: 'การตลาด', production: 'การผลิต', upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}
const SERVICE_INFO: Record<string, { label: string; bg: string; color: string; canApply: boolean }> = {
  open: { label: '🟢 เปิดให้บริการ', bg: '#dcfce7', color: '#166534', canApply: true },
  paused: { label: '⚪ ปิดรับชั่วคราว', bg: '#f1f5f9', color: '#64748b', canApply: false },
  ended: { label: '⚫ สิ้นสุดโครงการ', bg: '#e2e8f0', color: '#475569', canApply: false },
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
  service_status?: string
  created_at?: string
  profiles: { agency_name: string | null; agency_email: string | null; phone: string | null } | null
}

export default function SmePackages({
  smeId, packages, appliedIds,
}: {
  smeId: string
  packages: Pkg[]
  appliedIds: string[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [applied, setApplied] = useState<string[]>(appliedIds)
  const [detail, setDetail] = useState<Pkg | null>(null)

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  const availableCats = useMemo(() => {
    const set = new Set(packages.map(p => p.category))
    return Array.from(set)
  }, [packages])

  const shown = useMemo(() => {
    let list = [...packages]
    if (catFilter !== 'all') list = list.filter(p => p.category === catFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(p =>
        (p.title ?? '').toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.profiles?.agency_name ?? '').toLowerCase().includes(q) ||
        (p.support_items ?? '').toLowerCase().includes(q) ||
        (p.target_industry ?? '').toLowerCase().includes(q)
      )
    }
    if (sortBy === 'newest') list.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    else if (sortBy === 'price_high') list.sort((a, b) => (b.price_amount ?? 0) - (a.price_amount ?? 0))
    else if (sortBy === 'price_low') list.sort((a, b) => (a.price_amount ?? 0) - (b.price_amount ?? 0))
    else if (sortBy === 'title') list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'th'))
    return list
  }, [packages, catFilter, search, sortBy])

  async function apply(pkgId: string) {
    setBusy(pkgId); setMsg('')
    const { error } = await supabase.from('package_applications').insert({
      package_id: pkgId, sme_id: smeId,
    })
    setBusy(null)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setApplied(prev => [...prev, pkgId])
    setDetail(null)
    router.refresh()
  }

  if (packages.length === 0) {
    return <p className="empty">ยังไม่มีแพ็กเกจสนับสนุนในระบบ</p>
  }

  const inputStyle = {
    padding: '8px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #cbd5e1',
  } as const

  return (
    <div>
      {msg && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px',
          borderRadius: 8, marginBottom: 12, fontSize: 14 }}>{msg}</div>
      )}

      {/* แถบเครื่องมือ: ค้นหา + เรียง */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          placeholder="ค้นหาแพ็กเกจ / หน่วยงาน / อุตสาหกรรม…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={inputStyle} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">ใหม่ล่าสุด</option>
          <option value="price_high">วงเงินมาก → น้อย</option>
          <option value="price_low">วงเงินน้อย → มาก</option>
          <option value="title">ชื่อ (ก-ฮ)</option>
        </select>
      </div>

      {/* ปุ่มกรองตามด้าน */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={() => setCatFilter('all')}
          style={chipStyle(catFilter === 'all')}>
          ทั้งหมด ({packages.length})
        </button>
        {availableCats.map(c => {
          const count = packages.filter(p => p.category === c).length
          return (
            <button key={c} onClick={() => setCatFilter(c)}
              style={chipStyle(catFilter === c)}>
              {CATEGORY_LABELS[c] ?? c} ({count})
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <p className="empty">ไม่พบแพ็กเกจที่ตรงกับเงื่อนไข</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {shown.map(p => {
            const isApplied = applied.includes(p.id)
            const svc = SERVICE_INFO[p.service_status ?? 'open'] ?? SERVICE_INFO.open
            return (
              <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
                background: '#fff', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 140, background: '#f1f5f9', flexShrink: 0 }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: '#cbd5e1', fontSize: 13 }}>ไม่มีรูปภาพ</div>
                  )}
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 11,
                    padding: '2px 8px', borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6 }}>
                    {CATEGORY_LABELS[p.category] ?? p.category}
                  </span>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{p.title}</h3>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                    {p.profiles?.agency_name || '—'}
                  </div>
                  {p.description && (
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 10px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.description}
                    </p>
                  )}
                  {p.price_amount != null && (
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a', marginBottom: 10 }}>
                      {p.price_amount.toLocaleString('th-TH')} บาท
                      {p.price_note && <span style={{ fontSize: 12, fontWeight: 400, color: '#64748b' }}> · {p.price_note}</span>}
                    </div>
                  )}
                  {p.service_status && p.service_status !== 'open' && (
                    <div style={{ background: svc.bg, color: svc.color, fontSize: 12,
                      padding: '3px 10px', borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 }}>
                      {svc.label}
                    </div>
                  )}
                  <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDetail(p)}>รายละเอียด</button>
                    {isApplied ? (
                      <button className="btn btn-sm" disabled style={{ background: '#dcfce7', color: '#166534', border: 'none' }}>
                        ✓ สมัครแล้ว
                      </button>
                    ) : svc.canApply ? (
                      <button className="btn btn-sm" disabled={busy === p.id} onClick={() => apply(p.id)}>
                        {busy === p.id ? '…' : 'สนใจ / สมัคร'}
                      </button>
                    ) : (
                      <button className="btn btn-sm" disabled style={{ background: '#f1f5f9', color: '#94a3b8', border: 'none' }}>
                        {p.service_status === 'ended' ? 'สิ้นสุดโครงการ' : 'ปิดรับชั่วคราว'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12,
            maxWidth: 560, width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
            {detail.image_url && (
              <img src={detail.image_url} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover' }} />
            )}
            <div style={{ padding: 20 }}>
              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: 12,
                padding: '2px 10px', borderRadius: 8 }}>{CATEGORY_LABELS[detail.category] ?? detail.category}</span>
              <h2 style={{ margin: '10px 0 4px' }}>{detail.title}</h2>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                โดย: {detail.profiles?.agency_name || '—'}
              </div>
              {detail.service_status && detail.service_status !== 'open' && (
                <div style={{ background: (SERVICE_INFO[detail.service_status] ?? SERVICE_INFO.open).bg,
                  color: (SERVICE_INFO[detail.service_status] ?? SERVICE_INFO.open).color, fontSize: 13,
                  padding: '4px 12px', borderRadius: 8, display: 'inline-block', marginBottom: 12 }}>
                  {(SERVICE_INFO[detail.service_status] ?? SERVICE_INFO.open).label}
                </div>
              )}
              {detail.description && <p style={{ fontSize: 14, marginBottom: 14 }}>{detail.description}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: '#334155' }}>
                {detail.price_amount != null && <div><strong>วงเงิน:</strong> {detail.price_amount.toLocaleString('th-TH')} บาท {detail.price_note}</div>}
                {detail.funding_type && <div><strong>รูปแบบทุน:</strong> {detail.funding_type}</div>}
                {detail.support_items && <div><strong>สิ่งที่สนับสนุน:</strong> {detail.support_items}</div>}
                {detail.target_sme && <div><strong>SME ที่เหมาะสม:</strong> {detail.target_sme}</div>}
                {detail.target_industry && <div><strong>อุตสาหกรรมเป้าหมาย:</strong> {detail.target_industry}</div>}
                {detail.open_period && <div><strong>ระยะเวลาเปิดรับ:</strong> {detail.open_period}</div>}
                {(detail.profiles?.agency_email || detail.profiles?.phone) && (
                  <div><strong>ติดต่อ:</strong> {detail.profiles?.agency_email} {detail.profiles?.phone}</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                {applied.includes(detail.id) ? (
                  <button className="btn" disabled style={{ background: '#dcfce7', color: '#166534', border: 'none' }}>
                    ✓ สมัครแล้ว
                  </button>
                ) : (SERVICE_INFO[detail.service_status ?? 'open'] ?? SERVICE_INFO.open).canApply ? (
                  <button className="btn" disabled={busy === detail.id} onClick={() => apply(detail.id)}>
                    {busy === detail.id ? 'กำลังสมัคร…' : 'สนใจ / สมัคร'}
                  </button>
                ) : (
                  <button className="btn" disabled style={{ background: '#f1f5f9', color: '#94a3b8', border: 'none' }}>
                    {detail.service_status === 'ended' ? 'สิ้นสุดโครงการ' : 'ปิดรับชั่วคราว'}
                  </button>
                )}
                <button className="btn btn-ghost" onClick={() => setDetail(null)}>ปิด</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
