import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/shared'
import DsarManager from './DsarManager'

export default async function DsarRequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = profile?.role ?? 'sme'
  if (role !== 'admin') redirect('/dashboard')

  // ใช้ RPC เพื่อดึงคำขอทั้งหมดพร้อมชื่อ/อีเมลผู้ยื่น (join กับ auth.users)
  const { data: requests } = await supabase.rpc('admin_list_dsar_requests')

  return (
    <>
      <TopBar role={role} />
      <main>
        <div className="container">
          <h1 style={{ fontSize: 22, margin: '20px 0 4px', color: '#1e3a8a' }}>คำขอใช้สิทธิเจ้าของข้อมูล (DSAR)</h1>
          <p style={{ color: '#64748b', marginBottom: 20 }}>
            คำขอตามสิทธิ PDPA ที่ผู้ใช้งานยื่นเข้ามา (เข้าถึง แก้ไข ลบ ระงับ คัดค้าน โอนย้าย ถอนความยินยอม)
          </p>
          <DsarManager initial={requests ?? []} />
        </div>
      </main>
    </>
  )
}
