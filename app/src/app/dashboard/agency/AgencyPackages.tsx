'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ', innovation: 'นวัตกรรม', management: 'บริหารจัดการ',
  marketing: 'การตลาด', production: 'การผลิต', upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}
const APPROVAL_LABELS: Record<string, { text: string; bg: string; color: string }> = {
  pending: { text: 'รออนุมัติ', bg: '#fef9c3', color: '#a16207' },
  approved: { text: 'อนุมัติแล้ว', bg: '#dcfce7', color: '#166534' },
  rejected: { text: 'ไม่อนุมัติ', bg: '#fee2e2', color: '#991b1b' },
}
const TEMPLATE_LABELS: Record<string, string> = {
  loan: 'สินเชื่อ',
  grant: 'หน่วยงานให้ทุน / บริการอื่น ๆ',
}
const SERVICE_LABELS: Record<string, string> = {
  open: '🟢 เปิดให้บริการ',
  paused: '⚪ ปิดรับชั่วคราว',
  ended: '⚫ สิ้นสุดโครงการ',
}

// ประเภทแพ็กเกจใหม่ (แยกจาก template_type เดิม)
const PACKAGE_TYPE_OPTIONS = ['สินเชื่อ', 'ทุนเต็มจำนวน', 'ทุนบางส่วน', 'อื่นๆ']

// ประเภทสินเชื่อ 7 ข้อ (ใช้เมื่อ package_type = สินเชื่อ)
const LOAN_TYPE_OPTIONS = [
  'สินเชื่อเงินทุนหมุนเวียน (Working Capital Loan)',
  'สินเชื่อระยะยาว (Term Loan)',
  'สินเชื่อเพื่อซื้อเครื่องจักรและอุปกรณ์',
  'สินเชื่อเพื่อซื้อหรือก่อสร้างสถานประกอบการ',
  'สินเชื่อเพื่อการค้า (Trade Finance)',
  'สินเชื่อเบิกเกินบัญชี (Overdraft: O/D)',
  'สินเชื่อแฟคตอริ่ง / สินเชื่อจากลูกหนี้การค้า (Factoring / Invoice Financing)',
]

const COLLATERAL_OPTIONS = ['ไม่ใช้หลักประกัน', 'ใช้หลักประกัน', 'ใช้บุคคลค้ำประกัน', 'อื่นๆ']

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
  // ฟิลด์ใหม่
  package_type: string | null
  related_sectors: string[] | null
  min_amount: number | null
  max_amount: number | null
  eligibility_criteria: string | null
  interest_rate: string | null
  loan_term: string | null
  collateral_required: string | null
  collateral_detail: string | null
  detail_images: string[] | null
}

const EMPTY_FORM = {
  template_type: 'grant',
  category: 'credit',
  title: '',
  description: '',
  price_amount: '',
  price_note: '',
  funding_type: '',
  support_items: '',
  target_sme: '',
  target_industry: '',
  open_period: '',
  // ฟิลด์ใหม่
  package_type: '',
  min_amount: '',
  max_amount: '',
  eligibility_criteria: '',
  interest_rate: '',
  loan_term: '',
  collateral_required: '',
  collateral_detail: '',
}

