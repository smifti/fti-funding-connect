'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { rateStructureFromRow } from './RateStructureTab'

const APPROVAL_LABELS: Record<string, { text: string; bg: string; color: string }> = {
  pending: { text: 'รออนุมัติ', bg: '#fef9c3', color: '#a16207' },
  approved: { text: 'อนุมัติแล้ว', bg: '#dcfce7', color: '#166534' },
  rejected: { text: 'ไม่อนุมัติ', bg: '#fee2e2', color: '#991b1b' },
}
const SERVICE_LABELS: Record<string, string> = {
  open: '🟢 เปิดให้บริการ',
  paused: '⚪ ปิดรับชั่วคราว',
  ended: '⚫ สิ้นสุดโครงการ',
}
const RATE_TYPE_LABELS: Record<string, string> = {
  fixed: 'อัตราคงที่ (Fixed Rate)',
  range: 'ช่วงอัตราดอกเบี้ย (Rate Range)',
  reference: 'อัตราอ้างอิง (Reference Rate)',
  step: 'อัตราแบบขั้นบันได (Step Rate)',
  case_by_case: 'ตามการพิจารณา (Case-by-case)',
}
const RATE_UNIT_LABELS: Record<string, string> = {
  year: '% ต่อปี',
  month: '% ต่อเดือน',
  day: '% ต่อวัน',
}
const FEE_UNIT_LABELS: Record<string, string> = {
  percent_of_credit: '% ของวงเงินกู้',
  baht: 'บาท',
  baht_per_year: 'บาท/ปี',
}
const FEE_CHARGED_WHEN_LABELS: Record<string, string> = {
  on_approval: 'เมื่ออนุมัติวงเงิน',
  before_contract: 'ก่อนทำสัญญา',
  yearly: 'รายปี',
}

type ImageMeta = {
  url: string
  filename: string
  size: number | null
  uploaded_at: string | null
}

type FaqRow = {
  id: string
  question: string
  answer: string
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
  required_documents?: string | null
  is_featured?: boolean
  package_rate_structures?: any | null
  profiles?: {
    agency_name: string | null
    full_name: string | null
    agency_email?: string | null
    phone?: string | null
    agencies?: {
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

// การ์ดข้อมูลมีไอคอน — ใช้แสดงคุณสมบัติ/รายละเอียดต่าง ๆ ในแท็บข้อมูลทั่วไป
function IconCard({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px',
    }}>
      <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 14, color: '#1e293b', marginTop: 2, fontWeight: 600 }}>{value}</div>
      </div>
    </div>
  )
}

// รายการเช็คลิสต์สีเขียว — ใช้กับ "จุดเด่น" (แยกทีละบรรทัดจาก description)
function Checklist({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: '#334155' }}>
          <span style={{ color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>✓</span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

function Lightbox({
  images, startIndex, onClose,
}: {
  images: string[]
  startIndex: number
  onClose: () => void
}) {
  const [idx, setIdx] = useState(startIndex)

  function prev(e?: React.MouseEvent) { e?.stopPropagation(); setIdx(i => (i === 0 ? images.length - 1 : i - 1)) }
  function next(e?: React.MouseEvent) { e?.stopPropagation(); setIdx(i => (i === images.length - 1 ? 0 : i + 1)) }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 24,
      }}>
      <button onClick={onClose} aria-label="ปิด" style={{
        position: 'absolute', top: 16, right: 20, border: 'none', background: 'none',
        color: '#fff', fontSize: 28, cursor: 'pointer', lineHeight: 1, padding: 8,
      }}>×</button>

      <img
        src={images[idx]}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }}
      />

      {images.length > 1 && (
        <>
          <button onClick={prev} aria-label="ก่อนหน้า" style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontSize: 22,
          }}>‹</button>
          <button onClick={next} aria-label="ถัดไป" style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            width: 44, height: 44, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontSize: 22,
          }}>›</button>
          <div style={{
            position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13,
            padding: '4px 12px', borderRadius: 12,
          }}>
            {idx + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  )
}

