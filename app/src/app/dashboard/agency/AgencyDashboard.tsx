import { createClient } from '@/lib/supabase-server'
import AgencyTabs from './AgencyTabs'

export default async function AgencyDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, agency_name, agency_categories, full_name, phone, agency_email, agency_website, agency_description, agency_logo')
    .eq('id', userId)
    .single()

  const { data: requests } = await supabase
    .from('funding_requests')
    .select('id, category, status, detail, created_at, sme_profiles(company_name, province, sme_one_id)')
    .eq('status', 'forwarded')
    .order('created_at', { ascending: true })

  const { data: smeList } = await supabase
    .from('sme_profiles')
    .select('id, company_name, province, sme_one_id, business_type')
    .neq('owner_id', userId)
    .order('company_name', { ascending: true })

  // แพ็กเกจของ agency นี้
  const { data: packages } = await supabase
    .from('packages')
    .select(`
      id, template_type, category, title, description, price_amount, price_note,
      funding_type, support_items, target_sme, target_industry, open_period,
      image_url, approval_status, is_active, service_status,
      package_type, related_sectors, min_amount, max_amount, eligibility_criteria,
      loan_term, collateral_required, collateral_detail, detail_images,
      package_rate_structures(*)
    `)
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  // ผู้รับบริการ/ผลิตภัณฑ์/โครงการของ agency นี้ (RLS กรองให้เห็นเฉพาะใบสมัครของแพ็กเกจตัวเอง)
  const { data: applicants } = await supabase
    .from('package_applications')
    .select('id, package_id, status, steps, created_at, packages(title, category), sme_profiles(owner_id, company_name, province, sme_one_id), application_logs(id, step_key, new_state, note, changed_by_name, changed_by_role, created_at)')
    .order('created_at', { ascending: false })

  // นับจำนวนผู้สมัครต่อแพ็กเกจ
  const applicantCounts: Record<string, number> = {}
  for (const app of (applicants ?? []) as any[]) {
    const pid = app.package_id ?? app.packages?.id
    if (pid) applicantCounts[pid] = (applicantCounts[pid] ?? 0) + 1
  }

  // ข้อมูลผู้ใช้ปัจจุบัน (ไว้บันทึก log)
  const currentUser = {
    id: userId,
    name: profile?.agency_name || profile?.full_name || '—',
    role: 'agency',
  }

  return (
    <AgencyTabs
      profile={profile!}
      requests={requests ?? []}
      smeList={smeList ?? []}
      packages={packages ?? []}
      applicants={applicants ?? []}
      currentUser={currentUser}
      applicantCounts={applicantCounts}
    />
  )
}
