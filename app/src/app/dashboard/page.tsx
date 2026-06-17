import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import SmeDashboard from './sme/SmeDashboard'
import ExpertDashboard from './expert/ExpertDashboard'
import AgencyDashboard from './agency/AgencyDashboard'
import AdminDashboard from './admin/AdminDashboard'
import { TopBar } from '@/components/shared'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'sme'

  return (
    <>
      <TopBar role={role} />
      <main>
        <div className="container">
          {role === 'sme' && <SmeDashboard userId={user.id} />}
          {role === 'expert' && <ExpertDashboard />}
          {role === 'agency' && <AgencyDashboard userId={user.id} />}
          {role === 'admin' && <AdminDashboard />}
        </div>
      </main>
    </>
  )
}
