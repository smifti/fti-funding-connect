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

type Pkg = {
  id: string
  category: string
  title: string
  description: string | null
  price_amount: number | null
  price_note: string | null
  approval_status: string
  is_active: boolean
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
  const [form, setForm] = useState({
    category: categories[0] ?? 'credit',
    title: '',
    description: '',
    price_amount: '',
    price_note: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function create() {
    if (!form.title.trim()) { setMsg('กรุณาระบุชื่อแพ็กเกจ'); return }
    setBusy(true); setMsg('')
    const { error } = await supabase.from('packages').insert({
      owner_id: ownerId,
      category: form.category,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price_amount: form.price_amount ? Number(form.price_amount) : null,
      price_note: form.price_note.trim() || null,
    })
    setBusy(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setShowForm(false)
    setForm({ category: categories[0] ?? 'credit', title: '', description: '', price_amount: '', price_note: '' })
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
          <div>
            <label style={labelStyle}>ด้านที่เกี่ยวข้อง</label>
            <select style={fieldStyle} value={form.category} onChange={e => set('category', e.target.value)}>
              {categories.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>ชื่อแพ็กเกจ *</label>
            <input style={fieldStyle} value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="เช่น สินเชื่อ SME ดอกเบี้ยพิเศษ" />
          </div>
          <div>
            <label style={labelStyle}>รายละเอียด</label>
            <textarea style={{ ...fieldStyle, minHeight: 90, resize: 'vertical' }}
              value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="อธิบายเงื่อนไข สิ่งที่ SME จะได้รับ ฯลฯ" />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>ราคา (บาท)</label>
              <input style={fieldStyle} type="number" value={form.price_amount}
                onChange={e => set('price_amount', e.target.value)} placeholder="เว้นว่างได้" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>หมายเหตุราคา</label>
              <input style={fieldStyle} value={form.price_note}
                onChange={e => set('price_note', e.target.value)} placeholder='เช่น "เริ่มต้น" / "ติดต่อสอบถาม"' />
            </div>
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
            <tr><th>ชื่อแพ็กเกจ</th><th>ด้าน</th><th>ราคา</th><th>สถานะ</th><th>การจัดการ</th></tr>
          </thead>
          <tbody>
            {initial.map(p => {
              const ap = APPROVAL_LABELS[p.approval_status] ?? APPROVAL_LABELS.pending
              return (
                <tr key={p.id}>
                  <td>
                    {p.title}
                    {p.description && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', maxWidth: 260 }}>{p.description}</div>
                    )}
                  </td>
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
