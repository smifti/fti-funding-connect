'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function ExpertScreenAction({
  appId, stepKey,
}: { appId: string; stepKey: 'submitted' | 'screening' }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  async function setState(state: 'passed' | 'failed', noteText: string | null) {
    setLoading(true); setErr('')
    const { error } = await supabase.rpc('set_application_step_status', {
      p_app_id: appId, p_step_key: stepKey, p_state: state, p_note: noteText,
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setRejecting(false); setNote('')
    router.refresh()
  }

  if (rejecting) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200 }}>
        {err && <div style={{ color: '#dc2626', fontSize: 12 }}>{err}</div>}
        <textarea
          autoFocus rows={2} placeholder="เหตุผลที่ไม่ผ่าน (SME จะเห็นข้อความนี้)"
          value={note} onChange={e => setNote(e.target.value)}
          style={{ fontSize: 13, padding: 6, borderRadius: 6, border: '1px solid #cbd5e1' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm" disabled={loading || !note.trim()}
            style={{ background: '#dc2626' }}
            onClick={() => setState('failed', note.trim())}>
            {loading ? '…' : 'ยืนยันไม่ผ่าน'}
          </button>
          <button className="btn btn-sm btn-ghost" disabled={loading}
            onClick={() => { setRejecting(false); setNote(''); setErr('') }}>
            ยกเลิก
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {err && <div style={{ color: '#dc2626', fontSize: 12 }}>{err}</div>}
      <button className="btn btn-sm" disabled={loading} onClick={() => setState('passed', null)}>
        {loading ? '…' : 'ผ่าน'}
      </button>
      <button className="btn btn-ghost btn-sm" disabled={loading} style={{ color: '#dc2626' }}
        onClick={() => setRejecting(true)}>
        ไม่ผ่าน
      </button>
    </div>
  )
}
