import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/shared'
import AgencyApplicants from '../agency/AgencyApplicants'

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'sme'
  if (role !== 'admin' && role !== 'expert') redirect('/dashboard')

  // ดึงใบสมัครทั้งหมด (RLS ให้ admin/expert เห็นทั้งหมด)
  const { data: applicants } = await supabase
    .from('package_applications')
    .select('id, status, steps, created_at, packages(title, category), sme_profiles(company_name, province, sme_one_id)')
    .order('created_at', { ascending: false })

  return (
    <>
      <TopBar role={role} />
      <main>
        <div className="container">
          <h1 className="page-title">จัดการใบสมัครแพ็กเกจ</h1>
          <p className="page-sub">
            ตรวจสอบและกำหนดสถานะใบสมัครของ SME ในแต่ละแพ็กเกจ
          </p>
          <AgencyApplicants initial={applicants ?? []} />
        </div>
      </main>
    </>
  )
}
