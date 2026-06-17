'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

export default function AgencyAction({ requestId }: { requestId: string }) {
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

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button className="btn btn-ghost btn-sm" disabled={loading} onClick={() => update('in_review')}>
        รับเรื่อง
      </button>
      <button className="btn btn-sm" disabled={loading} onClick={() => update('approved')}>
        อนุมัติ
      </button>
    </div>
  )
}
