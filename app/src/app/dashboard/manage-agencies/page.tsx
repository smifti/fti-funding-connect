import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/shared'
import AgencyGroupManager from './AgencyGroupManager'

export default async function ManageAgenciesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: agencies } = await supabase.rpc('admin_list_agencies')
  const { data: unassignedUsers } = await supabase.rpc('admin_list_unassigned_agency_users')

  return (
    <>
      <TopBar role="admin" />
      <main>
        <div className="container">
          <h1 className="page-title">จัดการหน่วยงาน</h1>
          <p className="page-sub">
            จัดกลุ่ม user ที่เป็นหน่วยงานเดียวกันให้ใช้ข้อมูลหน่วยงานร่วมกัน (โลโก้ / ชื่อ / คำอธิบาย / ผู้ติดต่อ)
          </p>
          <AgencyGroupManager
            initialAgencies={agencies ?? []}
            initialUnassigned={unassignedUsers ?? []}
          />
        </div>
      </main>
    </>
  )
}
