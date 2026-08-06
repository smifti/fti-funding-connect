import { createClient } from '@/lib/supabase-server'
import AgencyTabs from './AgencyTabs'
export default async function AgencyDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, agency_name, agency_categories, full_name, phone, agency_email, agency_website, agency_description')
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
    .select('id, category, title, description, price_amount, price_note, approval_status, is_active')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  return (
    <AgencyTabs
      profile={profile!}
      requests={requests ?? []}
      smeList={smeList ?? []}
      packages={packages ?? []}
    />
  )
}
