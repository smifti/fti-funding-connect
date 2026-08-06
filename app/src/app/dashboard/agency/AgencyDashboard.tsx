import { createClient } from '@/lib/supabase-server'
import AgencyTabs from './AgencyTabs'
export default async function AgencyDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, agency_name, agency_categories, full_name, phone, agency_email, agency_website, agency_description')
    .eq('id', userId)
    .single()

  // คำขอที่ส่งต่อมา (forwarded) — RLS จำกัดเฉพาะด้านของ agency อยู่แล้ว
  const { data: requests } = await supabase
    .from('funding_requests')
    .select('id, category, status, detail, created_at, sme_profiles(company_name, province, sme_one_id)')
    .eq('status', 'forwarded')
    .order('created_at', { ascending: true })

  // รายชื่อ SME ที่เกี่ยวข้อง — RLS (agency_can_see_sme) จำกัดเฉพาะ SME ที่ยื่นคำขอด้านของ agency
  const { data: smeList } = await supabase
    .from('sme_profiles')
    .select('id, company_name, province, sme_one_id, business_type')
    .order('company_name', { ascending: true })

  return (
    <AgencyTabs
      profile={profile!}
      requests={requests ?? []}
      smeList={smeList ?? []}
    />
  )
}
