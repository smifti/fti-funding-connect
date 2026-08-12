'use client'
import { useState } from 'react'

// ============================================
// Types
// ============================================

export type RateKind = 'fixed' | 'range' | 'reference' | 'step' | 'case_by_case'
export type RateUnit = 'year' | 'month' | 'day'
export type RateType = 'fixed' | 'range' | 'reference' | 'step' | 'case_by_case'
export type FeeUnit = 'percent_of_credit' | 'baht' | 'baht_per_year'
export type FeeChargedWhen = 'on_approval' | 'before_contract' | 'yearly'

export type RateTier = {
  id: string
  period_from: string
  period_to: string
  rate_kind: RateKind
  // fixed
  fixed_rate: string
  // range
  range_min: string
  range_max: string
  // reference
  reference_index: string // MLR / MOR / MRR / THOR / อื่นๆ
  reference_sign: '+' | '-'
  reference_spread: string
  // note (ใช้ร่วมกันทุกประเภท)
  note: string
}

export type FeeItem = {
  id: string
  fee_name: string
  amount: string
  unit: FeeUnit
  charged_when: FeeChargedWhen
}

export type RateStructureForm = {
  rate_type: RateType
  calculation_method: string
  rate_unit: RateUnit
  rate_as_of_date: string
  rate_tiers: RateTier[]
  rate_conditions: string
  fee_items: FeeItem[]
  fee_notes: string
}

// ============================================
// Constants
// ============================================

const RATE_TYPE_OPTIONS: { value: RateType; label: string; sub: string; icon: string }[] = [
  { value: 'fixed', label: 'อัตราคงที่', sub: 'Fixed Rate', icon: '🔒' },
  { value: 'range', label: 'ช่วงอัตราดอกเบี้ย', sub: 'Rate Range', icon: '📈' },
  { value: 'reference', label: 'อัตราอ้างอิง', sub: 'Reference Rate', icon: '📊' },
  { value: 'step', label: 'อัตราแบบขั้นบันได', sub: 'Step Rate', icon: '🪜' },
  { value: 'case_by_case', label: 'ตามการพิจารณา', sub: 'Case-by-case', icon: '👤' },
]

const RATE_KIND_OPTIONS: { value: RateKind; label: string }[] = [
  { value: 'fixed', label: 'อัตราคงที่ (Fixed Rate)' },
  { value: 'range', label: 'ช่วงอัตราดอกเบี้ย (Rate Range)' },
  { value: 'reference', label: 'อัตราอ้างอิง (Reference Rate)' },
  { value: 'step', label: 'อัตราแบบขั้นบันได (Step Rate)' },
  { value: 'case_by_case', label: 'ตามการพิจารณา (Case-by-case)' },
]

const CALC_METHOD_OPTIONS = [
  'ลดต้นลดดอก (Effective Rate)',
  'คงที่ตลอดสัญญา (Flat Rate)',
  'อื่นๆ',
]

const REFERENCE_INDEX_OPTIONS = ['MLR', 'MOR', 'MRR', 'THOR', 'อื่นๆ']

const FEE_UNIT_LABELS: Record<FeeUnit, string> = {
  percent_of_credit: '% ของวงเงินกู้',
  baht: 'บาท',
  baht_per_year: 'บาท/ปี',
}

const FEE_CHARGED_WHEN_LABELS: Record<FeeChargedWhen, string> = {
  on_approval: 'เมื่ออนุมัติวงเงิน',
  before_contract: 'ก่อนทำสัญญา',
  yearly: 'รายปี',
}

const RATE_CONDITIONS_MAX = 500
const FEE_NOTES_MAX = 300

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function emptyRateTier(): RateTier {
  return {
    id: genId(),
    period_from: '',
    period_to: '',
    rate_kind: 'fixed',
    fixed_rate: '',
    range_min: '',
    range_max: '',
    reference_index: 'MLR',
    reference_sign: '+',
    reference_spread: '',
    note: '',
  }
}

export function emptyFeeItem(): FeeItem {
  return {
    id: genId(),
    fee_name: '',
    amount: '',
    unit: 'percent_of_credit',
    charged_when: 'on_approval',
  }
}

export function emptyRateStructureForm(): RateStructureForm {
  return {
    rate_type: 'fixed',
    calculation_method: '',
    rate_unit: 'year',
    rate_as_of_date: '',
    rate_tiers: [emptyRateTier()],
    rate_conditions: '',
    fee_items: [],
    fee_notes: '',
  }
}