function ImageSlider({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  if (images.length === 0) return null

  const CARD_W = 190
  const GAP = 12

  function prev() { setIdx(i => Math.max(0, i - 1)) }
  function next() { setIdx(i => Math.min(images.length - 1, i + 1)) }

  return (
    <div style={{ position: 'relative', padding: '0 4px' }}>
      <div style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex', gap: GAP,
          transform: `translateX(-${idx * (CARD_W + GAP)}px)`,
          transition: 'transform .3s ease',
        }}>
          {images.map((url, i) => (
            <button key={url + i} type="button" onClick={() => setLightboxIdx(i)}
              title="คลิกเพื่อดูขนาดจริง"
              style={{
                flex: `0 0 ${CARD_W}px`, width: CARD_W, height: CARD_W * 1.35,
                borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0',
                padding: 0, cursor: 'zoom-in', background: '#f1f5f9',
              }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </button>
          ))}
        </div>
      </div>

      {images.length > 1 && idx > 0 && (
        <button type="button" onClick={prev} aria-label="ก่อนหน้า" style={{
          position: 'absolute', left: -16, top: 'calc(50% - 10px)', transform: 'translateY(-50%)',
          width: 36, height: 36, borderRadius: '50%', border: '1px solid #e2e8f0',
          background: '#fff', color: '#334155', cursor: 'pointer', fontSize: 18,
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 2,
        }}>‹</button>
      )}
      {images.length > 1 && idx < images.length - 1 && (
        <button type="button" onClick={next} aria-label="ถัดไป" style={{
          position: 'absolute', right: -16, top: 'calc(50% - 10px)', transform: 'translateY(-50%)',
          width: 36, height: 36, borderRadius: '50%', border: '1px solid #e2e8f0',
          background: '#fff', color: '#334155', cursor: 'pointer', fontSize: 18,
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 2,
        }}>›</button>
      )}

      {images.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12 }}>
          {images.map((_, i) => (
            <button key={i} type="button" onClick={() => setIdx(i)}
              aria-label={`ไปที่ภาพที่ ${i + 1}`}
              style={{
                width: i === idx ? 18 : 7, height: 7, borderRadius: 4, border: 'none', padding: 0,
                background: i === idx ? '#1e3a8a' : '#cbd5e1', cursor: 'pointer', transition: 'all .2s',
              }} />
          ))}
        </div>
      )}

      {lightboxIdx !== null && (
        <Lightbox images={images} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </div>
  )
}

