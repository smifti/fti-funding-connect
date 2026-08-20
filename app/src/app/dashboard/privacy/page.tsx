import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/shared'
import PrivacyClient from './PrivacyClient'

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  const role = profile?.role ?? 'sme'

  const { data: consents } = await supabase
    .from('pdpa_consent_logs')
    .select('id, consent_type, agency_name_snapshot, package_title_snapshot, consented_at, withdrawn_at')
    .eq('user_id', user.id)
    .order('consented_at', { ascending: false })

  const { data: requests } = await supabase
    .from('dsar_requests')
    .select('id, request_type, details, status, resolution_note, created_at, resolved_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <TopBar role={role} />
      <main>
        <div className="container" style={{ maxWidth: 760 }}>
          <h1 style={{ fontSize: 22, margin: '20px 0 4px', color: '#1e3a8a' }}>ความเป็นส่วนตัวของฉัน</h1>
          <p style={{ color: '#64748b', marginBottom: 20 }}>
            ประวัติการยินยอม และช่องทางยื่นคำขอใช้สิทธิเจ้าของข้อมูลส่วนบุคคลตาม PDPA
          </p>
          <PrivacyClient
            consents={consents ?? []}
            requests={requests ?? []}
          />
        </div>
      </main>
    </>
  )
}
