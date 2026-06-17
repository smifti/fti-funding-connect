import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/shared'
import UserManager from './UserManager'

export default async function ManageUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase.rpc('admin_list_users')

  return (
    <>
      <TopBar role="admin" />
      <main>
        <div className="container">
          <h1 className="page-title">จัดการผู้ใช้และสิทธิ์</h1>
          <p className="page-sub">
            เปลี่ยนบทบาทผู้ใช้ · ตั้งหน่วยงานและด้านที่รับผิดชอบ · มีเฉพาะผู้ดูแลระบบ
          </p>
          <UserManager initialUsers={users ?? []} myId={user.id} />
        </div>
      </main>
    </>
  )
}