export default function PackageDetailModal({
  pkg, applicantCount, onClose,
  mode = 'agency',
  canApply = false, isApplied = false, applying = false, onApply, closedLabel,
  isSaved = false, onToggleSave, savingBookmark = false,
}: {
  pkg: Pkg
  applicantCount: number
  onClose: () => void
  mode?: 'sme' | 'agency' | 'admin'
  canApply?: boolean
  isApplied?: boolean
  applying?: boolean
  onApply?: () => void
  closedLabel?: string
  isSaved?: boolean
  onToggleSave?: () => void
  savingBookmark?: boolean
}) {
  const supabase = createClient()
  const isLoan = pkg.package_type === 'สินเชื่อ'
  const [tab, setTab] = useState<'main' | 'conditions' | 'rate' | 'fees' | 'documents' | 'faq'>('main')
  const ap = APPROVAL_LABELS[pkg.approval_status] ?? APPROVAL_LABELS.pending

  // ป้าย "แนะนำ" — เก็บ state ในตัวเอง เพื่อ toggle ได้ทันทีโดยไม่ต้องรอ refresh หน้า (เฉพาะ mode admin)
  const [featured, setFeatured] = useState(!!pkg.is_featured)
  const [featuredBusy, setFeaturedBusy] = useState(false)
  async function toggleFeatured() {
    setFeaturedBusy(true)
    const next = !featured
    const { error } = await supabase.rpc('admin_set_package_featured', { p_package_id: pkg.id, p_featured: next })
    setFeaturedBusy(false)
    if (!error) setFeatured(next)
  }

  // ปุ่มแชร์ — ใช้ URL ปัจจุบันของหน้า พร้อมแนบ ?package=<id> เพื่อให้เปิดลิงก์แล้วขึ้น modal นี้ตรงกัน
  const [shareCopied, setShareCopied] = useState(false)
  function getShareUrl() {
    if (typeof window === 'undefined') return ''
    const url = new URL(window.location.href)
    url.searchParams.set('package', pkg.id)
    return url.toString()
  }
  function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`, '_blank', 'noopener,width=600,height=500')
  }
  function shareLine() {
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(getShareUrl())}`, '_blank', 'noopener,width=600,height=500')
  }
  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl())
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // เบราว์เซอร์บางตัวไม่รองรับ clipboard API — เงียบไว้ ไม่ต้อง error รบกวนผู้ใช้
    }
  }

  const [faqs, setFaqs] = useState<FaqRow[] | null>(null)
  useEffect(() => {
    if (tab === 'faq' && faqs === null) {
      supabase.rpc('list_package_faqs', { p_package_id: pkg.id }).then(({ data, error }) => {
        if (!error) setFaqs(data ?? [])
      })
    }
  }, [tab])

  const detailImageUrls = (pkg.detail_images ?? []).map(img => img.url)
  const sliderImages = detailImageUrls.length > 0
    ? detailImageUrls
    : (!pkg.cover_banner && !pkg.cover_square && pkg.image_url ? [pkg.image_url] : [])

  const rate = isLoan ? rateStructureFromRow(pkg.package_rate_structures) : null

  const agency = pkg.profiles?.agencies
  const agencyDisplayName = agency?.name || pkg.profiles?.agency_name || pkg.profiles?.full_name || '—'
  const agencyLogo = agency?.logo
  const agencyContact = [agency?.contact_phone || pkg.profiles?.phone, agency?.email || pkg.profiles?.agency_email]
    .filter(Boolean).join(' · ')

  const documentList = (pkg.required_documents ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  // จุดเด่น — แยกทีละบรรทัดจาก description ให้เป็นเช็คลิสต์
  const highlightList = (pkg.description ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  // เหมาะสำหรับ — แยกทีละบรรทัดจาก support_items
  const suitableForList = (pkg.support_items ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)

  const amountText = pkg.min_amount != null || pkg.max_amount != null
    ? `${pkg.min_amount != null ? pkg.min_amount.toLocaleString('th-TH') : '—'} - ${pkg.max_amount != null ? pkg.max_amount.toLocaleString('th-TH') : '—'} บาท`
    : pkg.price_amount != null ? `${pkg.price_amount.toLocaleString('th-TH')} บาท` : null

  const durationText = isLoan ? pkg.loan_term : pkg.open_period

  const tabBtnStyle = (active: boolean) => ({
    padding: '9px 16px', border: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' as const, borderRadius: 8,
    color: active ? '#fff' : '#475569',
    background: active ? '#1e3a8a' : 'transparent',
    transition: 'all .15s',
  } as const)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 16,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 1120,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>

        {/* ปุ่มปิด ลอยมุมขวาบนเสมอ */}
        <button onClick={onClose} aria-label="ปิด" style={{
          position: 'absolute', top: 24, right: 24, zIndex: 20,
          width: 32, height: 32, borderRadius: '50%', border: 'none',
          background: 'rgba(15,23,42,0.55)', color: '#fff', cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}>×</button>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>

            {/* ===== Sidebar ซ้าย ===== */}
            <div style={{
              flex: '0 0 300px', minWidth: 260,
              borderRight: '1px solid #e2e8f0', padding: '24px 20px',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: 14, border: '1px solid #e2e8f0',
                background: '#f8fafc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pkg.cover_square ? (
                  <img src={pkg.cover_square.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : agencyLogo ? (
                  <img src={agencyLogo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 28 }}>🏢</span>
                )}
              </div>

              <div>
                <h2 style={{ margin: 0, fontSize: 17, color: '#1e293b', lineHeight: 1.3 }}>{pkg.title}</h2>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{agencyDisplayName}</div>
                {mode !== 'sme' && (
                  <span style={{
                    display: 'inline-block', marginTop: 6,
                    background: ap.bg, color: ap.color, fontSize: 12,
                    padding: '3px 10px', borderRadius: 12,
                  }}>
                    {ap.text}
                  </span>
                )}
                {pkg.approval_status === 'approved' && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                    {SERVICE_LABELS[pkg.service_status] ?? pkg.service_status}
                  </div>
                )}
                {mode !== 'sme' && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>ผู้สมัคร {applicantCount} ราย</div>
                )}
              </div>

              {/* ปุ่มติดต่อ/สมัคร */}
              {mode === 'sme' && (
                isApplied ? (
                  <button className="btn" disabled style={{ background: '#dcfce7', color: '#166534', border: 'none' }}>
                    ✓ สมัครแล้ว
                  </button>
                ) : canApply ? (
                  <button className="btn" disabled={applying} onClick={onApply}>
                    {applying ? 'กำลังสมัคร…' : 'สนใจ / สมัคร'}
                  </button>
                ) : (
                  <button className="btn" disabled style={{ background: '#f1f5f9', color: '#94a3b8', border: 'none' }}>
                    {closedLabel ?? 'ปิดรับสมัคร'}
                  </button>
                )
              )}

              {/* ปุ่มบันทึกแพ็กเกจนี้ (เฉพาะ SME) */}
              {mode === 'sme' && onToggleSave && (
                <button
                  className="btn btn-ghost"
                  disabled={savingBookmark}
                  onClick={onToggleSave}
                  style={isSaved ? { color: '#1e3a8a', borderColor: '#1e3a8a' } : undefined}>
                  {isSaved ? '★ บันทึกแล้ว' : '☆ บันทึกบริการนี้'}
                </button>
              )}

              {/* ปุ่ม toggle ป้าย "แนะนำ" (เฉพาะ admin) */}
              {mode === 'admin' && (
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={featuredBusy}
                  onClick={toggleFeatured}
                  style={featured ? { color: '#166534', borderColor: '#166534' } : undefined}>
                  {featuredBusy ? 'กำลังบันทึก…' : featured ? '✓ ตั้งเป็นแนะนำแล้ว' : '☆ ตั้งเป็นแนะนำ'}
                </button>
              )}

              {mode === 'sme' && agencyContact && (
                <div style={{ fontSize: 12, color: '#64748b' }}>ติดต่อ: {agencyContact}</div>
              )}

              {/* แถบแชร์ */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#94a3b8' }}>แชร์:</span>
                <button type="button" onClick={shareLine} title="แชร์ผ่าน LINE" style={{
                  width: 30, height: 30, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff',
                  cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>💬</button>
                <button type="button" onClick={shareFacebook} title="แชร์ผ่าน Facebook" style={{
                  width: 30, height: 30, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff',
                  cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>📘</button>
                <button type="button" onClick={copyShareLink} title="คัดลอกลิงก์" style={{
                  width: 30, height: 30, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff',
                  cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>🔗</button>
                {shareCopied && <span style={{ fontSize: 11, color: '#16a34a' }}>คัดลอกแล้ว!</span>}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <IconCard icon="🏦" label="ประเภทบริการ" value={pkg.category} />
                <IconCard icon="🎯" label="กลุ่มเป้าหมาย" value={pkg.target_sme} />
                <IconCard icon="🏭" label="อุตสาหกรรมเป้าหมาย" value={pkg.target_industry} />
                <IconCard icon="💰" label="วงเงิน" value={amountText} />
                <IconCard icon="📅" label={isLoan ? 'ระยะเวลากู้' : 'ระยะเวลาเปิดรับ'} value={durationText} />
                {isLoan && <IconCard icon="🛡️" label="หลักประกัน" value={pkg.collateral_required} />}
              </div>
            </div>

            {/* ===== เนื้อหาหลักขวา ===== */}
            <div style={{ flex: '1 1 480px', minWidth: 280, display: 'flex', flexDirection: 'column' }}>

              {/* Hero banner */}
              {pkg.cover_banner ? (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '3.2 / 1', maxHeight: 280, background: '#0f172a' }}>
                  <img src={pkg.cover_banner.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {featured && (
                    <span style={{
                      position: 'absolute', top: 12, left: 12,
                      background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600,
                      padding: '4px 12px', borderRadius: 6,
                    }}>
                      แนะนำ
                    </span>
                  )}
                </div>
              ) : (
                featured && (
                  <div style={{ padding: '16px 24px 0 24px' }}>
                    <span style={{
                      background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600,
                      padding: '4px 12px', borderRadius: 6,
                    }}>
                      แนะนำ
                    </span>
                  </div>
                )
              )}

              {/* Tabs */}
              <div style={{
                display: 'flex', gap: 4, padding: '14px 24px 0 24px', overflowX: 'auto',
                borderBottom: '1px solid #e2e8f0',
              }}>
                <button onClick={() => setTab('main')} style={tabBtnStyle(tab === 'main')}>ข้อมูลทั่วไป</button>
                <button onClick={() => setTab('conditions')} style={tabBtnStyle(tab === 'conditions')}>
                  📋 คุณสมบัติและเงื่อนไข
                </button>
                {isLoan && (
                  <button onClick={() => setTab('rate')} style={tabBtnStyle(tab === 'rate')}>
                    📊 อัตราดอกเบี้ย
                  </button>
                )}
                {isLoan && (
                  <button onClick={() => setTab('fees')} style={tabBtnStyle(tab === 'fees')}>
                    💳 ค่าธรรมเนียม
                  </button>
                )}
                <button onClick={() => setTab('documents')} style={tabBtnStyle(tab === 'documents')}>
                  📄 เอกสารที่ใช้
                </button>
                <button onClick={() => setTab('faq')} style={tabBtnStyle(tab === 'faq')}>
                  ❓ คำถามที่พบบ่อย
                </button>
              </div>

              {/* Tab content */}
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {tab === 'main' && (
                  <>
                    {highlightList.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>จุดเด่น</h3>
                        <Checklist items={highlightList} />
                      </div>
                    )}

                    {suitableForList.length > 0 && (
                      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14 }}>
                        <h3 style={{ fontSize: 14, margin: '0 0 10px', color: '#1e3a8a' }}>เหมาะสำหรับ</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {suitableForList.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#1e40af' }}>
                              <span style={{ flexShrink: 0 }}>🎯</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sliderImages.length > 0 && (
                      <div>
                        <ImageSlider images={sliderImages} />
                      </div>
                    )}
                  </>
                )}

                {tab === 'conditions' && (
                  <>
                    <div>
                      <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>คุณสมบัติและเงื่อนไข</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                        <IconCard icon="✅" label="คุณสมบัติผู้ได้รับ" value={pkg.eligibility_criteria} />
                        <IconCard icon="💼" label="รูปแบบทุน" value={pkg.funding_type} />
                        <IconCard icon="📝" label="รายละเอียดวงเงิน" value={pkg.price_note} />
                        {isLoan && <IconCard icon="📄" label="รายละเอียดหลักประกัน" value={pkg.collateral_detail} />}
                      </div>
                    </div>

                    {pkg.related_sectors && pkg.related_sectors.length > 0 && (
                      <div>
                        <div style={labelStyle}>{isLoan ? 'ประเภทสินเชื่อ' : 'ด้านที่เกี่ยวข้อง'}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                          {pkg.related_sectors.map(tag => (
                            <span key={tag} style={{
                              background: '#e0f2fe', color: '#0369a1', fontSize: 12,
                              padding: '4px 8px', borderRadius: 12,
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {tab === 'rate' && rate && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                      <IconCard icon="%" label="ประเภทอัตรา" value={RATE_TYPE_LABELS[rate.rate_type] ?? rate.rate_type} />
                      <IconCard icon="🧮" label="วิธีคิดดอกเบี้ย" value={rate.calculation_method} />
                      <IconCard icon="📐" label="หน่วยอัตรา" value={RATE_UNIT_LABELS[rate.rate_unit] ?? rate.rate_unit} />
                      <IconCard icon="🗓️" label="ข้อมูลอัตรา ณ วันที่" value={rate.rate_as_of_date} />
                    </div>

                    <div>
                      <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>ตารางเปรียบเทียบอัตราดอกเบี้ย</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {rate.rate_tiers.map((t, i) => (
                          <div key={t.id} style={{
                            border: '1px solid #e2e8f0', borderRadius: 8, padding: 10, fontSize: 13,
                          }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                              ช่วงที่ {i + 1}: {t.period_from} – {t.period_to}
                            </div>
                            {t.rate_kind === 'fixed' && <div>อัตราคงที่ {t.fixed_rate}{RATE_UNIT_LABELS[rate.rate_unit]}</div>}
                            {t.rate_kind === 'range' && <div>ช่วงอัตรา {t.range_min} – {t.range_max}{RATE_UNIT_LABELS[rate.rate_unit]}</div>}
                            {t.rate_kind === 'reference' && (
                              <div>{t.reference_index} {t.reference_sign} {t.reference_spread}{RATE_UNIT_LABELS[rate.rate_unit]}</div>
                            )}
                            {t.rate_kind === 'step' && <div>อัตราขั้นบันได {t.fixed_rate}{RATE_UNIT_LABELS[rate.rate_unit]}</div>}
                            {t.rate_kind === 'case_by_case' && <div>ตามการพิจารณา</div>}
                            {t.note && <div style={{ color: '#64748b', marginTop: 2 }}>{t.note}</div>}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Field label="เงื่อนไข / หมายเหตุอัตราดอกเบี้ย" value={rate.rate_conditions} />
                  </>
                )}

                {tab === 'fees' && rate && (
                  <>
                    {rate.fee_items.length > 0 ? (
                      <div>
                        <h3 style={{ fontSize: 15, margin: '0 0 10px' }}>ค่าธรรมเนียมและค่าใช้จ่ายที่เกี่ยวข้อง</h3>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: 'left', padding: '6px 8px' }}>ประเภทค่าธรรมเนียม</th>
                                <th style={{ textAlign: 'left', padding: '6px 8px' }}>อัตรา/จำนวน</th>
                                <th style={{ textAlign: 'left', padding: '6px 8px' }}>หน่วย</th>
                                <th style={{ textAlign: 'left', padding: '6px 8px' }}>เก็บเมื่อไหร่</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rate.fee_items.map(f => (
                                <tr key={f.id}>
                                  <td style={{ padding: '6px 8px' }}>{f.fee_name}</td>
                                  <td style={{ padding: '6px 8px' }}>{f.amount}</td>
                                  <td style={{ padding: '6px 8px' }}>{FEE_UNIT_LABELS[f.unit] ?? f.unit}</td>
                                  <td style={{ padding: '6px 8px' }}>{FEE_CHARGED_WHEN_LABELS[f.charged_when] ?? f.charged_when}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: '#94a3b8' }}>ยังไม่มีข้อมูลค่าธรรมเนียมสำหรับบริการนี้</p>
                    )}

                    <Field label="หมายเหตุค่าธรรมเนียม" value={rate.fee_notes} />
                  </>
                )}

                {tab === 'documents' && (
                  <div>
                    <h3 style={{ fontSize: 15, margin: '0 0 12px' }}>เอกสารที่ต้องใช้</h3>
                    {documentList.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#94a3b8' }}>ยังไม่มีข้อมูลเอกสารที่ต้องใช้ — กรุณาติดต่อหน่วยงานผู้ให้บริการ</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {documentList.map((doc, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px',
                            fontSize: 14, color: '#334155',
                          }}>
                            <span style={{ color: '#16a34a', flexShrink: 0 }}>✓</span>
                            <span>{doc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'faq' && (
                  <div>
                    <h3 style={{ fontSize: 15, margin: '0 0 12px' }}>คำถามที่พบบ่อย</h3>
                    {faqs === null ? (
                      <p style={{ fontSize: 13, color: '#94a3b8' }}>กำลังโหลด…</p>
                    ) : faqs.length === 0 ? (
                      <p style={{ fontSize: 13, color: '#94a3b8' }}>ยังไม่มีคำถามที่พบบ่อยสำหรับบริการนี้</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {faqs.map(f => (
                          <div key={f.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b', marginBottom: 4 }}>
                              {f.question}
                            </div>
                            <div style={{ fontSize: 13, color: '#64748b' }}>{f.answer}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
