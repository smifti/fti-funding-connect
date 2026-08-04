import { createClient } from '@/lib/supabase-server'
import SmeTabs from './SmeTabs'

export default async function SmeDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data: sme } = await supabase
    .from('sme_profiles')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle()

  if (!sme) {
    return (
      <div className="card">
        <h2>ยังไม่พบโปรไฟล์กิจการ</h2>
        <p className="page-sub">โปรดติดต่อผู้ดูแลระบบเพื่อตั้งค่าโปรไฟล์ของท่าน</p>
      </div>
    )
  }

  const { data: requests } = await supabase
    .from('funding_requests')
    .select('id, category, status, detail, created_at, updated_at')
    .eq('sme_id', sme.id)
    .order('created_at', { ascending: false })

  const { data: health } = await supabase
    .from('health_checks')
    .select('*')
    .eq('sme_id', sme.id)
    .order('created_at', { ascending: false })
    .maybeSingle()

  return (
    <SmeTabs
      sme={sme}
      requests={requests ?? []}
      health={health}
    />
  )
}
