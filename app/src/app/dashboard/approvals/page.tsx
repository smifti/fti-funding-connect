import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/shared'
import ApprovalManager from './ApprovalManager'

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: pending } = await supabase.rpc('admin_list_pending')

  return (
    <>
      <TopBar role="admin" />
      <main>
        <div className="container">
          <h1 className="page-title">อนุมัติผู้ใช้ใหม่</h1>
          <p className="page-sub">
            ผู้ที่สมัครเป็นผู้ให้บริการหรือที่ปรึกษา ต้องได้รับการอนุมัติจาก ส.อ.ท. ก่อนเข้าใช้งาน
          </p>
          <ApprovalManager initialPending={pending ?? []} />
        </div>
      </main>
    </>
  )
}
