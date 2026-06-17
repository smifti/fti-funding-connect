'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

const CATEGORIES: [string, string][] = [
  ['credit', 'สินเชื่อ'],
  ['innovation', 'นวัตกรรม'],
  ['management', 'บริหารจัดการ'],
  ['marketing', 'การตลาด'],
  ['production', 'การผลิต'],
  ['upskill', 'Upskill / Reskill'],
  ['other', 'อื่น ๆ (ESG)'],
]

export default function NewRequestForm({
  smeId, usedCategories,
}: { smeId: string; usedCategories: string[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [category, setCategory] = useState('')
  const [detail, setDetail] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!category) { setErr('โปรดเลือกด้านที่ต้องการ'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.from('funding_requests').insert({
      sme_id: smeId, category, detail,
    })
    setLoading(false)
    if (error) {
      // unique (sme_id, category) -> กันรับซ้ำ
      setErr('คุณมีคำขอด้านนี้อยู่แล้ว ไม่สามารถยื่นซ้ำได้')
      return
    }
    setCategory(''); setDetail('')
    router.refresh()
  }

  return (
    <div>
      {err && <div className="alert alert-err">{err}</div>}
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
        เลือกด้านที่ต้องการขอรับการสนับสนุน (ด้านที่ยื่นแล้วจะถูกปิดไว้เพื่อป้องกันรับซ้ำ)
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {CATEGORIES.map(([val, label]) => {
          const used = usedCategories.includes(val)
          return (
            <button
              key={val}
              className={`cat-chip ${category === val ? 'active' : ''}`}
              disabled={used}
              style={used ? { opacity: .4, cursor: 'not-allowed' } : {}}
              onClick={() => setCategory(val)}
            >
              {label}{used ? ' ✓' : ''}
            </button>
          )
        })}
      </div>
      <div className="field">
        <label>รายละเอียดเพิ่มเติม</label>
        <textarea
          value={detail}
          onChange={e => setDetail(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 9, background: '#fcfcfe', resize: 'vertical' }}
          placeholder="อธิบายความต้องการ เช่น วงเงิน วัตถุประสงค์ ฯลฯ"
        />
      </div>
      <button className="btn btn-sm" onClick={submit} disabled={loading}>
        {loading ? 'กำลังส่ง…' : 'ยื่นคำขอ'}
      </button>
    </div>
  )
}
