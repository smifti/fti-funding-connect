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

  // ดึงประวัติสถานะทั้งหมดของคำขอเหล่านี้ เพื่อหาเหตุผลล่าสุดตอน "ไม่ผ่าน"
  const reqIds = (requests ?? []).map(r => r.id)
  let notesByReq: Record<string, string> = {}
  if (reqIds.length > 0) {
    const { data: history } = await supabase
      .from('status_history')
      .select('request_id, new_status, note, created_at')
      .in('request_id', reqIds)
      .eq('new_status', 'rejected')
      .order('created_at', { ascending: false })
    // เก็บเฉพาะเหตุผลล่าสุดของแต่ละคำขอ (แถวแรกที่เจอ เพราะเรียงใหม่→เก่า)
    for (const h of history ?? []) {
      if (h.note && !notesByReq[h.request_id]) {
        notesByReq[h.request_id] = h.note
      }
    }
  }
  // แปะเหตุผลเข้าไปในแต่ละคำขอ
  const requestsWithNote = (requests ?? []).map(r => ({
    ...r,
    reject_note: notesByReq[r.id] ?? null,
  }))

  const { data: health } = await supabase
    .from('health_checks')
    .select('*')
    .eq('sme_id', sme.id)
    .order('created_at', { ascending: false })
    .maybeSingle()

  // แพ็กเกจที่อนุมัติแล้ว + เปิดอยู่ (RLS กรองให้เห็นเฉพาะที่ approved+active)
  const { data: packages } = await supabase
    .from('packages')
    .select('id, template_type, category, title, description, price_amount, price_note, funding_type, support_items, target_sme, target_industry, open_period, image_url, profiles(agency_name, agency_email, phone)')
    .eq('approval_status', 'approved')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // แพ็กเกจที่ SME นี้สมัครไปแล้ว
  const { data: apps } = await supabase
    .from('package_applications')
    .select('package_id')
    .eq('sme_id', sme.id)
  const appliedIds = (apps ?? []).map(a => a.package_id)

  return (
    <SmeTabs
      sme={sme}
      requests={requestsWithNote}
      health={health}
      packages={packages ?? []}
      appliedIds={appliedIds}
    />
  )
}
