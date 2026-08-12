'use client'
import { useState } from 'react'
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

// Lightbox — แสดงรูปขนาดจริง ซ้อนทับเต็มจอ พื้นหลังมืด เลื่อนดูรูปอื่นในชุดได้
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

// Slider รูปภาพ — ใช้ทั้ง thumbnail และรูปรายละเอียดรวมกันเป็นชุดเดียว
// คลิกที่รูปหลักเพื่อเปิดดูขนาดจริงใน Lightbox
function ImageSlider({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  if (images.length === 0) return null

  function prev() { setIdx(i => (i === 0 ? images.length - 1 : i - 1)) }
  function next() { setIdx(i => (i === images.length - 1 ? 0 : i + 1)) }

  return (
    <div>
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '16 / 9', borderRadius: 10,
        overflow: 'hidden', background: '#f1f5f9', border: '1px solid #e2e8f0',
      }}>
        <img
          src={images[idx]}
          alt=""
          onClick={() => setLightboxOpen(true)}
          title="คลิกเพื่อดูขนาดจริง"
          style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'zoom-in' }}
        />
        {images.length > 1 && (
          <>
            <button type="button" onClick={prev} aria-label="ก่อนหน้า" style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: 'rgba(15,23,42,0.55)', color: '#fff', cursor: 'pointer', fontSize: 16,
            }}>‹</button>
            <button type="button" onClick={next} aria-label="ถัดไป" style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: 'rgba(15,23,42,0.55)', color: '#fff', cursor: 'pointer', fontSize: 16,
            }}>›</button>
            <div style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(15,23,42,0.55)', color: '#fff', fontSize: 11,
              padding: '2px 8px', borderRadius: 10,
            }}>
              {idx + 1} / {images.length}
            </div>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {images.map((url, i) => (
            <button key={url + i} type="button" onClick={() => setIdx(i)}
              style={{
                width: 48, height: 48, borderRadius: 6, overflow: 'hidden', padding: 0, cursor: 'pointer',
                border: i === idx ? '2px solid #2563eb' : '1px solid #e2e8f0', background: 'none',
              }}>
              <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <Lightbox images={images} startIndex={idx} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}

export default function PackageDetailModal({
  pkg, applicantCount, onClose,
}: {
  pkg: Pkg
  applicantCount: number
  onClose: () => void
}) {
  const isLoan = pkg.package_type === 'สินเชื่อ'
  const [tab, setTab] = useState<'main' | 'rate'>('main')
  const ap = APPROVAL_LABELS[pkg.approval_status] ?? APPROVAL_LABELS.pending

  const allImages = [
    ...(pkg.cover_banner ? [pkg.cover_banner.url] : []),
    ...(pkg.cover_square ? [pkg.cover_square.url] : []),
    ...(!pkg.cover_banner && !pkg.cover_square && pkg.image_url ? [pkg.image_url] : []), // fallback ข้อมูลเก่า
    ...(pkg.detail_images ?? []).map(img => img.url),
  ]

  const rate = isLoan ? rateStructureFromRow(pkg.package_rate_structures) : null

  const tabBtnStyle = (active: boolean) => ({
    padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
    fontSize: 14, fontWeight: 600,
    color: active ? '#2563eb' : '#94a3b8',
    borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
    marginBottom: -2,
  } as const)

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
          background: '#fff', borderRadius: 14, width: '100%', maxWidth: 720,
          maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '18px 20px 0 20px',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>{pkg.title}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{
                background: ap.bg, color: ap.color, fontSize: 12,
                padding: '3px 10px', borderRadius: 12,
              }}>
                {ap.text}
              </span>
              {pkg.approval_status === 'approved' && (
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {SERVICE_LABELS[pkg.service_status] ?? pkg.service_status}
                </span>
              )}
              <span style={{ fontSize: 12, color: '#64748b' }}>· ผู้สมัคร {applicantCount} ราย</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="ปิด" style={{
            border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8',
            lineHeight: 1, padding: 4,
          }}>×</button>
        </div>

        {/* Tabs */}
        {isLoan && (
          <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', padding: '10px 20px 0 20px' }}>
            <button onClick={() => setTab('main')} style={tabBtnStyle(tab === 'main')}>ข้อมูลทั่วไป</button>
            <button onClick={() => setTab('rate')} style={tabBtnStyle(tab === 'rate')}>
              📊 อัตราดอกเบี้ย / ค่าบริการทางการเงิน
            </button>
          </div>
        )}

        {/* Body (scrollable) */}
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          {tab === 'main' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {allImages.length > 0 && <ImageSlider images={allImages} />}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <Field label="หมวดหมู่ข้อเสนอ/บริการ" value={pkg.category} />
                  <Field label="ประเภทข้อเสนอ/บริการ" value={pkg.package_type} />
                </div>

                <Field label="รายละเอียด / จุดเด่น" value={pkg.description} />
                <Field label="คุณสมบัติผู้ได้รับ" value={pkg.eligibility_criteria} />

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <Field label="SME ที่เหมาะสม" value={pkg.target_sme} />
                  <Field label="อุตสาหกรรมเป้าหมาย" value={pkg.target_industry} />
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

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <Field
                    label="วงเงิน"
                    value={
                      pkg.min_amount != null || pkg.max_amount != null
                        ? `${pkg.min_amount != null ? pkg.min_amount.toLocaleString('th-TH') : '—'} - ${pkg.max_amount != null ? pkg.max_amount.toLocaleString('th-TH') : '—'} บาท`
                        : pkg.price_amount != null ? `${pkg.price_amount.toLocaleString('th-TH')} บาท` : null
                    }
                  />
                  <Field label="รายละเอียดวงเงิน" value={pkg.price_note} />
                </div>

                {isLoan && (
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    <Field label="ระยะเวลากู้" value={pkg.loan_term} />
                    <Field label="หลักประกัน" value={pkg.collateral_required} />
                  </div>
                )}
                {isLoan && pkg.collateral_detail && (
                  <Field label="รายละเอียดหลักประกัน" value={pkg.collateral_detail} />
                )}

                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <Field label="รูปแบบทุน" value={pkg.funding_type} />
                  <Field label="ระยะเวลาเปิดรับ" value={pkg.open_period} />
                </div>
                <Field label="สิ่งที่สนับสนุน" value={pkg.support_items} />
              </div>
            </div>
          ) : (
            rate && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <Field label="ประเภทการกำหนดอัตราดอกเบี้ย" value={RATE_TYPE_LABELS[rate.rate_type] ?? rate.rate_type} />
                  <Field label="วิธีคิดดอกเบี้ย" value={rate.calculation_method} />
                  <Field label="หน่วยอัตรา" value={RATE_UNIT_LABELS[rate.rate_unit] ?? rate.rate_unit} />
                  <Field label="ข้อมูลอัตรา ณ วันที่" value={rate.rate_as_of_date} />
                </div>

                <div>
                  <div style={{ ...labelStyle, marginBottom: 8 }}>รายละเอียดอัตราดอกเบี้ย</div>
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

                {rate.fee_items.length > 0 && (
                  <div>
                    <div style={{ ...labelStyle, marginBottom: 8 }}>ค่าธรรมเนียมและค่าใช้จ่ายที่เกี่ยวข้อง</div>
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
                )}

                <Field label="หมายเหตุค่าธรรมเนียม" value={rate.fee_notes} />
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  )
}
