import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import SmeDashboard from './sme/SmeDashboard'
import ExpertDashboard from './expert/ExpertDashboard'
import AgencyDashboard from './agency/AgencyDashboard'
import AdminDashboard from './admin/AdminDashboard'
import { TopBar } from '@/components/shared'

const REQ_ROLE_LABEL: Record<string, string> = {
  agency: 'หน่วยงาน / ผู้ให้บริการ',
  expert: 'ที่ปรึกษา / ผู้เชี่ยวชาญ',
}

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, approval_status, requested_role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'sme'
  const status = profile?.approval_status ?? 'approved'

  const { data: sme } = await supabase
    .from('sme_profiles')
    .select('company_name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (status === 'pending') {
    return (
      <>
        <TopBar role={role} />
        <main>
          <div className="container">
            <div className="card" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center', padding: '40px 32px' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>⏳</div>
              <h1 style={{ fontSize: 22, margin: '0 0 8px', color: '#1e3a8a' }}>บัญชีของท่านอยู่ระหว่างรอการอนุมัติ</h1>
              <p style={{ color: '#64748b', margin: '0 0 20px' }}>
                เจ้าหน้าที่ ส.อ.ท. กำลังตรวจสอบข้อมูลของท่าน ท่านจะเข้าใช้งานได้เมื่อได้รับการอนุมัติ
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '16px 20px', textAlign: 'left' }}>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>ชื่อผู้ติดต่อ</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{profile?.full_name || '—'}</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>หน่วยงาน / สังกัด</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>{sme?.company_name || '—'}</div>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>สมัครในฐานะ</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {REQ_ROLE_LABEL[profile?.requested_role ?? ''] || profile?.requested_role || '—'}
                </div>
              </div>
            </div>
          </div>
        </main>
      </>
    )
  }

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
