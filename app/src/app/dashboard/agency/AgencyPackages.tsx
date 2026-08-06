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
}

export default function AgencyPackages({
  ownerId, categories, initial,
}: {
  ownerId: string
  categories: string[]
  initial: Pkg[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, category: categories[0] ?? 'credit' })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function create() {
    if (!form.title.trim()) { setMsg('กรุณาระบุชื่อแพ็กเกจ'); return }
    setBusy(true); setMsg('')

    // อัปโหลดรูปก่อน (ถ้ามี)
    let imageUrl: string | null = null
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

    const { error } = await supabase.from('packages').insert({
      owner_id: ownerId,
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
      image_url: imageUrl,
    })
    setBusy(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setShowForm(false)
    setForm({ ...EMPTY_FORM, category: categories[0] ?? 'credit' })
    setImageFile(null)
    router.refresh()
  }

  async function toggleActive(id: string, current: boolean) {
    setBusy(true)
    await supabase.from('packages').update({ is_active: !current }).eq('id', id)
    setBusy(false)
    router.refresh()
  }

  async function remove(id: string) {
    if (!confirm('ต้องการลบแพ็กเกจนี้ใช่หรือไม่?')) return
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

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>แพ็กเกจของฉัน ({initial.length})</h2>
        <button className="btn btn-sm" onClick={() => { setShowForm(!showForm); setMsg('') }}>
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

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ประเภทแพ็กเกจ</label>
              <select style={fieldStyle} value={form.template_type} onChange={e => set('template_type', e.target.value)}>
                <option value="grant">หน่วยงานให้ทุน / บริการอื่น ๆ</option>
                <option value="loan">สินเชื่อ</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ด้านที่เกี่ยวข้อง</label>
              <select style={fieldStyle} value={form.category} onChange={e => set('category', e.target.value)}>
                {categories.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                ))}
              </select>
            </div>
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

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>วงเงินสนับสนุน (บาท)</label>
              <input style={fieldStyle} type="number" value={form.price_amount}
                onChange={e => set('price_amount', e.target.value)} placeholder="เว้นว่างได้" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>หมายเหตุวงเงิน</label>
              <input style={fieldStyle} value={form.price_note}
                onChange={e => set('price_note', e.target.value)} placeholder='เช่น "สูงสุด" / "ติดต่อสอบถาม"' />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>รูปแบบทุน</label>
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
              <label style={labelStyle}>อุตสาหกรรมเป้าหมาย</label>
              <input style={fieldStyle} value={form.target_industry}
                onChange={e => set('target_industry', e.target.value)} placeholder="เช่น อาหาร, พลังงาน, Digital" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>รูปภาพ (thumbnail / brochure)</label>
            <input style={{ ...fieldStyle, padding: 6 }} type="file" accept="image/*"
              onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
            {imageFile && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>เลือกแล้ว: {imageFile.name}</div>
            )}
          </div>

          <div>
            <button className="btn" disabled={busy} onClick={create}>
              {busy ? 'กำลังบันทึก…' : 'บันทึกแพ็กเกจ'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
            * แพ็กเกจใหม่จะอยู่สถานะ "รออนุมัติ" จนกว่า ส.อ.ท. จะอนุมัติ จึงจะแสดงให้ SME เห็น
          </p>
        </div>
      )}

      {initial.length === 0 ? (
        <p className="empty" style={{ marginTop: 16 }}>ยังไม่มีแพ็กเกจ — กด "สร้างแพ็กเกจใหม่" เพื่อเริ่ม</p>
      ) : (
        <table style={{ marginTop: 16 }}>
          <thead>
            <tr><th>แพ็กเกจ</th><th>ประเภท</th><th>ด้าน</th><th>วงเงิน</th><th>สถานะ</th><th>จัดการ</th></tr>
          </thead>
          <tbody>
            {initial.map(p => {
              const ap = APPROVAL_LABELS[p.approval_status] ?? APPROVAL_LABELS.pending
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {p.image_url && (
                        <img src={p.image_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                      )}
                      <div>
                        {p.title}
                        {p.description && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 240 }}>{p.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{TEMPLATE_LABELS[p.template_type] ?? p.template_type}</td>
                  <td>{CATEGORY_LABELS[p.category] ?? p.category}</td>
                  <td>
                    {p.price_amount != null ? p.price_amount.toLocaleString('th-TH') + ' บาท' : '—'}
                    {p.price_note && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.price_note}</div>}
                  </td>
                  <td>
                    <span style={{ background: ap.bg, color: ap.color, fontSize: 12,
                      padding: '3px 10px', borderRadius: 12, whiteSpace: 'nowrap' }}>
                      {ap.text}
                    </span>
                    {!p.is_active && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>ปิดการแสดงผล</div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" disabled={busy}
                        onClick={() => toggleActive(p.id, p.is_active)}>
                        {p.is_active ? 'ปิด' : 'เปิด'}
                      </button>
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
