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
    .select(`
      id, template_type, category, title, overview, description, price_amount, price_note,
      funding_type, support_items, target_sme, target_industry, open_period, image_url,
      approval_status, is_active, service_status,
      package_type, related_sectors, min_amount, max_amount, eligibility_criteria,
      loan_term, collateral_required, collateral_detail,
      cover_banner, cover_square, detail_images, required_documents,
      package_rate_structures(*),
      profiles (
        full_name, agency_name, agency_email, phone,
        agencies ( name, logo, description, website, email, contact_name, contact_phone )
      )
    `)
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false })
  // แพ็กเกจที่ SME นี้สมัครไปแล้ว (พร้อม timeline)
  const { data: apps } = await supabase
    .from('package_applications')
    .select('id, package_id, status, steps, created_at, packages(title, category, image_url, approval_status, is_active, service_status, profiles(agency_name))')
    .eq('sme_id', sme.id)
    .order('created_at', { ascending: false })
  const appliedIds = (apps ?? []).map((a: any) => a.package_id).filter(Boolean)

  // package_id ที่ SME คนนี้บันทึกไว้ (บุ๊กมาร์ก)
  const { data: savedIdsData } = await supabase.rpc('list_my_saved_package_ids')
  const savedIds: string[] = savedIdsData ?? []

  return (
    <SmeTabs
      sme={sme}
      requests={requestsWithNote}
      health={health}
      packages={packages ?? []}
      appliedIds={appliedIds}
      savedIds={savedIds}
      myApplications={apps ?? []}
    />
  )
}
