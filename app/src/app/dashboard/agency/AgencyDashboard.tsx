import { createClient } from '@/lib/supabase-server'
import { CATEGORY_LABELS, Badge } from '@/components/shared'
import AgencyAction from './AgencyAction'

export default async function AgencyDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_name, agency_categories')
    .eq('id', userId)
    .single()

  // RLS อนุญาตให้เห็นเฉพาะ category ที่ตรงกับ agency_categories อยู่แล้ว
  const { data: requests } = await supabase
    .from('funding_requests')
    .select('id, category, status, detail, created_at, sme_profiles(company_name, province, sme_one_id)')
    .eq('status', 'forwarded')
    .order('created_at', { ascending: true })

  const cats = (profile?.agency_categories ?? []) as string[]

  return (
    <>
      <h1 className="page-title">{profile?.agency_name ?? 'หน่วยงานสนับสนุน'}</h1>
      <p className="page-sub">
        รับผิดชอบด้าน: {cats.map(c => CATEGORY_LABELS[c]).join(' · ') || '—'}
        {'  '}· เห็นเฉพาะ SME ที่เลือกด้านของท่าน
      </p>

      <div className="card">
        <h2>คำขอที่ส่งต่อมายังหน่วยงาน ({(requests ?? []).length})</h2>
        {(requests ?? []).length === 0 ? (
          <p className="empty">ยังไม่มีคำขอที่ส่งต่อมา</p>
        ) : (
          <table>
            <thead>
              <tr><th>กิจการ</th><th>SME ONE ID</th><th>ด้าน</th><th>สถานะ</th><th>การดำเนินการ</th></tr>
            </thead>
            <tbody>
              {requests!.map((r: any) => (
                <tr key={r.id}>
                  <td>{r.sme_profiles?.company_name}
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.sme_profiles?.province}</div>
                  </td>
                  <td>{r.sme_profiles?.sme_one_id ?? '—'}</td>
                  <td>{CATEGORY_LABELS[r.category]}</td>
                  <td><Badge status={r.status} /></td>
                  <td><AgencyAction requestId={r.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