// ============================================
// Styles (inline, สอดคล้องกับ pattern เดิมของโปรเจกต์)
// ============================================

const fieldStyle = {
  width: '100%', padding: '8px 10px', fontSize: 14,
  borderRadius: 8, border: '1px solid #cbd5e1', marginTop: 4,
} as const
const labelStyle = { fontSize: 13, color: '#475569', fontWeight: 500 } as const
const smallLabelStyle = { fontSize: 12, color: '#64748b', fontWeight: 500 } as const

// ============================================
// Component
// ============================================

export default function RateStructureTab({
  value,
  onChange,
}: {
  value: RateStructureForm
  onChange: (v: RateStructureForm) => void
}) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null)

  function patch(p: Partial<RateStructureForm>) {
    onChange({ ...value, ...p })
  }

  // ---- rate tiers ----
  function addTier() {
    onChange({ ...value, rate_tiers: [...value.rate_tiers, emptyRateTier()] })
  }
  function removeTier(id: string) {
    if (value.rate_tiers.length <= 1) return
    onChange({ ...value, rate_tiers: value.rate_tiers.filter(t => t.id !== id) })
  }
  function updateTier(id: string, p: Partial<RateTier>) {
    onChange({
      ...value,
      rate_tiers: value.rate_tiers.map(t => t.id === id ? { ...t, ...p } : t),
    })
  }
  function moveTier(id: string, dir: -1 | 1) {
    const idx = value.rate_tiers.findIndex(t => t.id === id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= value.rate_tiers.length) return
    const tiers = [...value.rate_tiers]
    const [item] = tiers.splice(idx, 1)
    tiers.splice(newIdx, 0, item)
    onChange({ ...value, rate_tiers: tiers })
  }

  // ---- fee items ----
  function addFee() {
    onChange({ ...value, fee_items: [...value.fee_items, emptyFeeItem()] })
  }
  function removeFee(id: string) {
    onChange({ ...value, fee_items: value.fee_items.filter(f => f.id !== id) })
  }
  function updateFee(id: string, p: Partial<FeeItem>) {
    onChange({
      ...value,
      fee_items: value.fee_items.map(f => f.id === id ? { ...f, ...p } : f),
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* (1) ประเภทการกำหนดอัตราดอกเบี้ย */}
      <div>
        <label style={labelStyle}>① ประเภทการกำหนดอัตราดอกเบี้ย *</label>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 8, marginTop: 6,
        }}>
          {RATE_TYPE_OPTIONS.map(opt => {
            const active = value.rate_type === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => patch({ rate_type: opt.value })}
                style={{
                  border: active ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: active ? '#eff6ff' : '#fff',
                  borderRadius: 10, padding: '12px 10px', textAlign: 'center',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                <span style={{ fontSize: 22 }}>{opt.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: active ? '#1d4ed8' : '#334155' }}>{opt.label}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{opt.sub}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* (2) (3) (4) วิธีคิดดอกเบี้ย / หน่วยอัตรา / ข้อมูลอัตรา ณ วันที่ */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={labelStyle}>② วิธีคิดดอกเบี้ย *</label>
          <select
            style={fieldStyle}
            value={CALC_METHOD_OPTIONS.includes(value.calculation_method) ? value.calculation_method : (value.calculation_method ? 'อื่นๆ' : '')}
            onChange={e => {
              const v = e.target.value
              patch({ calculation_method: v === 'อื่นๆ' ? '' : v })
            }}>
            <option value="">-- เลือกวิธีคิดดอกเบี้ย --</option>
            {CALC_METHOD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {(value.calculation_method === '' || !CALC_METHOD_OPTIONS.includes(value.calculation_method)) && (
            <input
              style={{ ...fieldStyle, marginTop: 6 }}
              placeholder="ระบุวิธีคิดดอกเบี้ย (กรณีเลือก อื่นๆ)"
              value={CALC_METHOD_OPTIONS.includes(value.calculation_method) ? '' : value.calculation_method}
              onChange={e => patch({ calculation_method: e.target.value })}
            />
          )}
        </div>

        <div>
          <label style={labelStyle}>③ หน่วยอัตรา *</label>
          <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
            {([
              ['year', '% ต่อปี'],
              ['month', '% ต่อเดือน'],
              ['day', '% ต่อวัน'],
            ] as [RateUnit, string][]).map(([v, label]) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer' }}>
                <input type="radio" name="rate_unit" checked={value.rate_unit === v}
                  onChange={() => patch({ rate_unit: v })} />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 160px' }}>
          <label style={labelStyle}>④ ข้อมูลอัตรา ณ วันที่ *</label>
          <input style={fieldStyle} type="date" value={value.rate_as_of_date}
            onChange={e => patch({ rate_as_of_date: e.target.value })} />
        </div>
      </div>

      {/* (5) รายละเอียดอัตราดอกเบี้ย */}
      <div>
        <label style={labelStyle}>⑤ รายละเอียดอัตราดอกเบี้ย *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
          {value.rate_tiers.map((tier, idx) => (
            <div key={tier.id} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                  ช่วงอัตราดอกเบี้ยที่ {idx + 1}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={idx === 0}
                    onClick={() => moveTier(tier.id, -1)} title="เลื่อนขึ้น"
                    style={{ opacity: idx === 0 ? 0.35 : 1 }}>↑</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={idx === value.rate_tiers.length - 1}
                    onClick={() => moveTier(tier.id, 1)} title="เลื่อนลง"
                    style={{ opacity: idx === value.rate_tiers.length - 1 ? 0.35 : 1 }}>↓</button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={value.rate_tiers.length <= 1}
                    onClick={() => removeTier(tier.id)} title="ลบ"
                    style={{ color: '#dc2626', opacity: value.rate_tiers.length <= 1 ? 0.35 : 1 }}>🗑</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={smallLabelStyle}>ตั้งแต่ *</label>
                  <input style={fieldStyle} value={tier.period_from}
                    onChange={e => updateTier(tier.id, { period_from: e.target.value })}
                    placeholder='เช่น "ปี 1"' />
                </div>
                <div style={{ flex: '1 1 140px' }}>
                  <label style={smallLabelStyle}>ถึง *</label>
                  <input style={fieldStyle} value={tier.period_to}
                    onChange={e => updateTier(tier.id, { period_to: e.target.value })}
                    placeholder='เช่น "ปี 3"' />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label style={smallLabelStyle}>ประเภทอัตรา *</label>
                  <select style={fieldStyle} value={tier.rate_kind}
                    onChange={e => updateTier(tier.id, { rate_kind: e.target.value as RateKind })}>
                    {RATE_KIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              {/* conditional fields ตาม rate_kind ของ tier นี้ */}
              {tier.rate_kind === 'fixed' && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={smallLabelStyle}>อัตราดอกเบี้ย *</label>
                    <input style={fieldStyle} type="number" step="0.01" value={tier.fixed_rate}
                      onChange={e => updateTier(tier.id, { fixed_rate: e.target.value })}
                      placeholder="เช่น 3.00" />
                  </div>
                  <div style={{ flex: '2 1 260px' }}>
                    <label style={smallLabelStyle}>หมายเหตุ (ถ้ามี)</label>
                    <input style={fieldStyle} value={tier.note}
                      onChange={e => updateTier(tier.id, { note: e.target.value })}
                      placeholder="เช่น ลูกค้าที่มีคุณสมบัติตามเกณฑ์ที่กำหนด" />
                  </div>
                </div>
              )}

              {tier.rate_kind === 'range' && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px' }}>
                    <label style={smallLabelStyle}>อัตราต่ำสุด *</label>
                    <input style={fieldStyle} type="number" step="0.01" value={tier.range_min}
                      onChange={e => updateTier(tier.id, { range_min: e.target.value })}
                      placeholder="เช่น 6.25" />
                  </div>
                  <div style={{ flex: '1 1 140px' }}>
                    <label style={smallLabelStyle}>อัตราสูงสุด *</label>
                    <input style={fieldStyle} type="number" step="0.01" value={tier.range_max}
                      onChange={e => updateTier(tier.id, { range_max: e.target.value })}
                      placeholder="เช่น 9.99" />
                  </div>
                  <div style={{ flex: '2 1 260px' }}>
                    <label style={smallLabelStyle}>หมายเหตุ (ถ้ามี)</label>
                    <input style={fieldStyle} value={tier.note}
                      onChange={e => updateTier(tier.id, { note: e.target.value })}
                      placeholder="เช่น ตลอดอายุสัญญา" />
                  </div>
                </div>
              )}

              {tier.rate_kind === 'reference' && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 140px' }}>
                    <label style={smallLabelStyle}>อัตราอ้างอิง *</label>
                    <select
                      style={fieldStyle}
                      value={REFERENCE_INDEX_OPTIONS.includes(tier.reference_index) ? tier.reference_index : 'อื่นๆ'}
                      onChange={e => {
                        const v = e.target.value
                        updateTier(tier.id, { reference_index: v === 'อื่นๆ' ? '' : v })
                      }}>
                      {REFERENCE_INDEX_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {!REFERENCE_INDEX_OPTIONS.slice(0, -1).includes(tier.reference_index) && (
                      <input
                        style={{ ...fieldStyle, marginTop: 6 }}
                        placeholder="ระบุอัตราอ้างอิง"
                        value={tier.reference_index}
                        onChange={e => updateTier(tier.id, { reference_index: e.target.value })}
                      />
                    )}
                  </div>
                  <div style={{ flex: '0 0 90px' }}>
                    <label style={smallLabelStyle}>เครื่องหมาย *</label>
                    <select style={fieldStyle} value={tier.reference_sign}
                      onChange={e => updateTier(tier.id, { reference_sign: e.target.value as '+' | '-' })}>
                      <option value="+">+</option>
                      <option value="-">-</option>
                    </select>
                  </div>
                  <div style={{ flex: '1 1 140px' }}>
                    <label style={smallLabelStyle}>ส่วนเพิ่ม (Spread) *</label>
                    <input style={fieldStyle} type="number" step="0.01" value={tier.reference_spread}
                      onChange={e => updateTier(tier.id, { reference_spread: e.target.value })}
                      placeholder="เช่น 1.00" />
                  </div>
                  <div style={{ flex: '2 1 260px' }}>
                    <label style={smallLabelStyle}>หมายเหตุ (ถ้ามี)</label>
                    <input style={fieldStyle} value={tier.note}
                      onChange={e => updateTier(tier.id, { note: e.target.value })}
                      placeholder="เช่น อัตราอ้างอิงตามประกาศของธนาคาร" />
                  </div>
                </div>
              )}

              {tier.rate_kind === 'step' && (
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 160px' }}>
                    <label style={smallLabelStyle}>อัตราดอกเบี้ยของช่วงนี้ *</label>
                    <input style={fieldStyle} type="number" step="0.01" value={tier.fixed_rate}
                      onChange={e => updateTier(tier.id, { fixed_rate: e.target.value })}
                      placeholder="เช่น 3.00" />
                  </div>
                  <div style={{ flex: '2 1 260px' }}>
                    <label style={smallLabelStyle}>รายละเอียด</label>
                    <input style={fieldStyle} value={tier.note}
                      onChange={e => updateTier(tier.id, { note: e.target.value })}
                      placeholder="เช่น เพิ่มขึ้นตามระยะเวลาที่กำหนด" />
                  </div>
                </div>
              )}

              {tier.rate_kind === 'case_by_case' && (
                <div>
                  <label style={smallLabelStyle}>รายละเอียดเพิ่มเติม</label>
                  <textarea style={{ ...fieldStyle, minHeight: 50, resize: 'vertical' }} value={tier.note}
                    onChange={e => updateTier(tier.id, { note: e.target.value })}
                    placeholder="ระบุเงื่อนไขหรือปัจจัยที่ใช้พิจารณาอัตราดอกเบี้ยของช่วงนี้" />
                </div>
              )}
            </div>
          ))}
        </div>

        <button type="button" className="btn btn-sm" onClick={addTier} style={{ marginTop: 10 }}>
          + เพิ่มช่วงอัตราดอกเบี้ย
        </button>

        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
          padding: '10px 12px', marginTop: 10, fontSize: 12.5, color: '#1e40af',
        }}>
          <strong>💡 คำแนะนำ</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
            <li>หากเลือก "อัตราคงที่" ให้ระบุช่วงเวลาเพียง 1 แถว</li>
            <li>หากเลือก "ช่วงอัตรา" ให้ระบุอัตราต่ำสุด - สูงสุด ในแถวเดียว</li>
            <li>หากเลือก "อัตราอ้างอิง" สามารถระบุช่วงเวลาได้ (เช่น ใช้ MLR + 1% นาน 3 ปี)</li>
            <li>หากเลือก "อัตราแบบขั้นบันได" ให้เพิ่มหลายแถวตามช่วงเวลา</li>
          </ul>
        </div>
      </div>

      {/* (6) เงื่อนไข/หมายเหตุอัตราดอกเบี้ย */}
      <div>
        <label style={labelStyle}>⑥ เงื่อนไข / หมายเหตุอัตราดอกเบี้ย</label>
        <textarea
          style={{ ...fieldStyle, minHeight: 70, resize: 'vertical' }}
          value={value.rate_conditions}
          maxLength={RATE_CONDITIONS_MAX}
          onChange={e => patch({ rate_conditions: e.target.value.slice(0, RATE_CONDITIONS_MAX) })}
          placeholder='ระบุเงื่อนไขการใช้อัตราดอกเบี้ย เช่น เฉพาะลูกค้าที่ผ่านเกณฑ์การพิจารณา, ขึ้นอยู่กับวงเงินและหลักประกัน เป็นต้น'
        />
        <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
          {value.rate_conditions.length} / {RATE_CONDITIONS_MAX}
        </div>
      </div>

      {/* ค่าธรรมเนียมและค่าใช้จ่ายที่เกี่ยวข้อง */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
        <label style={labelStyle}>ค่าธรรมเนียมและค่าใช้จ่ายที่เกี่ยวข้อง</label>

        {value.fee_items.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 8px', width: 28 }}>#</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>ประเภทค่าธรรมเนียม</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', width: 120 }}>อัตรา/จำนวน</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', width: 150 }}>หน่วย</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px', width: 160 }}>เก็บเมื่อไหร่</th>
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {value.fee_items.map((fee, idx) => (
                  <tr key={fee.id}>
                    <td style={{ padding: '4px 8px', color: '#94a3b8' }}>{idx + 1}.</td>
                    <td style={{ padding: '4px 8px' }}>
                      <input style={{ ...fieldStyle, marginTop: 0 }} value={fee.fee_name}
                        onChange={e => updateFee(fee.id, { fee_name: e.target.value })}
                        placeholder="เช่น ค่าธรรมเนียมเงินกู้ (Front-end Fee)" />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <input style={{ ...fieldStyle, marginTop: 0 }} value={fee.amount}
                        onChange={e => updateFee(fee.id, { amount: e.target.value })}
                        placeholder="เช่น 0.5 - 2" />
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <select style={{ ...fieldStyle, marginTop: 0 }} value={fee.unit}
                        onChange={e => updateFee(fee.id, { unit: e.target.value as FeeUnit })}>
                        {(Object.keys(FEE_UNIT_LABELS) as FeeUnit[]).map(u => (
                          <option key={u} value={u}>{FEE_UNIT_LABELS[u]}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      <select style={{ ...fieldStyle, marginTop: 0 }} value={fee.charged_when}
                        onChange={e => updateFee(fee.id, { charged_when: e.target.value as FeeChargedWhen })}>
                        {(Object.keys(FEE_CHARGED_WHEN_LABELS) as FeeChargedWhen[]).map(c => (
                          <option key={c} value={c}>{FEE_CHARGED_WHEN_LABELS[c]}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                      <button type="button" onClick={() => removeFee(fee.id)}
                        style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 15 }}
                        title="ลบแถว">🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button type="button" className="btn btn-sm" onClick={addFee} style={{ marginTop: 10 }}>
          + เพิ่มค่าธรรมเนียม
        </button>

        <div style={{ marginTop: 12 }}>
          <label style={labelStyle}>หมายเหตุค่าธรรมเนียม</label>
          <textarea
            style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }}
            value={value.fee_notes}
            maxLength={FEE_NOTES_MAX}
            onChange={e => patch({ fee_notes: e.target.value.slice(0, FEE_NOTES_MAX) })}
            placeholder="ระบุรายละเอียดเพิ่มเติมเกี่ยวกับค่าธรรมเนียมและค่าใช้จ่ายอื่นๆ"
          />
          <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {value.fee_notes.length} / {FEE_NOTES_MAX}
          </div>
        </div>
      </div>

      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
        padding: '10px 12px', fontSize: 12.5, color: '#166534',
      }}>
        ✅ ข้อมูลที่กรอกจะถูกแสดงต่อผู้ประกอบการ SME เพื่อประกอบการตัดสินใจเปรียบเทียบผลิตภัณฑ์ทางการเงิน
      </div>
    </div>
  )
}

// ============================================
// Validation helper (ใช้ตอน save ในฟอร์มหลัก)
// ============================================

export function validateRateStructure(v: RateStructureForm): string | null {
  if (v.rate_tiers.length === 0) return 'กรุณาระบุรายละเอียดอัตราดอกเบี้ยอย่างน้อย 1 ช่วง'
  for (const [idx, t] of v.rate_tiers.entries()) {
    if (!t.period_from.trim() || !t.period_to.trim()) {
      return `กรุณาระบุ "ตั้งแต่" และ "ถึง" ของช่วงอัตราดอกเบี้ยที่ ${idx + 1}`
    }
    if ((t.rate_kind === 'fixed' || t.rate_kind === 'step') && !t.fixed_rate) {
      return `กรุณาระบุอัตราดอกเบี้ยของช่วงที่ ${idx + 1}`
    }
    if (t.rate_kind === 'range' && (!t.range_min || !t.range_max)) {
      return `กรุณาระบุอัตราต่ำสุด/สูงสุดของช่วงที่ ${idx + 1}`
    }
    if (t.rate_kind === 'reference' && (!t.reference_index.trim() || !t.reference_spread)) {
      return `กรุณาระบุอัตราอ้างอิงและส่วนเพิ่มของช่วงที่ ${idx + 1}`
    }
  }
  return null
}

// ============================================
// Serialization helpers (แปลงระหว่าง form state กับ payload ที่จะส่งเข้า DB)
// ============================================

export function rateStructureToPayload(v: RateStructureForm, packageId: string) {
  return {
    package_id: packageId,
    rate_type: v.rate_type,
    calculation_method: v.calculation_method.trim() || null,
    rate_unit: v.rate_unit,
    rate_as_of_date: v.rate_as_of_date || null,
    rate_tiers: v.rate_tiers.map(t => ({
      id: t.id,
      period_from: t.period_from.trim(),
      period_to: t.period_to.trim(),
      rate_kind: t.rate_kind,
      fixed_rate: t.fixed_rate ? Number(t.fixed_rate) : null,
      range_min: t.range_min ? Number(t.range_min) : null,
      range_max: t.range_max ? Number(t.range_max) : null,
      reference_index: t.reference_index.trim() || null,
      reference_sign: t.reference_sign,
      reference_spread: t.reference_spread ? Number(t.reference_spread) : null,
      note: t.note.trim() || null,
    })),
    rate_conditions: v.rate_conditions.trim() || null,
    fee_items: v.fee_items.map(f => ({
      id: f.id,
      fee_name: f.fee_name.trim(),
      amount: f.amount.trim(),
      unit: f.unit,
      charged_when: f.charged_when,
    })),
    fee_notes: v.fee_notes.trim() || null,
  }
}

export function rateStructureFromRow(row: any): RateStructureForm {
  if (!row) return emptyRateStructureForm()
  const tiers: RateTier[] = Array.isArray(row.rate_tiers) && row.rate_tiers.length > 0
    ? row.rate_tiers.map((t: any) => ({
        id: t.id ?? genId(),
        period_from: t.period_from ?? '',
        period_to: t.period_to ?? '',
        rate_kind: t.rate_kind ?? 'fixed',
        fixed_rate: t.fixed_rate != null ? String(t.fixed_rate) : '',
        range_min: t.range_min != null ? String(t.range_min) : '',
        range_max: t.range_max != null ? String(t.range_max) : '',
        reference_index: t.reference_index ?? 'MLR',
        reference_sign: t.reference_sign ?? '+',
        reference_spread: t.reference_spread != null ? String(t.reference_spread) : '',
        note: t.note ?? '',
      }))
    : [emptyRateTier()]

  const fees: FeeItem[] = Array.isArray(row.fee_items)
    ? row.fee_items.map((f: any) => ({
        id: f.id ?? genId(),
        fee_name: f.fee_name ?? '',
        amount: f.amount ?? '',
        unit: f.unit ?? 'percent_of_credit',
        charged_when: f.charged_when ?? 'on_approval',
      }))
    : []

  return {
    rate_type: row.rate_type ?? 'fixed',
    calculation_method: row.calculation_method ?? '',
    rate_unit: row.rate_unit ?? 'year',
    rate_as_of_date: row.rate_as_of_date ?? '',
    rate_tiers: tiers,
    rate_conditions: row.rate_conditions ?? '',
    fee_items: fees,
    fee_notes: row.fee_notes ?? '',
  }
}
