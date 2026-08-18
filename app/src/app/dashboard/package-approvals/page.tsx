import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/shared'
import PackageApprovalManager from './PackageApprovalManager'

export default async function PackageApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, agency_name')
    .eq('id', user.id)
    .single()
  const role = profile?.role ?? 'sme'

  // เฉพาะ admin และ expert เท่านั้น
  if (role !== 'admin' && role !== 'expert') redirect('/dashboard')

  const { data: packages } = await supabase
    .from('packages')
    .select(`
      id, owner_id, template_type, category, title, description, price_amount, price_note,
      funding_type, support_items, target_sme, target_industry, open_period,
      image_url, approval_status, is_active, service_status,
      package_type, related_sectors, min_amount, max_amount, eligibility_criteria,
      loan_term, collateral_required, collateral_detail,
      cover_banner, cover_square, detail_images,
      package_rate_structures(*),
      profiles(agency_name, full_name, agency_logo),
      package_approval_logs(id, new_status, note, changed_by_name, changed_by_role, created_at)
    `)
    .order('created_at', { ascending: false })

  // นับจำนวนผู้สมัครต่อบริการ (เหมือนฝั่ง agency) เพื่อแสดงใน modal รายละเอียด
  const { data: applications } = await supabase
    .from('package_applications')
    .select('package_id')

  const applicantCounts: Record<string, number> = {}
  for (const app of (applications ?? []) as any[]) {
    if (app.package_id) applicantCounts[app.package_id] = (applicantCounts[app.package_id] ?? 0) + 1
  }

  // ข้อมูลผู้ใช้ปัจจุบัน (ไว้บันทึก log การอนุมัติ)
  const currentUser = {
    id: user.id,
    name: profile?.full_name || profile?.agency_name || '—',
    role,
  }

  return (
    <>
      <TopBar role={role} />
      <main>
        <div className="container">
          <h1 className="page-title">จัดการบริการ</h1>
          <p className="page-sub">
            ตรวจสอบและอนุมัติบริการที่ผู้ให้บริการสร้างขึ้น ก่อนแสดงให้ SME เห็น
          </p>
          <PackageApprovalManager initial={packages ?? []} applicantCounts={applicantCounts} currentUser={currentUser} />
        </div>
      </main>
    </>
  )
}
