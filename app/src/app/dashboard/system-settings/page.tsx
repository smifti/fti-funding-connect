import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/shared'
import SystemSettingsManager from './SystemSettingsManager'

export default async function SystemSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = profile?.role ?? 'sme'

  // เฉพาะ admin เท่านั้น
  if (role !== 'admin') redirect('/dashboard')

  const { data: slaConfig } = await supabase
    .from('sla_config')
    .select('*')
    .limit(1)
    .maybeSingle()

  const { data: holidays } = await supabase
    .from('holidays')
    .select('*')
    .order('holiday_date', { ascending: true })

  return (
    <>
      <TopBar role={role} />
      <main>
        <div className="container">
          <h1 className="page-title">ตั้งค่าระบบ</h1>
          <p className="page-sub">
            กำหนดระยะเวลา SLA และวันหยุดพิเศษ สำหรับใช้คำนวณกำหนดเวลาในแต่ละขั้นตอน
          </p>
          <SystemSettingsManager
            initialSlaConfig={slaConfig}
            initialHolidays={holidays ?? []}
            currentUserId={user.id}
          />
        </div>
      </main>
    </>
  )
}
