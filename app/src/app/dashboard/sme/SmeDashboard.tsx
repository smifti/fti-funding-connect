import { createClient } from '@/lib/supabase-server'
import { CATEGORY_LABELS, Badge } from '@/components/shared'
import NewRequestForm from './NewRequestForm'

export default async function SmeDashboard({ userId }: { userId: string }) {
  const supabase = await createClient()

  const { data: sme } = await supabase
    .from('sme_profiles')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle()

  if (!sme) {
    return (
      <div className="card">
        <h2>ยังไม่พบโปรไฟล์กิจการ</h2>
        <p className="page-sub">โปรดติดต่อผู้ดูแลระบบเพื่อตั้งค่าโปรไฟล์ของท่าน</p>
      </div>
    )
  }

  const { data: requests } = await supabase
    .from('funding_requests')
    .select('id, category, status, detail, created_at, updated_at')
    .eq('sme_id', sme.id)
    .order('created_at', { ascending: false })

  const { data: health } = await supabase
    .from('health_checks')
    .select('*')
    .eq('sme_id', sme.id)
    .order('created_at', { ascending: false })
    .maybeSingle()

  const usedCategories = (requests ?? []).map(r => r.category)

  return (
    <>
      <h1 className="page-title">{sme.company_name}</h1>
      <p className="page-sub">
        {sme.sme_one_id ? `SME ONE ID: ${sme.sme_one_id} · ` : ''}{sme.province ?? '—'}
      </p>

      <div className="grid grid-2">
        <div className="card">
          <h2>คำขอรับการสนับสนุน</h2>
          {(requests ?? []).length === 0 ? (
            <p className="empty">ยังไม่มีคำขอ — เริ่มยื่นคำขอด้านที่ต้องการได้เลย</p>
          ) : (
            <table>
              <thead>
                <tr><th>ด้าน</th><th>สถานะ</th><th>อัปเดตล่าสุด</th></tr>
              </thead>
              <tbody>
                {requests!.map(r => (
                  <tr key={r.id}>
                    <td>{CATEGORY_LABELS[r.category]}</td>
                    <td><Badge status={r.status} /></td>
                    <td>{new Date(r.updated_at).toLocaleDateString('th-TH')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2>ผลตรวจสุขภาพธุรกิจ (Health Check)</h2>
          {health ? (
            <HealthView h={health} />
          ) : (
            <p className="empty">ยังไม่ได้ทำแบบประเมิน 5 ด้าน</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2>ยื่นคำขอใหม่</h2>
        <NewRequestForm smeId={sme.id} usedCategories={usedCategories} />
      </div>
    </>
  )
}

function HealthView({ h }: { h: any }) {
  const rows = [
    ['การเงิน', h.score_finance],
    ['การตลาด', h.score_marketing],
    ['การดำเนินงาน', h.score_operations],
    ['บุคลากร', h.score_hr],
    ['นวัตกรรม', h.score_innovation],
  ]
  return (
    <div>
      {rows.map(([label, val]) => (
        <div key={label as string} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span>{label}</span><span>{val ?? 0}</span>
          </div>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${val ?? 0}%` }} /></div>
        </div>
      ))}
      {h.recommendation && (
        <p style={{ marginTop: 14, fontSize: 14, color: 'var(--muted)' }}>
          <strong>คำแนะนำ:</strong> {h.recommendation}
        </p>
      )}
    </div>
  )
}
