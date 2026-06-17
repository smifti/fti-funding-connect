import { createClient } from '@/lib/supabase-server'
import { CATEGORY_LABELS, Badge } from '@/components/shared'
import ScreenAction from './ScreenAction'

export default async function ExpertDashboard() {
  const supabase = await createClient()

  const { data: requests } = await supabase
    .from('funding_requests')
    .select('id, category, status, detail, created_at, sme_profiles(company_name, province)')
    .in('status', ['submitted', 'screening'])
    .order('created_at', { ascending: true })

  return (
    <>
      <h1 className="page-title">คัดกรองก่อนส่งต่อ</h1>
      <p className="page-sub">ให้คำแนะนำเบื้องต้น · ประเมินความเหมาะสม · จัดกลุ่ม · ส่งต่อหน่วยงานที่เกี่ยวข้อง</p>

      <div className="card">
        <h2>คำขอรอคัดกรอง ({(requests ?? []).length})</h2>
        {(requests ?? []).length === 0 ? (
          <p className="empty">ไม่มีคำขอรอคัดกรองในขณะนี้</p>
        ) : (
          <table>
            <thead>
              <tr><th>กิจการ</th><th>ด้าน</th><th>รายละเอียด</th><th>สถานะ</th><th>การดำเนินการ</th></tr>
            </thead>
            <tbody>
              {requests!.map((r: any) => (
                <tr key={r.id}>
                  <td>
                    {r.sme_profiles?.company_name}
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.sme_profiles?.province}</div>
                  </td>
                  <td>{CATEGORY_LABELS[r.category]}</td>
                  <td style={{ maxWidth: 240, fontSize: 13 }}>{r.detail || '—'}</td>
                  <td><Badge status={r.status} /></td>
                  <td><ScreenAction requestId={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
