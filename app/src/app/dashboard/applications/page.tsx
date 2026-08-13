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
    .select('role, full_name, agency_name')
    .eq('id', user.id)
    .single()
  const role = profile?.role ?? 'sme'
  if (role !== 'admin' && role !== 'expert') redirect('/dashboard')

  // ดึงใบสมัครทั้งหมด + ประวัติ (RLS ให้ admin/expert เห็นทั้งหมด)
  const { data: applicants } = await supabase
    .from('package_applications')
    .select(`
      id, status, steps, created_at,
      step1_started_at, step2_started_at, step3_started_at,
      packages(title, category, min_amount, max_amount),
      sme_profiles(owner_id, company_name, province, sme_one_id),
      application_logs(id, step_key, new_state, note, changed_by_name, changed_by_role, created_at)
    `)
    .order('created_at', { ascending: false })

  // ค่า SLA และวันหยุดพิเศษ (สำหรับคำนวณกำหนดเวลาในหน้าติดตามกิจกรรม)
  const { data: slaConfigRow } = await supabase
    .from('sla_config')
    .select('step1_days, step2_days, step3_days_low, step3_days_high, step3_threshold_amount')
    .limit(1)
    .maybeSingle()

  const { data: holidayRows } = await supabase
    .from('holidays')
    .select('holiday_date')

  const slaConfig = slaConfigRow ?? {
    step1_days: 5, step2_days: 5, step3_days_low: 20, step3_days_high: 30, step3_threshold_amount: 15000000,
  }
  const holidays = (holidayRows ?? []).map((h: any) => h.holiday_date as string)

  const currentUser = {
    id: user.id,
    name: profile?.full_name || profile?.agency_name || '—',
    role: role,
  }

  return (
    <>
      <TopBar role={role} />
      <main>
        <div className="container">
          <h1 className="page-title">ติดตามกิจกรรม</h1>
          <p className="page-sub">
            ตรวจสอบและกำหนดสถานะใบสมัครของ SME ในแต่ละบริการ
          </p>
          <AgencyApplicants
            initial={applicants ?? []}
            currentUser={currentUser}
            slaConfig={slaConfig}
            holidays={holidays}
          />
        </div>
      </main>
    </>
  )
}
