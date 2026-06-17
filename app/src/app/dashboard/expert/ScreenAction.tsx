'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function ScreenAction({
  requestId, status,
}: { requestId: string; status: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function update(newStatus: string) {
    setLoading(true)
    await supabase.from('funding_requests')
      .update({ status: newStatus })
      .eq('id', requestId)
    setLoading(false)
    router.refresh()
  }

  if (status === 'submitted') {
    return (
      <button className="btn btn-ghost btn-sm" disabled={loading}
        onClick={() => update('screening')}>
        เริ่มคัดกรอง
      </button>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="btn btn-sm" disabled={loading} onClick={() => update('forwarded')}>
        ส่งต่อหน่วยงาน
      </button>
      <button className="btn btn-ghost btn-sm" disabled={loading} onClick={() => update('rejected')}>
        ไม่ผ่าน
      </button>
    </div>
  )
}
