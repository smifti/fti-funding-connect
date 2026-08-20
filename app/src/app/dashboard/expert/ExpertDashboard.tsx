import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import ExpertScreenAction from './ExpertScreenAction'

type StepState = { state: string; note?: string }
type App = {
  id: string
  status: string
  steps: Record<string, StepState>
  created_at: string
  packages: { title: string; category: string } | null
  sme_profiles: { company_name: string; province: string } | null
}

const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ', innovation: 'นวัตกรรม', management: 'บริหารจัดการ',
  marketing: 'การตลาด', production: 'การผลิต', upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}

export default async function ExpertDashboard() {
  const supabase = await createClient()

  // ที่ปรึกษา (expert) มีสิทธิ์แค่จุดที่ 1 (ยื่นสมัคร) และจุดที่ 2 (พิจารณาคุณสมบัติ) เท่านั้น
  // ตรงกับสิทธิ์ที่บังคับไว้แล้วใน RPC set_application_step_status ฝั่ง database
  const { data } = await supabase
    .from('package_applications')
    .select(`
      id, status, steps, created_at,
      packages(title, category),
      sme_profiles(company_name, province)
    `)
    .order('created_at', { ascending: true })

  const apps = (data ?? []) as unknown as App[]

  // จุดที่ 1 ยังไม่ตัดสิน (ไม่มี key หรือยัง pending อยู่)
  const needStep1 = apps.filter(a => {
    const st = a.steps?.submitted?.state
    return !st || st === 'pending'
  })
  // จุดที่ 1 ผ่านแล้ว แต่จุดที่ 2 ยังไม่ตัดสิน
  const needStep2 = apps.filter(a => {
    const st1 = a.steps?.submitted?.state
    const st2 = a.steps?.screening?.state
    return st1 === 'passed' && (!st2 || st2 === 'pending')
  })

  const queue = [
    ...needStep1.map(a => ({ app: a, stepKey: 'submitted' as const, stepLabel: 'ยื่นสมัคร' })),
    ...needStep2.map(a => ({ app: a, stepKey: 'screening' as const, stepLabel: 'พิจารณาคุณสมบัติ' })),
  ]

  return (
    <>
      <h1 className="page-title">คัดกรองก่อนส่งต่อ</h1>
      <p className="page-sub">ตรวจสอบใบสมัคร ประเมินคุณสมบัติเบื้องต้น ก่อนส่งต่อให้หน่วยงาน</p>

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="n">{needStep1.length}</div><div className="l">รอตรวจสอบ — ยื่นสมัคร</div></div>
        <div className="stat"><div className="n">{needStep2.length}</div><div className="l">รอตรวจสอบ — พิจารณาคุณสมบัติ</div></div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>คำขอรอคัดกรอง ({queue.length})</h2>
          <Link href="/dashboard/applications" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
            🔍 ดูรายการทั้งหมด / ติดตามสถานะ
          </Link>
        </div>
        {queue.length === 0 ? (
          <p className="empty">ไม่มีคำขอรอคัดกรองในขณะนี้</p>
        ) : (
          <table>
            <thead>
              <tr><th>กิจการ</th><th>บริการ</th><th>ด้าน</th><th>ขั้นตอน</th><th>ยื่นเมื่อ</th><th>การดำเนินการ</th></tr>
            </thead>
            <tbody>
              {queue.map(({ app, stepKey, stepLabel }) => (
                <tr key={`${app.id}-${stepKey}`}>
                  <td>
                    {app.sme_profiles?.company_name ?? '—'}
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{app.sme_profiles?.province}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{app.packages?.title ?? '—'}</td>
                  <td style={{ fontSize: 13 }}>{CATEGORY_LABELS[app.packages?.category ?? ''] ?? app.packages?.category ?? '—'}</td>
                  <td>
                    <span style={{ background: '#fef9c3', color: '#a16207', fontSize: 12,
                      padding: '2px 10px', borderRadius: 10, fontWeight: 600 }}>
                      {stepLabel}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {new Date(app.created_at).toLocaleDateString('th-TH')}
                  </td>
                  <td><ExpertScreenAction appId={app.id} stepKey={stepKey} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
