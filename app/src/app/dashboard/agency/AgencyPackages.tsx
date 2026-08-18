'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import RateStructureTab, {
  RateStructureForm,
  emptyRateStructureForm,
  rateStructureFromRow,
  rateStructureToPayload,
  validateRateStructure,
} from '../shared-packages/RateStructureTab'
import PackageDetailModal from '../shared-packages/PackageDetailModal'
import ImageCropper from './ImageCropper'

// หมวดหมู่ข้อเสนอ/บริการ (ค่าที่เก็บใน DB = ค่าเดียวกับ label ที่แสดง เพราะ category เป็น text ธรรมดา)
const CATEGORY_OPTIONS = [
  'การเงิน/ธนาคาร',
  'นวัตกรรม/เทคโนโลยี',
  'ดิจิทัล',
  'การเพิ่มผลิตภาพ (Productivity)',
  'การตลาด',
  'สิ่งแวดล้อม',
  'อื่นๆ',
]
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
const ACTION_LABEL: Record<string, string> = {
  created: 'สร้างข้อเสนอ/บริการใหม่',
  updated: 'แก้ไขข้อมูล',
}
const ROLE_LABEL: Record<string, string> = {
  agency: 'หน่วยงาน', expert: 'ที่ปรึกษา', admin: 'ผู้ดูแลระบบ',
}

// ประเภทข้อเสนอ/บริการ (แยกจาก template_type เดิม — template_type จะถูก auto-set ตามนี้เบื้องหลัง ไม่แสดงใน UI แล้ว)
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

// metadata รูปภาพ 1 รูป (ใช้ทั้งภาพหน้าปกและรูปรายละเอียด)
export type ImageMeta = {
  url: string
  filename: string
  size: number | null // ไบต์
  uploaded_at: string | null // ISO timestamp
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
  image_url: string | null // เดิม เก็บไว้เฉยๆ ไม่ใช้ในฟอร์มแล้ว
  approval_status: string
  is_active: boolean
  service_status: string
  // ฟิลด์ใหม่
  package_type: string | null
  related_sectors: string[] | null
  min_amount: number | null
  max_amount: number | null
  eligibility_criteria: string | null
  loan_term: string | null
  collateral_required: string | null
  collateral_detail: string | null
  // ภาพหน้าปก 2 แบบ + รูปรายละเอียด (jsonb)
  cover_banner: ImageMeta | null
  cover_square: ImageMeta | null
  detail_images: ImageMeta[] | null
  // ข้อมูลจากตาราง package_rate_structures (join แบบ nested เดี่ยว หรือ null ถ้ายังไม่เคยตั้งค่า)
  package_rate_structures?: any | null
}

type LogRow = {
  id: string
  action: string
  changed_by_name: string | null
  changed_by_role: string | null
  created_at: string
}

