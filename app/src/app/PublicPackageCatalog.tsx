'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ', innovation: 'นวัตกรรม', management: 'บริหารจัดการ',
  marketing: 'การตลาด', production: 'การผลิต', upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}

type ImageMeta = { url: string } | null

type PublicPkg = {
  id: string
  category: string
  title: string
  description: string | null
  price_amount: number | null
  price_note: string | null
  min_amount: number | null
  max_amount: number | null
  package_type: string | null
  service_status: string
  is_featured: boolean
  created_at: string
  cover_banner: ImageMeta
  cover_square: ImageMeta
  image_url: string | null
  agency_name: string | null
  agency_logo: string | null
}

export default function PublicPackageCatalog({ packages }: { packages: PublicPkg[] }) {
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
        (p.agency_name ?? '').toLowerCase().includes(q)
      )
    }
    if (sortBy === 'newest') list.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    else if (sortBy === 'price_high') list.sort((a, b) => (b.price_amount ?? 0) - (a.price_amount ?? 0))
    else if (sortBy === 'price_low') list.sort((a, b) => (a.price_amount ?? 0) - (b.price_amount ?? 0))
    else if (sortBy === 'title') list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'th'))
    // บริการที่ "แนะนำ" ขึ้นก่อนเสมอ ไม่ว่าจะเรียงแบบไหน
    list.sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
    return list
  }, [packages, catFilter, search, sortBy])

  const inputStyle = {
    padding: '8px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #cbd5e1',
  } as const

  if (packages.length === 0) {
    return <p className="empty">ยังไม่มีบริการสนับสนุนในระบบ</p>
  }

  return (
    <div>
      {/* แถบเครื่องมือ: ค้นหา + เรียง */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          placeholder="ค้นหาบริการ / หน่วยงาน…"
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
        <button onClick={() => setCatFilter('all')} style={chipStyle(catFilter === 'all')}>
          ทั้งหมด ({packages.length})
        </button>
        {availableCats.map(c => {
          const count = packages.filter(p => p.category === c).length
          return (
            <button key={c} onClick={() => setCatFilter(c)} style={chipStyle(catFilter === c)}>
              {CATEGORY_LABELS[c] ?? c} ({count})
            </button>
          )
        })}
      </div>

      {shown.length === 0 ? (
        <p className="empty">ไม่พบบริการที่ตรงกับเงื่อนไข</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {shown.map(p => {
            const coverUrl = p.cover_square?.url || p.cover_banner?.url || p.image_url
            return (
              <Link key={p.id} href={`/p/${p.id}`} style={{
                border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden',
                background: '#fff', display: 'flex', flexDirection: 'column',
                textDecoration: 'none', color: 'inherit', position: 'relative',
              }}>
                {p.is_featured && (
                  <span style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 1,
                    background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 600,
                    padding: '3px 10px', borderRadius: 6,
                  }}>
                    แนะนำ
                  </span>
                )}
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
                    {p.agency_name || '—'}
                  </div>
                  {p.description && (
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 10px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.description}
                    </p>
                  )}
                  {(p.min_amount != null || p.max_amount != null || p.price_amount != null) && (
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a8a', marginTop: 'auto' }}>
                      {p.min_amount != null || p.max_amount != null ? (
                        <>
                          {p.min_amount != null ? p.min_amount.toLocaleString('th-TH') : '—'}
                          {' - '}
                          {p.max_amount != null ? p.max_amount.toLocaleString('th-TH') : '—'} บาท
                        </>
                      ) : (
                        <>{p.price_amount!.toLocaleString('th-TH')} บาท</>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
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
