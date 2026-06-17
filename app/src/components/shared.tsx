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
  agency: 'หน่วยงานสนับสนุน',
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

export function TopBar({ role }: { role: string }) {
  return (
    <div className="topbar">
      <div className="container">
        <div className="brand">
          FTI SME Funding Connect
          <span className="role-pill">{ROLE_LABELS[role] ?? role}</span>
        </div>
        <form action={signOut}>
          <button className="btn btn-ghost btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>
            ออกจากระบบ
          </button>
        </form>
      </div>
    </div>
  )
}