const EMPTY_FORM = {
  template_type: 'grant',
  category: '',
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
  const [form, setForm] = useState({ ...EMPTY_FORM })

  // ด้านที่เกี่ยวข้อง / ประเภทสินเชื่อ (tag สะสม)
  const [sectorTags, setSectorTags] = useState<string[]>([])
  const [sectorPick, setSectorPick] = useState('') // ค่าที่เลือกจาก dropdown หรือพิมพ์เอง (กรณีไม่ใช่สินเชื่อ)

  // ภาพหน้าปก 2 แบบ: ไฟล์ใหม่ที่เลือก (ยังไม่ upload) + metadata เดิมจาก DB (ถ้ามี, ตอนแก้ไข)
  const [coverBannerFile, setCoverBannerFile] = useState<File | null>(null)
  const [coverBannerExisting, setCoverBannerExisting] = useState<ImageMeta | null>(null)
  const [coverSquareFile, setCoverSquareFile] = useState<File | null>(null)
  const [coverSquareExisting, setCoverSquareExisting] = useState<ImageMeta | null>(null)

  // รูปรายละเอียดหลายรูป (สูงสุด 10 ภาพ)
  const [existingDetailImages, setExistingDetailImages] = useState<ImageMeta[]>([])
  const [newDetailFiles, setNewDetailFiles] = useState<File[]>([])

  // อัตราดอกเบี้ย/ค่าบริการทางการเงิน (เฉพาะ package_type = สินเชื่อ)
  const [rateStructure, setRateStructure] = useState<RateStructureForm>(emptyRateStructureForm())
  const [activeFormTab, setActiveFormTab] = useState<'main' | 'rate' | 'images'>('main')

  // modal ดูรายละเอียดข้อเสนอ/บริการ (read-only)
  const [detailPkg, setDetailPkg] = useState<Pkg | null>(null)

  // ประวัติการแก้ไข — expand/collapse ต่อแถว
  const [showLog, setShowLog] = useState<string | null>(null)
  const [logsCache, setLogsCache] = useState<Record<string, LogRow[]>>({})

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function resetForm() {
    setForm({ ...EMPTY_FORM })
    setEditId(null)
    setSectorTags([])
    setSectorPick('')
    setCoverBannerFile(null)
    setCoverBannerExisting(null)
    setCoverSquareFile(null)
    setCoverSquareExisting(null)
    setExistingDetailImages([])
    setNewDetailFiles([])
    setRateStructure(emptyRateStructureForm())
    setActiveFormTab('main')
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
        `ข้อเสนอ/บริการนี้มีผู้สมัครแล้ว ${count} ราย\n\n` +
        `การแก้ไขจะกระทบข้อมูลที่ผู้สมัครเห็น และข้อเสนอ/บริการจะกลับไปสถานะ "รออนุมัติ" ` +
        `(หายจากหน้า SME ชั่วคราวจนกว่าจะอนุมัติใหม่)\n\nต้องการดำเนินการต่อหรือไม่?`
      )
      if (!ok) return
    }
    setForm({
      template_type: p.template_type ?? 'grant',
      category: p.category ?? '',
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
      loan_term: p.loan_term ?? '',
      collateral_required: p.collateral_required ?? '',
      collateral_detail: p.collateral_detail ?? '',
    })
    setCoverBannerFile(null)
    setCoverBannerExisting(p.cover_banner ?? null)
    setCoverSquareFile(null)
    setCoverSquareExisting(p.cover_square ?? null)
    setSectorTags(p.related_sectors ?? [])
    setSectorPick('')
    setExistingDetailImages(p.detail_images ?? [])
    setNewDetailFiles([])
    setRateStructure(rateStructureFromRow(p.package_rate_structures))
    setActiveFormTab('main')
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

  const MAX_DETAIL_IMAGES = 10

  function addDetailFiles(files: FileList | null) {
    if (!files) return
    const currentTotal = existingDetailImages.length + newDetailFiles.length
    const room = MAX_DETAIL_IMAGES - currentTotal
    if (room <= 0) {
      setMsg(`อัปโหลดรูปรายละเอียดได้สูงสุด ${MAX_DETAIL_IMAGES} ภาพ`)
      return
    }
    const incoming = Array.from(files).slice(0, room)
    if (files.length > incoming.length) {
      setMsg(`อัปโหลดรูปรายละเอียดได้สูงสุด ${MAX_DETAIL_IMAGES} ภาพ — เพิ่มได้อีก ${room} ภาพเท่านั้น`)
    }
    setNewDetailFiles(prev => [...prev, ...incoming])
  }

  function removeNewDetailFile(idx: number) {
    setNewDetailFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function removeExistingDetailImage(url: string) {
    setExistingDetailImages(prev => prev.filter(img => img.url !== url))
  }

  function sortDetailImagesByFilename() {
    setExistingDetailImages(prev => [...prev].sort((a, b) => a.filename.localeCompare(b.filename, 'th')))
    setNewDetailFiles(prev => [...prev].sort((a, b) => a.name.localeCompare(b.name, 'th')))
  }

  function clearAllDetailImages() {
    if (!confirm('ต้องการล้างรูปรายละเอียดทั้งหมดใช่หรือไม่?')) return
    setExistingDetailImages([])
    setNewDetailFiles([])
  }

  async function toggleLog(pkgId: string) {
    if (showLog === pkgId) { setShowLog(null); return }
    setShowLog(pkgId)
    if (!logsCache[pkgId]) {
      const { data, error } = await supabase.rpc('get_package_edit_logs', { p_package_id: pkgId })
      if (!error) setLogsCache(prev => ({ ...prev, [pkgId]: data ?? [] }))
    }
  }

  async function save() {
    if (!form.title.trim()) { setMsg('กรุณาระบุชื่อข้อเสนอ/บริการ'); return }
    const isLoanCheck = form.package_type === 'สินเชื่อ'
    if (isLoanCheck) {
      const rateErr = validateRateStructure(rateStructure)
      if (rateErr) { setMsg(rateErr); setActiveFormTab('rate'); return }
    }
    setBusy(true); setMsg('')

    // helper: upload ไฟล์เดียว คืน ImageMeta
    async function uploadImage(file: File, prefix: string): Promise<{ meta?: ImageMeta; error?: string }> {
      const ext = file.name.split('.').pop()
      const path = `${ownerId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage.from('package-images').upload(path, file)
      if (upErr) return { error: upErr.message }
      const { data: pub } = supabase.storage.from('package-images').getPublicUrl(path)
      return {
        meta: {
          url: pub.publicUrl,
          filename: file.name,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        },
      }
    }

    // อัปโหลดภาพหน้าปกแบนเนอร์ (ถ้ามีการเปลี่ยน)
    let coverBannerMeta: ImageMeta | null | undefined = undefined
    if (coverBannerFile) {
      const res = await uploadImage(coverBannerFile, 'cover-banner')
      if (res.error) { setBusy(false); setActiveFormTab('images'); setMsg('อัปโหลดภาพหน้าปกแบนเนอร์ไม่สำเร็จ: ' + res.error); return }
      coverBannerMeta = res.meta!
    }

    // อัปโหลดภาพหน้าปกจตุรัส (ถ้ามีการเปลี่ยน)
    let coverSquareMeta: ImageMeta | null | undefined = undefined
    if (coverSquareFile) {
      const res = await uploadImage(coverSquareFile, 'cover-square')
      if (res.error) { setBusy(false); setActiveFormTab('images'); setMsg('อัปโหลดภาพหน้าปกจตุรัสไม่สำเร็จ: ' + res.error); return }
      coverSquareMeta = res.meta!
    }

    // อัปโหลดรูปรายละเอียดใหม่ (ถ้ามี)
    let uploadedDetailMetas: ImageMeta[] = []
    for (const file of newDetailFiles) {
      const res = await uploadImage(file, 'detail')
      if (res.error) { setBusy(false); setActiveFormTab('images'); setMsg('อัปโหลดรูปรายละเอียดไม่สำเร็จ: ' + res.error); return }
      uploadedDetailMetas.push(res.meta!)
    }
    const finalDetailImages = [...existingDetailImages, ...uploadedDetailMetas].slice(0, MAX_DETAIL_IMAGES)

    const isLoan = form.package_type === 'สินเชื่อ'
    // auto-set template_type ตาม package_type (ไม่แสดง dropdown นี้ใน UI แล้ว แต่ยังต้องเก็บค่าให้ถูกต้อง
    // เพราะจุดอื่นในระบบ เช่น การแสดงผล/รายงาน อาจยังอิงคอลัมน์นี้อยู่)
    const autoTemplateType = isLoan ? 'loan' : 'grant'

    const payload: any = {
      template_type: autoTemplateType,
      category: form.category.trim(),
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
      loan_term: isLoan ? (form.loan_term.trim() || null) : null,
      collateral_required: isLoan ? (form.collateral_required || null) : null,
      collateral_detail: isLoan ? (form.collateral_detail.trim() || null) : null,
      detail_images: finalDetailImages.length > 0 ? finalDetailImages : null,
    }
    if (coverBannerMeta !== undefined) payload.cover_banner = coverBannerMeta
    if (coverSquareMeta !== undefined) payload.cover_square = coverSquareMeta

    let error
    let savedPackageId: string | null = editId
    const isNew = !editId
    if (editId) {
      payload.approval_status = 'pending'
      const res = await supabase.from('packages').update(payload).eq('id', editId)
      error = res.error
    } else {
      payload.owner_id = ownerId
      // ถ้าไม่ได้อัปโหลด cover ใหม่ตอนสร้างใหม่ ให้ค่าเป็น null ชัดเจน (กัน undefined หลุดเข้า DB)
      if (payload.cover_banner === undefined) payload.cover_banner = null
      if (payload.cover_square === undefined) payload.cover_square = null
      const res = await supabase.from('packages').insert(payload).select('id').single()
      error = res.error
      savedPackageId = res.data?.id ?? null
    }
    if (error) { setBusy(false); setMsg('เกิดข้อผิดพลาด: ' + error.message); return }

    // บันทึก/ลบ โครงสร้างอัตราดอกเบี้ย ตาม package_type
    if (savedPackageId) {
      if (isLoan) {
        const ratePayload = rateStructureToPayload(rateStructure, savedPackageId)
        const { error: rateErr } = await supabase
          .from('package_rate_structures')
          .upsert(ratePayload, { onConflict: 'package_id' })
        if (rateErr) {
          setBusy(false)
          setMsg('บันทึกข้อมูลอัตราดอกเบี้ยไม่สำเร็จ: ' + rateErr.message)
          return
        }
      } else {
        // ไม่ใช่สินเชื่ออีกต่อไป (เปลี่ยนประเภทตอนแก้ไข) → ล้างข้อมูลอัตราดอกเบี้ยเดิมทิ้ง ไม่ให้ค้างเป็นข้อมูลกำพร้า
        await supabase.from('package_rate_structures').delete().eq('package_id', savedPackageId)
      }
      // บันทึกประวัติการแก้ไข
      await supabase.rpc('log_package_edit', {
        p_package_id: savedPackageId,
        p_action: isNew ? 'created' : 'updated',
      })
      setLogsCache(prev => {
        const rest = { ...prev }
        delete rest[savedPackageId!]
        return rest
      })
    }

    setBusy(false)
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
      ? `ข้อเสนอ/บริการนี้มีผู้สมัครแล้ว ${count} ราย การลบจะลบใบสมัครทั้งหมดด้วย\n\nยืนยันลบ?`
      : 'ต้องการลบข้อเสนอ/บริการนี้ใช่หรือไม่?'
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
    <>
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>ข้อเสนอ/บริการของฉัน ({initial.length})</h2>
        <button className="btn btn-sm" onClick={() => showForm ? (setShowForm(false), resetForm()) : openCreate()}>
          {showForm ? 'ปิดฟอร์ม' : '+ สร้างข้อเสนอ/บริการใหม่'}
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
              กำลังแก้ไขข้อเสนอ/บริการ — เมื่อบันทึกแล้วจะกลับไปสถานะ "รออนุมัติ"
            </div>
          )}

          {/* Tab switcher: ข้อมูลทั่วไป / อัตราดอกเบี้ย (เฉพาะสินเชื่อ) / ภาพประกอบ */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setActiveFormTab('main')}
              style={{
                padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
                color: activeFormTab === 'main' ? '#2563eb' : '#94a3b8',
                borderBottom: activeFormTab === 'main' ? '2px solid #2563eb' : '2px solid transparent',
                marginBottom: -2,
              }}>
              ข้อมูลทั่วไป
            </button>
            {isLoan && (
              <button type="button" onClick={() => setActiveFormTab('rate')}
                style={{
                  padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                  fontSize: 14, fontWeight: 600,
                  color: activeFormTab === 'rate' ? '#2563eb' : '#94a3b8',
                  borderBottom: activeFormTab === 'rate' ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom: -2,
                }}>
                📊 อัตราดอกเบี้ย / ค่าบริการทางการเงิน
              </button>
            )}
            <button type="button" onClick={() => setActiveFormTab('images')}
              style={{
                padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
                color: activeFormTab === 'images' ? '#2563eb' : '#94a3b8',
                borderBottom: activeFormTab === 'images' ? '2px solid #2563eb' : '2px solid transparent',
                marginBottom: -2,
              }}>
              🖼️ ภาพประกอบ
            </button>
          </div>

          {activeFormTab === 'rate' && isLoan ? (
            <RateStructureTab value={rateStructure} onChange={setRateStructure} />
          ) : activeFormTab === 'images' ? (
            <ImagesTab
              coverBannerFile={coverBannerFile}
              setCoverBannerFile={setCoverBannerFile}
              coverBannerExisting={coverBannerExisting}
              onRemoveCoverBanner={() => { setCoverBannerFile(null); setCoverBannerExisting(null) }}
              coverSquareFile={coverSquareFile}
              setCoverSquareFile={setCoverSquareFile}
              coverSquareExisting={coverSquareExisting}
              onRemoveCoverSquare={() => { setCoverSquareFile(null); setCoverSquareExisting(null) }}
              existingDetailImages={existingDetailImages}
              newDetailFiles={newDetailFiles}
              maxDetailImages={MAX_DETAIL_IMAGES}
              addDetailFiles={addDetailFiles}
              removeNewDetailFile={removeNewDetailFile}
              removeExistingDetailImage={removeExistingDetailImage}
              onSortByFilename={sortDetailImagesByFilename}
              onClearAll={clearAllDetailImages}
            />
          ) : (
          <>
          {/* ชื่อข้อเสนอ/บริการ */}
          <div>
            <label style={labelStyle}>ชื่อข้อเสนอ/บริการ / โครงการ *</label>
            <input style={fieldStyle} value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="เช่น สินเชื่อ SME ดอกเบี้ยพิเศษ / โครงการสนับสนุน Digital" />
          </div>

          {/* หมวดหมู่ + ประเภท (แถวเดียวกัน ไม่ยาวเต็มกรอบ) */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={labelStyle}>หมวดหมู่ข้อเสนอ/บริการ *</label>
              <select
                style={fieldStyle}
                value={CATEGORY_OPTIONS.includes(form.category) ? form.category : (form.category ? 'อื่นๆ' : '')}
                onChange={e => {
                  const v = e.target.value
                  set('category', v === 'อื่นๆ' ? '' : v)
                }}>
                <option value="">-- เลือกหมวดหมู่ --</option>
                {CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {(form.category === '' || !CATEGORY_OPTIONS.includes(form.category)) && (
                <input
                  style={{ ...fieldStyle, marginTop: 6 }}
                  placeholder="ระบุหมวดหมู่ (กรณีเลือก อื่นๆ)"
                  value={CATEGORY_OPTIONS.includes(form.category) ? '' : form.category}
                  onChange={e => set('category', e.target.value)}
                />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <label style={labelStyle}>ประเภทข้อเสนอ/บริการ *</label>
              <select
                style={fieldStyle}
                value={PACKAGE_TYPE_OPTIONS.includes(form.package_type) ? form.package_type : (form.package_type ? 'อื่นๆ' : '')}
                onChange={e => {
                  const v = e.target.value
                  const newType = v === 'อื่นๆ' ? '' : v
                  set('package_type', newType)
                  setSectorTags([]) // เปลี่ยนประเภท ล้าง tag เดิมเพื่อไม่ให้ปนกัน
                  setSectorPick('')
                  if (newType !== 'สินเชื่อ') setActiveFormTab('main') // ไม่ใช่สินเชื่อแล้ว กลับไปแท็บข้อมูลทั่วไป
                }}>
                <option value="">-- เลือกประเภท --</option>
                {PACKAGE_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {(form.package_type === '' || !PACKAGE_TYPE_OPTIONS.includes(form.package_type)) && (
                <input
                  style={{ ...fieldStyle, marginTop: 6 }}
                  placeholder="ระบุประเภท (กรณีเลือก อื่นๆ)"
                  value={PACKAGE_TYPE_OPTIONS.includes(form.package_type) ? '' : form.package_type}
                  onChange={e => set('package_type', e.target.value)}
                />
              )}
            </div>
          </div>

          {/* รายละเอียด / จุดเด่น */}
          <div>
            <label style={labelStyle}>รายละเอียด / จุดเด่น</label>
            <textarea style={{ ...fieldStyle, minHeight: 80, resize: 'vertical' }}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="อธิบายจุดเด่น สิ่งที่ SME จะได้รับ ฯลฯ" />
          </div>

          {/* คุณสมบัติผู้ได้รับ */}
          <div>
            <label style={labelStyle}>คุณสมบัติผู้ได้รับ</label>
            <textarea style={{ ...fieldStyle, minHeight: 60, resize: 'vertical' }}
              value={form.eligibility_criteria} onChange={e => set('eligibility_criteria', e.target.value)}
              placeholder="เช่น เป็น SME จดทะเบียนไม่น้อยกว่า 2 ปี, มีผลประกอบการเป็นบวก" />
          </div>

          {/* SME ที่เหมาะสม + อุตสาหกรรมเป้าหมาย */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>SME ที่เหมาะสม</label>
              <input style={fieldStyle} value={form.target_sme}
                onChange={e => set('target_sme', e.target.value)} placeholder="เช่น Startup, Micro SME, SME" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>อุตสาหกรรมเป้าหมาย</label>
              <input style={fieldStyle} value={form.target_industry}
                onChange={e => set('target_industry', e.target.value)} placeholder="เช่น อาหาร, พลังงาน, Digital" />
            </div>
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
              <label style={labelStyle}>วงเงินที่ได้ต่ำสุด (บาท)</label>
              <input style={fieldStyle} type="number" value={form.min_amount}
                onChange={e => set('min_amount', e.target.value)} placeholder="เว้นว่างได้" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>วงเงินที่ได้สูงสุด (บาท)</label>
              <input style={fieldStyle} type="number" value={form.max_amount}
                onChange={e => set('max_amount', e.target.value)} placeholder="เว้นว่างได้" />
            </div>
          </div>

          {/* price_amount เดิม เก็บไว้เป็นช่องเล็กๆ เผื่ออยากใช้ ไม่เด่นเท่าฟิลด์หลัก */}
          <div>
            <label style={{ ...labelStyle, fontSize: 12, color: '#94a3b8' }}>วงเงินสนับสนุน (บาท) — ไม่บังคับ</label>
            <input style={{ ...fieldStyle, maxWidth: 240 }} type="number" value={form.price_amount}
              onChange={e => set('price_amount', e.target.value)} placeholder="เว้นว่างได้" />
          </div>

          {/* รายละเอียดวงเงิน (ใช้คอลัมน์ price_note เดิม) */}
          <div>
            <label style={labelStyle}>รายละเอียดวงเงิน</label>
            <input style={fieldStyle} value={form.price_note}
              onChange={e => set('price_note', e.target.value)} placeholder='เช่น "สูงสุด" / "ติดต่อสอบถาม" / "ตามหลักเกณฑ์ที่ธนาคารกำหนด"' />
          </div>

          {/* เฉพาะสินเชื่อ: ระยะเวลากู้ / หลักประกัน (อัตราดอกเบี้ยแยกไปแท็บ "อัตราดอกเบี้ย/ค่าบริการทางการเงิน") */}
          {isLoan && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>ข้อมูลเฉพาะสินเชื่อ</div>
              <div>
                <label style={labelStyle}>ระยะเวลากู้</label>
                <input style={fieldStyle} value={form.loan_term}
                  onChange={e => set('loan_term', e.target.value)} placeholder='เช่น "สูงสุด 7 ปี"' />
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
              <button type="button" className="btn btn-sm" onClick={() => setActiveFormTab('rate')}
                style={{ alignSelf: 'flex-start' }}>
                📊 ไปกรอกอัตราดอกเบี้ย / ค่าบริการทางการเงิน →
              </button>
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
          </>
          )}

          <div>
            <button className="btn" disabled={busy} onClick={save}>
              {busy ? 'กำลังบันทึก…' : (editId ? 'บันทึกการแก้ไข' : 'บันทึกข้อเสนอ/บริการ')}
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            * ข้อเสนอ/บริการจะอยู่สถานะ "รออนุมัติ" จนกว่า ส.อ.ท. จะอนุมัติ จึงจะแสดงให้ SME เห็น
          </p>
        </div>
      )}


      {initial.length === 0 ? (
        <p className="empty" style={{ marginTop: 16 }}>ยังไม่มีข้อเสนอ/บริการ — กด "สร้างข้อเสนอ/บริการใหม่" เพื่อเริ่ม</p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr><th>ข้อเสนอ/บริการ</th><th>ประเภท</th><th>ผู้สมัคร</th><th>วงเงิน</th><th>สถานะ</th><th>จัดการ</th></tr>
          </thead>
          <tbody>
            {initial.map(p => {
              const ap = APPROVAL_LABELS[p.approval_status] ?? APPROVAL_LABELS.pending
              const count = applicantCounts[p.id] ?? 0
              const logs = logsCache[p.id]
              return (
                <>
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {(p.cover_square?.url || p.image_url) && (
                        <img src={p.cover_square?.url || p.image_url!} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      )}
                      <div>
                        <button type="button" onClick={() => setDetailPkg(p)}
                          style={{
                            border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                            color: '#1e3a8a', fontWeight: 600, fontSize: 14, textAlign: 'left',
                            textDecoration: 'underline', textDecorationColor: 'transparent',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.textDecorationColor = '#1e3a8a')}
                          onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                          title="คลิกเพื่อดูรายละเอียด">
                          {p.title}
                        </button>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {p.category || '—'}
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
                        onClick={() => setDetailPkg(p)}>
                        รายละเอียด
                      </button>
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
                    <button
                      onClick={() => toggleLog(p.id)}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e3a8a',
                        fontSize: 12, padding: 0, marginTop: 6 }}>
                      {showLog === p.id ? '▼' : '▶'} ประวัติการแก้ไข
                    </button>
                  </td>
                </tr>
                {showLog === p.id && (
                  <tr key={p.id + '-log'}>
                    <td colSpan={6} style={{ background: '#f8fafc', padding: '10px 16px' }}>
                      {!logs ? (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>กำลังโหลด…</span>
                      ) : logs.length === 0 ? (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>ยังไม่มีประวัติ</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {logs.map(log => (
                            <div key={log.id} style={{ fontSize: 12, color: '#475569' }}>
                              <strong>{log.changed_by_name ?? '—'}</strong>
                              <span style={{ color: '#94a3b8' }}> ({ROLE_LABEL[log.changed_by_role ?? ''] ?? log.changed_by_role})</span>
                              {' '}{ACTION_LABEL[log.action] ?? log.action}
                              <span style={{ color: '#94a3b8' }}> — {new Date(log.created_at).toLocaleString('th-TH')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </>
              )
            })}
          </tbody>
        </table>
      )}
    </div>

    {detailPkg && (
      <PackageDetailModal
        pkg={detailPkg}
        applicantCount={applicantCounts[detailPkg.id] ?? 0}
        onClose={() => setDetailPkg(null)}
      />
    )}
    </>
  )
}

// ============================================
// helper: format ขนาดไฟล์และวันที่ให้อ่านง่าย (แบบไทย)
// ============================================
function formatFileSize(bytes: number | null): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function formatThaiDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const buddhistYear = d.getFullYear() + 543
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${buddhistYear} ${hh}:${min}`
}

// ============================================
// การ์ดอัปโหลดภาพหน้าปก 1 ช่อง (แบนเนอร์ หรือ จตุรัส) — dropzone ซ้าย + ตัวอย่างภาพปัจจุบันขวา
// ============================================
function CoverUploadCard({
  title, ratioLabel, recommendSize, aspectRatio, outputWidth, outputHeight, file, setFile, existing, onRemove,
}: {
  title: string
  ratioLabel: string
  recommendSize: string
  aspectRatio: number
  outputWidth: number
  outputHeight: number
  file: File | null
  setFile: (f: File | null) => void
  existing: ImageMeta | null
  onRemove: () => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null) // ไฟล์ที่เพิ่งเลือก รอ crop ยืนยันก่อนถึงจะใช้จริง
  const preview = file ? URL.createObjectURL(file) : existing?.url ?? null
  const hasUploaded = !!(file || existing)

  const labelStyle = { fontSize: 13, color: '#475569', fontWeight: 500 } as const

  function handlePickFile(f: File | null) {
    if (!f) return
    // บังคับให้ crop ก่อนเสมอ — ยังไม่ set เป็นไฟล์จริง จนกว่าจะกดยืนยันใน cropper
    setPendingFile(f)
  }

  return (
    <div>
      {pendingFile && (
        <ImageCropper
          file={pendingFile}
          aspectRatio={aspectRatio}
          outputWidth={outputWidth}
          outputHeight={outputHeight}
          title={title}
          onCancel={() => setPendingFile(null)}
          onConfirm={croppedFile => { setFile(croppedFile); setPendingFile(null) }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <label style={labelStyle}>{title}</label>
        <span style={{
          fontSize: 11, color: '#64748b', background: '#f1f5f9',
          padding: '2px 8px', borderRadius: 10,
        }}>
          อัตราส่วน {ratioLabel}
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
        แนะนำขนาด {recommendSize} · รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5 MB
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {/* Dropzone */}
        <label
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f && f.type.startsWith('image/')) handlePickFile(f)
          }}
          style={{
            flex: '1 1 200px', cursor: 'pointer', textAlign: 'center',
            padding: '20px 12px', borderRadius: 10, minHeight: 120,
            border: `2px dashed ${dragOver ? '#1e3a8a' : '#cbd5e1'}`,
            background: dragOver ? '#eff6ff' : '#f8fafc',
            color: '#64748b', fontSize: 13, transition: 'all .15s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
          <div style={{ fontSize: 26, marginBottom: 6 }}>☁️</div>
          <div>ลากรูปมาวางที่นี่</div>
          <div style={{ color: '#2563eb', fontWeight: 600 }}>หรือคลิกเพื่อเลือกไฟล์</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>(อัปโหลดได้ 1 ภาพ)</div>
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { handlePickFile(e.target.files?.[0] ?? null); e.target.value = '' }} />
        </label>

        {/* ตัวอย่างภาพปัจจุบัน */}
        {hasUploaded && preview && (
          <div style={{ flex: '1 1 200px', border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>ตัวอย่างภาพปัจจุบัน</span>
              <span style={{
                fontSize: 11, color: '#166534', background: '#dcfce7',
                padding: '2px 8px', borderRadius: 10, fontWeight: 600,
              }}>
                {file ? 'เลือกใหม่ (ยังไม่บันทึก)' : 'อัปโหลดแล้ว'}
              </span>
            </div>
            <img src={preview} alt="" style={{
              width: '100%', maxWidth: 280, aspectRatio: `${aspectRatio}`, objectFit: 'cover', borderRadius: 8,
              border: '1px solid #e2e8f0', display: 'block',
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
              <div>
                <div style={{ fontSize: 12, color: '#334155', fontWeight: 500 }}>
                  {file ? file.name : existing?.filename}
                </div>
                {!file && existing?.uploaded_at && (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    อัปโหลดเมื่อ {formatThaiDate(existing.uploaded_at)}
                  </div>
                )}
              </div>
              <button type="button" onClick={onRemove} title="ลบรูป"
                style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, padding: 4 }}>
                🗑
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// แท็บภาพประกอบ — ภาพหน้าปก 2 แบบ (แบนเนอร์/จตุรัส) + แกลเลอรีรูปรายละเอียดสูงสุด 10 ภาพ
// ============================================
function ImagesTab({
  coverBannerFile, setCoverBannerFile, coverBannerExisting, onRemoveCoverBanner,
  coverSquareFile, setCoverSquareFile, coverSquareExisting, onRemoveCoverSquare,
  existingDetailImages, newDetailFiles, maxDetailImages,
  addDetailFiles, removeNewDetailFile, removeExistingDetailImage,
  onSortByFilename, onClearAll,
}: {
  coverBannerFile: File | null
  setCoverBannerFile: (f: File | null) => void
  coverBannerExisting: ImageMeta | null
  onRemoveCoverBanner: () => void
  coverSquareFile: File | null
  setCoverSquareFile: (f: File | null) => void
  coverSquareExisting: ImageMeta | null
  onRemoveCoverSquare: () => void
  existingDetailImages: ImageMeta[]
  newDetailFiles: File[]
  maxDetailImages: number
  addDetailFiles: (files: FileList | null) => void
  removeNewDetailFile: (idx: number) => void
  removeExistingDetailImage: (url: string) => void
  onSortByFilename: () => void
  onClearAll: () => void
}) {
  const [detailDragOver, setDetailDragOver] = useState(false)
  const totalDetail = existingDetailImages.length + newDetailFiles.length
  const roomLeft = maxDetailImages - totalDetail

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* ① ภาพหน้าปก / Profile บริการ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', background: '#2563eb', color: '#fff',
            fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>1</span>
          <h3 style={{ margin: 0, fontSize: 15, color: '#1e293b' }}>ภาพหน้าปก / Profile บริการ</h3>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 14px 30px' }}>
          อัปโหลดภาพหน้าปก 2 แบบ เพื่อใช้แสดงบนหน้าเพจและสื่อโซเชียล
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingLeft: 30 }}>
          <CoverUploadCard
            title="1) ภาพหน้าปกแนวยาว (แบนเนอร์)"
            ratioLabel="2:1"
            recommendSize="1200 x 600 px (กว้าง x สูง)"
            aspectRatio={2 / 1}
            outputWidth={1200}
            outputHeight={600}
            file={coverBannerFile}
            setFile={setCoverBannerFile}
            existing={coverBannerExisting}
            onRemove={onRemoveCoverBanner}
          />
          <CoverUploadCard
            title="2) ภาพหน้าปกจตุรัส (สี่เหลี่ยมจัตุรัส)"
            ratioLabel="1:1"
            recommendSize="1080 x 1080 px (กว้าง x สูง)"
            aspectRatio={1 / 1}
            outputWidth={1080}
            outputHeight={1080}
            file={coverSquareFile}
            setFile={setCoverSquareFile}
            existing={coverSquareExisting}
            onRemove={onRemoveCoverSquare}
          />
        </div>
      </div>

      {/* ② ภาพรายละเอียดบริการ */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%', background: '#2563eb', color: '#fff',
            fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>2</span>
          <h3 style={{ margin: 0, fontSize: 15, color: '#1e293b' }}>ภาพรายละเอียดบริการ</h3>
          <span style={{
            fontSize: 11, color: '#0369a1', background: '#e0f2fe',
            padding: '2px 8px', borderRadius: 10,
          }}>
            อัปโหลดได้สูงสุด {maxDetailImages} ภาพ
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 14px 30px' }}>
          อัปโหลดภาพรายละเอียดเพิ่มเติม เพื่อแสดงในแกลเลอรี
        </p>

        <div style={{ paddingLeft: 30 }}>
          <label
            onDragOver={e => { e.preventDefault(); setDetailDragOver(true) }}
            onDragLeave={e => { e.preventDefault(); setDetailDragOver(false) }}
            onDrop={e => {
              e.preventDefault(); setDetailDragOver(false)
              const files = Array.from(e.dataTransfer.files ?? []).filter(f => f.type.startsWith('image/'))
              if (files.length > 0) {
                const dt = new DataTransfer()
                files.forEach(f => dt.items.add(f))
                addDetailFiles(dt.files)
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
              cursor: roomLeft > 0 ? 'pointer' : 'not-allowed', padding: '16px 18px', borderRadius: 10,
              border: `2px dashed ${detailDragOver ? '#1e3a8a' : '#cbd5e1'}`,
              background: detailDragOver ? '#eff6ff' : '#f8fafc',
              color: '#64748b', fontSize: 13, opacity: roomLeft > 0 ? 1 : 0.6,
            }}>
            <span>
              <span style={{ marginRight: 6 }}>☁️</span>
              ลากรูปมาวางที่นี่ <span style={{ color: '#2563eb', fontWeight: 600 }}>หรือคลิกเพื่อเลือกไฟล์</span>
            </span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>อัปโหลดได้สูงสุด {maxDetailImages} ภาพ</span>
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} disabled={roomLeft <= 0}
              onChange={e => { addDetailFiles(e.target.files); e.target.value = '' }} />
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
              แกลเลอรี ({totalDetail} / {maxDetailImages} ภาพ)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onSortByFilename} disabled={totalDetail === 0}>
                ⇅ จัดเรียงอัตโนมัติ
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={onClearAll} disabled={totalDetail === 0}
                style={{ color: '#dc2626' }}>
                🗑 ล้างรายการทั้งหมด
              </button>
            </div>
          </div>

          {totalDetail > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 10, marginTop: 12,
            }}>
              {existingDetailImages.map(img => (
                <div key={img.url} style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <button type="button" onClick={() => removeExistingDetailImage(img.url)} title="ลบรูป"
                    style={{
                      position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(15,23,42,0.6)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer',
                      lineHeight: 1, zIndex: 1,
                    }}>×</button>
                  <img src={img.url} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 11, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {img.filename}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                      {img.uploaded_at && `อัปโหลดเมื่อ ${formatThaiDate(img.uploaded_at)}`}
                      {img.uploaded_at && img.size != null && <br />}
                      {formatFileSize(img.size)}
                    </div>
                  </div>
                </div>
              ))}
              {newDetailFiles.map((file, idx) => (
                <div key={idx} style={{ border: '1px solid #93c5fd', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  <button type="button" onClick={() => removeNewDetailFile(idx)} title="ลบรูป"
                    style={{
                      position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '50%',
                      background: 'rgba(15,23,42,0.6)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer',
                      lineHeight: 1, zIndex: 1,
                    }}>×</button>
                  <img src={URL.createObjectURL(file)} alt="" style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 11, color: '#334155', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#2563eb' }}>{formatFileSize(file.size)} · ยังไม่บันทึก</div>
                  </div>
                </div>
              ))}
              {/* ปุ่มเพิ่มรูปภาพ (ถ้ายังไม่เต็ม) */}
              {roomLeft > 0 && (
                <label style={{
                  border: '2px dashed #cbd5e1', borderRadius: 8, minHeight: 120, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: '#2563eb', fontSize: 13, fontWeight: 600, gap: 4,
                }}>
                  <span style={{ fontSize: 20 }}>+</span>
                  เพิ่มรูปภาพ
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                    onChange={e => { addDetailFiles(e.target.files); e.target.value = '' }} />
                </label>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
        padding: '10px 12px', fontSize: 12, color: '#1e40af',
      }}>
        ℹ️ แนะนำให้ใช้รูปที่มีคุณภาพดี มีความคมชัดสูง เพื่อประสบการณ์ที่ดีของผู้ใช้งาน
      </div>
    </div>
  )
}