export default function AgencyPackages({
  ownerId, categories, initial, applicantCounts,
}: {
  ownerId: string
  categories: string[]
  initial: Pkg[]
  applicantCounts: Record<string, number>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, category: categories[0] ?? 'credit' })

  // ด้านที่เกี่ยวข้อง / ประเภทสินเชื่อ (tag สะสม)
  const [sectorTags, setSectorTags] = useState<string[]>([])
  const [sectorPick, setSectorPick] = useState('') // ค่าที่เลือกจาก dropdown หรือพิมพ์เอง (กรณีไม่ใช่สินเชื่อ)

  // รูปรายละเอียดหลายรูป
  const [existingDetailImages, setExistingDetailImages] = useState<string[]>([])
  const [newDetailFiles, setNewDetailFiles] = useState<File[]>([])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function resetForm() {
    setForm({ ...EMPTY_FORM, category: categories[0] ?? 'credit' })
    setImageFile(null)
    setEditId(null)
    setSectorTags([])
    setSectorPick('')
    setExistingDetailImages([])
    setNewDetailFiles([])
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
    setMsg('')
  }

  function openEdit(p: Pkg) {
    const count = applicantCounts[p.id] ?? 0
    if (count > 0) {
      const ok = confirm(
        `แพ็กเกจนี้มีผู้สมัครแล้ว ${count} ราย\n\n` +
        `การแก้ไขจะกระทบข้อมูลที่ผู้สมัครเห็น และแพ็กเกจจะกลับไปสถานะ "รออนุมัติ" ` +
        `(หายจากหน้า SME ชั่วคราวจนกว่าจะอนุมัติใหม่)\n\nต้องการดำเนินการต่อหรือไม่?`
      )
      if (!ok) return
    }
    setForm({
      template_type: p.template_type ?? 'grant',
      category: p.category ?? 'credit',
      title: p.title ?? '',
      description: p.description ?? '',
      price_amount: p.price_amount != null ? String(p.price_amount) : '',
      price_note: p.price_note ?? '',
      funding_type: p.funding_type ?? '',
      support_items: p.support_items ?? '',
      target_sme: p.target_sme ?? '',
      target_industry: p.target_industry ?? '',
      open_period: p.open_period ?? '',
      package_type: p.package_type ?? '',
      min_amount: p.min_amount != null ? String(p.min_amount) : '',
      max_amount: p.max_amount != null ? String(p.max_amount) : '',
      eligibility_criteria: p.eligibility_criteria ?? '',
      interest_rate: p.interest_rate ?? '',
      loan_term: p.loan_term ?? '',
      collateral_required: p.collateral_required ?? '',
      collateral_detail: p.collateral_detail ?? '',
    })
    setImageFile(null)
    setSectorTags(p.related_sectors ?? [])
    setSectorPick('')
    setExistingDetailImages(p.detail_images ?? [])
    setNewDetailFiles([])
    setEditId(p.id)
    setShowForm(true)
    setMsg('')
  }

  function addSectorTag() {
    const val = sectorPick.trim()
    if (!val) return
    if (sectorTags.includes(val)) { setSectorPick(''); return }
    setSectorTags(tags => [...tags, val])
    setSectorPick('')
  }

  function removeSectorTag(val: string) {
    setSectorTags(tags => tags.filter(t => t !== val))
  }

  function addDetailFiles(files: FileList | null) {
    if (!files) return
    setNewDetailFiles(prev => [...prev, ...Array.from(files)])
  }

  function removeNewDetailFile(idx: number) {
    setNewDetailFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function removeExistingDetailImage(url: string) {
    setExistingDetailImages(prev => prev.filter(u => u !== url))
  }

  async function save() {
    if (!form.title.trim()) { setMsg('กรุณาระบุชื่อแพ็กเกจ'); return }
    setBusy(true); setMsg('')

    // อัปโหลด thumbnail (ถ้ามีการเปลี่ยน)
    let imageUrl: string | null | undefined = undefined
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${ownerId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('package-images')
        .upload(path, imageFile)
      if (upErr) { setBusy(false); setMsg('อัปโหลดรูปไม่สำเร็จ: ' + upErr.message); return }
      const { data: pub } = supabase.storage.from('package-images').getPublicUrl(path)
      imageUrl = pub.publicUrl
    }

    // อัปโหลดรูปรายละเอียดใหม่ (ถ้ามี)
    let uploadedDetailUrls: string[] = []
    if (newDetailFiles.length > 0) {
      for (const file of newDetailFiles) {
        const ext = file.name.split('.').pop()
        const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('package-detail-images')
          .upload(path, file)
        if (upErr) { setBusy(false); setMsg('อัปโหลดรูปรายละเอียดไม่สำเร็จ: ' + upErr.message); return }
        const { data: pub } = supabase.storage.from('package-detail-images').getPublicUrl(path)
        uploadedDetailUrls.push(pub.publicUrl)
      }
    }
    const finalDetailImages = [...existingDetailImages, ...uploadedDetailUrls]

    const isLoan = form.package_type === 'สินเชื่อ'

    const payload: any = {
      template_type: form.template_type,
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price_amount: form.price_amount ? Number(form.price_amount) : null,
      price_note: form.price_note.trim() || null,
      funding_type: form.funding_type.trim() || null,
      support_items: form.support_items.trim() || null,
      target_sme: form.target_sme.trim() || null,
      target_industry: form.target_industry.trim() || null,
      open_period: form.open_period.trim() || null,
      // ฟิลด์ใหม่
      package_type: form.package_type || null,
      related_sectors: sectorTags.length > 0 ? sectorTags : null,
      min_amount: form.min_amount ? Number(form.min_amount) : null,
      max_amount: form.max_amount ? Number(form.max_amount) : null,
      eligibility_criteria: form.eligibility_criteria.trim() || null,
      interest_rate: isLoan ? (form.interest_rate.trim() || null) : null,
      loan_term: isLoan ? (form.loan_term.trim() || null) : null,
      collateral_required: isLoan ? (form.collateral_required || null) : null,
      collateral_detail: isLoan ? (form.collateral_detail.trim() || null) : null,
      detail_images: finalDetailImages.length > 0 ? finalDetailImages : null,
    }
    if (imageUrl !== undefined) payload.image_url = imageUrl

    let error
    if (editId) {
      payload.approval_status = 'pending'
      const res = await supabase.from('packages').update(payload).eq('id', editId)
      error = res.error
    } else {
      payload.owner_id = ownerId
      payload.image_url = imageUrl ?? null
      const res = await supabase.from('packages').insert(payload)
      error = res.error
    }
    setBusy(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setShowForm(false)
    resetForm()
    router.refresh()
  }

  async function changeService(id: string, value: string) {
    setBusy(true)
    await supabase.from('packages').update({ service_status: value }).eq('id', id)
    setBusy(false)
    router.refresh()
  }

  async function remove(id: string) {
    const count = applicantCounts[id] ?? 0
    const warn = count > 0
      ? `แพ็กเกจนี้มีผู้สมัครแล้ว ${count} ราย การลบจะลบใบสมัครทั้งหมดด้วย\n\nยืนยันลบ?`
      : 'ต้องการลบแพ็กเกจนี้ใช่หรือไม่?'
    if (!confirm(warn)) return
    setBusy(true)
    await supabase.from('packages').delete().eq('id', id)
    setBusy(false)
    router.refresh()
  }

  const fieldStyle = {
    width: '100%', padding: '8px 10px', fontSize: 14,
    borderRadius: 8, border: '1px solid #cbd5e1', marginTop: 4,
  } as const
  const labelStyle = { fontSize: 13, color: '#475569', fontWeight: 500 } as const

  const isLoan = form.package_type === 'สินเชื่อ'
  const sectorOptions = isLoan ? LOAN_TYPE_OPTIONS.filter(o => !sectorTags.includes(o)) : []

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>แพ็กเกจของฉัน ({initial.length})</h2>
        <button className="btn btn-sm" onClick={() => showForm ? (setShowForm(false), resetForm()) : openCreate()}>
          {showForm ? 'ปิดฟอร์ม' : '+ สร้างแพ็กเกจใหม่'}
        </button>
      </div>

      {msg && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 12px',
          borderRadius: 8, margin: '12px 0', fontSize: 14 }}>{msg}</div>
      )}

      {showForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: 16, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {editId && (
            <div style={{ background: '#fef9c3', color: '#a16207', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
              กำลังแก้ไขแพ็กเกจ — เมื่อบันทึกแล้วจะกลับไปสถานะ "รออนุมัติ"
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ประเภทแพ็กเกจ (เดิม)</label>
              <select style={fieldStyle} value={form.template_type} onChange={e => set('template_type', e.target.value)}>
                <option value="grant">หน่วยงานให้ทุน / บริการอื่น ๆ</option>
                <option value="loan">สินเชื่อ</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>หมวดหมู่ (เดิม)</label>
              <select style={fieldStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                {categories.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ประเภทแพ็กเกจใหม่ */}
          <div>
            <label style={labelStyle}>ประเภทแพ็กเกจ *</label>
            <select
              style={fieldStyle}
              value={PACKAGE_TYPE_OPTIONS.includes(form.package_type) ? form.package_type : (form.package_type ? 'อื่นๆ' : '')}
              onChange={e => {
                const v = e.target.value
                set('package_type', v === 'อื่นๆ' ? '' : v)
                setSectorTags([]) // เปลี่ยนประเภท ล้าง tag เดิมเพื่อไม่ให้ปนกัน
                setSectorPick('')
              }}>
              <option value="">-- เลือกประเภทแพ็กเกจ --</option>
              {PACKAGE_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            {(form.package_type === '' || !PACKAGE_TYPE_OPTIONS.includes(form.package_type)) && (
              <input
                style={{ ...fieldStyle, marginTop: 6 }}
                placeholder="ระบุประเภทแพ็กเกจ (กรณีเลือก อื่นๆ)"
                value={PACKAGE_TYPE_OPTIONS.includes(form.package_type) ? '' : form.package_type}
                onChange={e => set('package_type', e.target.value)}
              />
            )}
          </div>

          <div>
            <label style={labelStyle}>ชื่อแพ็กเกจ / โครงการ *</label>
            <input style={fieldStyle} value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="เช่น สินเชื่อ SME ดอกเบี้ยพิเศษ / โครงการสนับสนุน Digital" />
          </div>

          <div>
            <label style={labelStyle}>รายละเอียด / จุดเด่น</label>
            <textarea style={{ ...fieldStyle, minHeight: 80, resize: 'vertical' }}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="อธิบายจุดเด่น สิ่งที่ SME จะได้รับ ฯลฯ" />
          </div>

          {/* ด้านที่เกี่ยวข้อง / ประเภทสินเชื่อ (tag สะสม) */}
          <div>
            <label style={labelStyle}>{isLoan ? 'ประเภทสินเชื่อ' : 'ด้านที่เกี่ยวข้อง'}</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              {isLoan ? (
                <select style={{ ...fieldStyle, marginTop: 0, flex: 1 }} value={sectorPick} onChange={e => setSectorPick(e.target.value)}>
                  <option value="">-- เลือกประเภทสินเชื่อ --</option>
                  {sectorOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  <option value="__other__">อื่นๆ (พิมพ์เอง)</option>
                </select>
              ) : (
                <input
                  style={{ ...fieldStyle, marginTop: 0, flex: 1 }}
                  placeholder="พิมพ์ด้านที่เกี่ยวข้อง แล้วกด + เพิ่ม"
                  value={sectorPick}
                  onChange={e => setSectorPick(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSectorTag() } }}
                />
              )}
              <button type="button" className="btn btn-sm" onClick={addSectorTag} style={{ flexShrink: 0 }}>
                + เพิ่ม
              </button>
            </div>
            {isLoan && sectorPick === '__other__' && (
              <input
                style={{ ...fieldStyle }}
                placeholder="ระบุประเภทสินเชื่ออื่นๆ แล้วกด Enter หรือ + เพิ่ม"
                onChange={e => setSectorPick(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSectorTag() } }}
              />
            )}
            {sectorTags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {sectorTags.map(tag => (
                  <span key={tag} style={{
                    background: '#e0f2fe', color: '#0369a1', fontSize: 12,
                    padding: '4px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {tag}
                    <button type="button" onClick={() => removeSectorTag(tag)}
                      style={{ border: 'none', background: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: 700, lineHeight: 1, padding: 0 }}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* วงเงินต่ำสุด-สูงสุด */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>วงเงินต่ำสุด (บาท)</label>
              <input style={fieldStyle} type="number" value={form.min_amount}
                onChange={e => set('min_amount', e.target.value)} placeholder="เว้นว่างได้" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>วงเงินสูงสุด (บาท)</label>
              <input style={fieldStyle} type="number" value={form.max_amount}
                onChange={e => set('max_amount', e.target.value)} placeholder="เว้นว่างได้" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>วงเงินสนับสนุน (บาท) — เดิม</label>
              <input style={fieldStyle} type="number" value={form.price_amount}
                onChange={e => set('price_amount', e.target.value)} placeholder="เว้นว่างได้" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>หมายเหตุวงเงิน</label>
              <input style={fieldStyle} value={form.price_note}
                onChange={e => set('price_note', e.target.value)} placeholder='เช่น "สูงสุด" / "ติดต่อสอบถาม"' />
            </div>
          </div>

          {/* คุณสมบัติผู้ได้รับ */}
          <div>
            <label style={labelStyle}>คุณสมบัติผู้ได้รับ</label>
            <textarea style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }}
              value={form.eligibility_criteria} onChange={e => set('eligibility_criteria', e.target.value)}
              placeholder="เช่น เป็น SME จดทะเบียนไม่น้อยกว่า 2 ปี, มีผลประกอบการเป็นบวก" />
          </div>

          {/* เฉพาะสินเชื่อ: ดอกเบี้ย / ระยะเวลากู้ / หลักประกัน */}
          {isLoan && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>ข้อมูลเฉพาะสินเชื่อ</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>อัตราดอกเบี้ย</label>
                  <input style={fieldStyle} value={form.interest_rate}
                    onChange={e => set('interest_rate', e.target.value)} placeholder='เช่น "MRR - 1% ต่อปี"' />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>ระยะเวลากู้</label>
                  <input style={fieldStyle} value={form.loan_term}
                    onChange={e => set('loan_term', e.target.value)} placeholder='เช่น "สูงสุด 7 ปี"' />
                </div>
              </div>
              <div>
                <label style={labelStyle}>หลักประกัน</label>
                <select style={fieldStyle} value={form.collateral_required} onChange={e => set('collateral_required', e.target.value)}>
                  <option value="">-- เลือกประเภทหลักประกัน --</option>
                  {COLLATERAL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <textarea style={{ ...fieldStyle, minHeight: 50, resize: 'vertical' }}
                  value={form.collateral_detail} onChange={e => set('collateral_detail', e.target.value)}
                  placeholder="รายละเอียดหลักประกัน (ถ้ามี)" />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>รูปแบบทุน (เดิม)</label>
              <input style={fieldStyle} value={form.funding_type}
                onChange={e => set('funding_type', e.target.value)} placeholder="เช่น Grant / Matching Fund / สินเชื่อ" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ระยะเวลาเปิดรับ</label>
              <input style={fieldStyle} value={form.open_period}
                onChange={e => set('open_period', e.target.value)} placeholder='เช่น "ตลอดปี" / "ถึง 31 ธ.ค. 68"' />
            </div>
          </div>

          <div>
            <label style={labelStyle}>สิ่งที่สนับสนุน</label>
            <input style={fieldStyle} value={form.support_items}
              onChange={e => set('support_items', e.target.value)} placeholder="เช่น ค่าที่ปรึกษา, ค่าเครื่องจักร, ค่า Training" />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>SME ที่เหมาะสม</label>
              <input style={fieldStyle} value={form.target_sme}
                onChange={e => set('target_sme', e.target.value)} placeholder="เช่น Startup, Micro SME, SME" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>อุตสาหกรรมเป้าหมาย (เดิม)</label>
              <input style={fieldStyle} value={form.target_industry}
                onChange={e => set('target_industry', e.target.value)} placeholder="เช่น อาหาร, พลังงาน, Digital" />
            </div>
          </div>

          {/* Thumbnail */}
          <div>
            <label style={labelStyle}>รูปภาพหน้าปก (thumbnail)</label>
            <input style={{ ...fieldStyle, padding: 6 }} type="file" accept="image/*"
              onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
            {imageFile && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>เลือกแล้ว: {imageFile.name}</div>
            )}
            {editId && !imageFile && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>เว้นว่างไว้ = ใช้รูปเดิม</div>
            )}
          </div>

          {/* รูปรายละเอียดหลายรูป */}
          <div>
            <label style={labelStyle}>รูปรายละเอียด (เพิ่มได้หลายรูป)</label>
            <input style={{ ...fieldStyle, padding: 6 }} type="file" accept="image/*" multiple
              onChange={e => { addDetailFiles(e.target.files); e.target.value = '' }} />

            {(existingDetailImages.length > 0 || newDetailFiles.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {existingDetailImages.map(url => (
                  <div key={url} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #e2e8f0' }} />
                    <button type="button" onClick={() => removeExistingDetailImage(url)}
                      style={{
                        position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                        background: '#dc2626', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', lineHeight: 1,
                      }}>×</button>
                  </div>
                ))}
                {newDetailFiles.map((file, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img src={URL.createObjectURL(file)} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #93c5fd' }} />
                    <button type="button" onClick={() => removeNewDetailFile(idx)}
                      style={{
                        position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%',
                        background: '#dc2626', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', lineHeight: 1,
                      }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              รูปจะแสดงไล่ลงมาตามลำดับที่เพิ่ม
            </div>
          </div>

          <div>
            <button className="btn" disabled={busy} onClick={save}>
              {busy ? 'กำลังบันทึก…' : (editId ? 'บันทึกการแก้ไข' : 'บันทึกแพ็กเกจ')}
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            * แพ็กเกจจะอยู่สถานะ "รออนุมัติ" จนกว่า ส.อ.ท. จะอนุมัติ จึงจะแสดงให้ SME เห็น
          </p>
        </div>
      )}

      {initial.length === 0 ? (
        <p className="empty" style={{ marginTop: 16 }}>ยังไม่มีแพ็กเกจ — กด "สร้างแพ็กเกจใหม่" เพื่อเริ่ม</p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr><th>แพ็กเกจ</th><th>ประเภท</th><th>ผู้สมัคร</th><th>วงเงิน</th><th>สถานะ</th><th>จัดการ</th></tr>
          </thead>
          <tbody>
            {initial.map(p => {
              const ap = APPROVAL_LABELS[p.approval_status] ?? APPROVAL_LABELS.pending
              const count = applicantCounts[p.id] ?? 0
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {p.image_url && (
                        <img src={p.image_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      )}
                      <div>
                        {p.title}
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {CATEGORY_LABELS[p.category] ?? p.category} · {TEMPLATE_LABELS[p.template_type] ?? p.template_type}
                          {p.package_type && <> · {p.package_type}</>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{TEMPLATE_LABELS[p.template_type] ?? p.template_type}</td>
                  <td style={{ textAlign: 'center' }}>{count > 0 ? count : '—'}</td>
                  <td>
                    {p.min_amount != null || p.max_amount != null ? (
                      <>
                        {p.min_amount != null ? p.min_amount.toLocaleString('th-TH') : '—'}
                        {' - '}
                        {p.max_amount != null ? p.max_amount.toLocaleString('th-TH') : '—'} บาท
                      </>
                    ) : p.price_amount != null ? p.price_amount.toLocaleString('th-TH') + ' บาท' : '—'}
                    {p.price_note && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.price_note}</div>}
                  </td>
                  <td>
                    <span style={{ background: ap.bg, color: ap.color, fontSize: 12,
                      padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap' }}>
                      {ap.text}
                    </span>
                    {p.approval_status === 'approved' && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        {SERVICE_LABELS[p.service_status] ?? p.service_status}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button className="btn btn-ghost btn-sm" disabled={busy}
                        onClick={() => openEdit(p)}>
                        แก้ไข
                      </button>
                      <select
                        value={p.service_status ?? 'open'}
                        disabled={busy}
                        onChange={e => changeService(p.id, e.target.value)}
                        style={{ fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                        <option value="open">🟢 เปิดรับ</option>
                        <option value="paused">⚪ ปิดชั่วคราว</option>
                        <option value="ended">⚫ สิ้นสุด</option>
                      </select>
                      <button className="btn btn-ghost btn-sm" disabled={busy}
                        onClick={() => remove(p.id)} style={{ color: '#dc2626' }}>
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
