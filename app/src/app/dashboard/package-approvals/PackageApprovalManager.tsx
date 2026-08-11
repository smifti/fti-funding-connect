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
    .select('role')
    .eq('id', user.id)
    .single()
  const role = profile?.role ?? 'sme'
  // เฉพาะ admin และ expert เท่านั้น
  if (role !== 'admin' && role !== 'expert') redirect('/dashboard')
  const { data: packages } = await supabase
    .from('packages')
    .select('id, template_type, category, title, description, price_amount, price_note, funding_type, support_items, target_sme, target_industry, open_period, image_url, approval_status, is_active, profiles(agency_name, full_name)')
    .order('created_at', { ascending: false })
  return (
    <>
      <TopBar role={role} />
      <main>
        <div className="container">
          <h1 className="page-title">จัดการบริการ</h1>
          <p className="page-sub">
            ตรวจสอบและอนุมัติบริการที่ผู้ให้บริการสร้างขึ้น ก่อนแสดงให้ SME เห็น
          </p>
          <PackageApprovalManager initial={packages ?? []} />
        </div>
      </main>
    </>
  )
}
