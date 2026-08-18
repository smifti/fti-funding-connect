'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import PackageDetailModal from '../shared-packages/PackageDetailModal'

const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ', innovation: 'นวัตกรรม', management: 'บริหารจัดการ',
  marketing: 'การตลาด', production: 'การผลิต', upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}
const SERVICE_INFO: Record<string, { label: string; bg: string; color: string; canApply: boolean; closedLabel?: string }> = {
  open: { label: '🟢 เปิดให้บริการ', bg: '#dcfce7', color: '#166534', canApply: true },
  paused: { label: '⚪ ปิดรับชั่วคราว', bg: '#f1f5f9', color: '#64748b', canApply: false, closedLabel: 'ปิดรับชั่วคราว' },
  ended: { label: '⚫ สิ้นสุดโครงการ', bg: '#e2e8f0', color: '#475569', canApply: false, closedLabel: 'สิ้นสุดโครงการ' },
}

type ImageMeta = {
  url: string
  filename: string
  size: number | null
  uploaded_at: string | null
}

// ต้อง match กับ type Pkg ใน PackageDetailModal.tsx เพื่อส่งผ่าน props ได้ตรง
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
  required_documents: string | null
  is_featured?: boolean
  package_rate_structures?: any | null
  profiles: {
    full_name: string | null
    agency_name: string | null
    agency_email: string | null
    phone: string | null
    agencies: {
      name: string | null
      logo: string | null
      description: string | null
      website: string | null
      email: string | null
      contact_name: string | null
      contact_phone: string | null
    } | null
  } | null
}

export default function SmePackages({
  smeId, packages, appliedIds, savedIds,
}: {
  smeId: string
  packages: Pkg[]
  appliedIds: string[]
  savedIds: string[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [applied, setApplied] = useState<string[]>(appliedIds)
  const [saved, setSaved] = useState<string[]>(savedIds)
  const [bookmarkBusy, setBookmarkBusy] = useState<string | null>(null)
  const [detail, setDetail] = useState<Pkg | null>(null)

  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [savedOnly, setSavedOnly] = useState(false)

  // deep-link: ถ้า URL มี ?package=xxx ให้เปิด modal ของแพ็กเกจนั้นอัตโนมัติ (ใช้ตอนคลิกลิงก์แชร์)
  useEffect(() => {
    const pkgId = searchParams.get('package')
    if (pkgId) {
      const found = packages.find(p => p.id === pkgId)
      if (found) setDetail(found)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const availableCats = useMemo(() => {
    const set = new Set(packages.map(p => p.category))
    return Array.from(set)
  }, [packages])

  const shown = useMemo(() => {
    let list = [...packages]
    if (catFilter !== 'all') list = list.filter(p => p.category === catFilter)
    if (savedOnly) list = list.filter(p => saved.includes(p.id))
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(p =>
        (p.title ?? '').toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.profiles?.agencies?.name ?? p.profiles?.agency_name ?? '').toLowerCase().includes(q) ||
        (p.support_items ?? '').toLowerCase().includes(q) ||
        (p.target_industry ?? '').toLowerCase().includes(q)
      )
    }
    if (sortBy === 'newest') list.sort((a: any, b: any) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    else if (sortBy === 'price_high') list.sort((a, b) => (b.price_amount ?? 0) - (a.price_amount ?? 0))
    else if (sortBy === 'price_low') list.sort((a, b) => (a.price_amount ?? 0) - (b.price_amount ?? 0))
    else if (sortBy === 'title') list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'th'))
    return list
  }, [packages, catFilter, search, sortBy, savedOnly, saved])

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

  async function toggleSave(pkgId: string) {
    setBookmarkBusy(pkgId)
    const { data, error } = await supabase.rpc('toggle_save_package', { p_package_id: pkgId })
    setBookmarkBusy(null)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setSaved(prev => data ? [...prev, pkgId] : prev.filter(id => id !== pkgId))
  }

  if (packages.length === 0) {
    return <p className="empty">ยังไม่มีบริการสนับสนุนในระบบ</p>
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
          placeholder="ค้นหาบริการ / หน่วยงาน / อุตสาหกรรม…"
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
        {saved.length > 0 && (
          <button onClick={() => setSavedOnly(prev => !prev)}
            style={chipStyle(savedOnly)}>
            ★ บันทึกไว้ ({saved.length})
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="empty">ไม่พบบริการที่ตรงกับเงื่อนไข</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {shown.map(p => {
            const isApplied = applied.includes(p.id)
            const isSaved = saved.includes(p.id)
            const svc = SERVICE_INFO[p.service_status ?? 'open'] ?? SERVICE_INFO.open
            const coverUrl = p.cover_square?.url || p.cover_banner?.url || p.image_url
            const agencyName = p.profiles?.agencies?.name || p.profiles?.agency_name || '—'
            return (
              <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
                background: '#fff', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {p.is_featured && (
                  <span style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 1,
                    background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 6,
                  }}>
                    แนะนำ
                  </span>
                )}
                <button
                  onClick={() => toggleSave(p.id)}
                  disabled={bookmarkBusy === p.id}
                  title={isSaved ? 'เลิกบันทึก' : 'บันทึกบริการนี้'}
                  style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 1,
                    width: 30, height: 30, borderRadius: '50%', border: 'none',
                    background: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontSize: 15,
                    color: isSaved ? '#1e3a8a' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  {isSaved ? '★' : '☆'}
                </button>
                <div style={{ width: '100%', aspectRatio: '3.2 / 1', background: '#f1f5f9', flexShrink: 0 }}>
                  {coverUrl ? (
                    <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    {agencyName}
                  </div>
                  {p.description && (
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 10px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.description}
                    </p>
                  )}
                  {(p.min_amount != null || p.max_amount != null || p.price_amount != null) && (
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a', marginBottom: 10 }}>
                      {p.min_amount != null || p.max_amount != null ? (
                        <>
                          {p.min_amount != null ? p.min_amount.toLocaleString('th-TH') : '—'}
                          {' - '}
                          {p.max_amount != null ? p.max_amount.toLocaleString('th-TH') : '—'} บาท
                        </>
                      ) : (
                        <>{p.price_amount!.toLocaleString('th-TH')} บาท</>
                      )}
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
                        {svc.closedLabel}
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
        <PackageDetailModal
          pkg={detail}
          applicantCount={0}
          onClose={() => setDetail(null)}
          mode="sme"
          isApplied={applied.includes(detail.id)}
          canApply={(SERVICE_INFO[detail.service_status ?? 'open'] ?? SERVICE_INFO.open).canApply}
          closedLabel={(SERVICE_INFO[detail.service_status ?? 'open'] ?? SERVICE_INFO.open).closedLabel}
          applying={busy === detail.id}
          onApply={() => apply(detail.id)}
          isSaved={saved.includes(detail.id)}
          onToggleSave={() => toggleSave(detail.id)}
          savingBookmark={bookmarkBusy === detail.id}
        />
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
