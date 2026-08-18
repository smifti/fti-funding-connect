import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ',
  innovation: 'นวัตกรรม',
  management: 'บริหารจัดการ',
  marketing: 'การตลาด',
  production: 'การผลิต',
  upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}
export const STATUS_LABELS: Record<string, string> = {
  submitted: 'ยื่นแล้ว',
  screening: 'กำลังคัดกรอง',
  forwarded: 'ส่งต่อหน่วยงาน',
  in_review: 'หน่วยงานพิจารณา',
  approved: 'สำเร็จ',
  rejected: 'ไม่ผ่าน',
}
export const ROLE_LABELS: Record<string, string> = {
  sme: 'ผู้ประกอบการ SME',
  agency: 'ผู้ให้บริการ',
  expert: 'ที่ปรึกษา / ผู้เชี่ยวชาญ',
  admin: 'ส.อ.ท. / ผู้ดูแลระบบ',
}

export function Badge({ status }: { status: string }) {
  return <span className={`badge b-${status}`}>{STATUS_LABELS[status] ?? status}</span>
}

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// นับจำนวนแพ็กเกจที่รออนุมัติ (สำหรับ admin/expert)
async function getPendingCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('packages')
    .select('id', { count: 'exact', head: true })
    .eq('approval_status', 'pending')
  return count ?? 0
}

export async function TopBar({ role }: { role: string }) {
  const isReviewer = role === 'admin' || role === 'expert'
  const pendingCount = isReviewer ? await getPendingCount() : 0

  return (
    <div className="topbar">
      <div className="container">
        <div className="brand">
          FTI SME Funding Connect
          <span className="role-pill">{ROLE_LABELS[role] ?? role}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {role === 'admin' && (
            <>
              <a href="/dashboard/manage-users" className="btn btn-ghost btn-sm"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>
                👥 ผู้ใช้งานทั้งหมด
              </a>
              <a href="/dashboard/approvals" className="btn btn-ghost btn-sm"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>
                🏦 ผู้ให้บริการ/ที่ปรึกษา
              </a>
              <a href="/dashboard/manage-agencies" className="btn btn-ghost btn-sm"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>
                🏢 จัดการหน่วยงาน
              </a>
            </>
          )}
          {isReviewer && (
            <>
              <a href="/dashboard/package-approvals" className="btn btn-ghost btn-sm"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)', position: 'relative' }}>
                📦 บริการ
                {pendingCount > 0 && (
                  <span style={{
                    background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700,
                    borderRadius: 10, padding: '1px 7px', marginLeft: 6,
                  }}>
                    {pendingCount}
                  </span>
                )}
              </a>
              <a href="/dashboard/applications" className="btn btn-ghost btn-sm"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>
                🔍 ติดตามกิจกรรม
              </a>
            </>
          )}
          {role === 'admin' && (
            <a href="/dashboard/system-settings" className="btn btn-ghost btn-sm"
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>
              ⚙️ ตั้งค่าระบบ
            </a>
          )}
          <form action={signOut}>
            <button className="btn btn-ghost btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>
              ➡️ ออกจากระบบ
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
