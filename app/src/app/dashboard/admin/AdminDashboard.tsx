import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { CATEGORY_LABELS, STATUS_LABELS, Badge } from '@/components/shared'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: all } = await supabase
    .from('funding_requests')
    .select('id, category, status, created_at, sme_profiles(company_name)')
    .order('created_at', { ascending: false })

  const reqs = all ?? []
  const total = reqs.length
  const approved = reqs.filter((r: any) => r.status === 'approved').length
  const pending = reqs.filter((r: any) => !['approved', 'rejected'].includes(r.status)).length

  const byCat: Record<string, number> = {}
  reqs.forEach((r: any) => { byCat[r.category] = (byCat[r.category] ?? 0) + 1 })

  return (
    <>
      <h1 className="page-title">Dashboard ภาพรวม — ส.อ.ท. / FTI</h1>
      <p className="page-sub">ติดตามผลแบบ Real-time · Zero Waste of Budget</p>

      <div style={{ marginBottom: 18 }}>
        <Link href="/dashboard/manage-users" className="btn btn-sm" style={{ display: 'inline-block', textDecoration: 'none' }}>
          จัดการผู้ใช้และสิทธิ์
        </Link>
      </div>

      <div className="grid grid-3">
        <div className="stat"><div className="n">{total}</div><div className="l">คำขอทั้งหมด</div></div>
        <div className="stat"><div className="n">{pending}</div><div className="l">อยู่ระหว่างดำเนินการ</div></div>
        <div className="stat"><div className="n">{approved}</div><div className="l">สำเร็จ / อนุมัติ</div></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h2>คำขอแยกตามด้าน</h2>
          <table>
            <tbody>
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <tr key={k}>
                  <td>{label}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{byCat[k] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>สถานะรวม</h2>
          <table>
            <tbody>
              {Object.entries(STATUS_LABELS).map(([k, label]) => (
                <tr key={k}>
                  <td><Badge status={k} /></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    {reqs.filter((r: any) => r.status === k).length}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>คำขอล่าสุด</h2>
        <table>
          <thead><tr><th>กิจการ</th><th>ด้าน</th><th>สถานะ</th><th>วันที่</th></tr></thead>
          <tbody>
            {reqs.slice(0, 15).map((r: any) => (
              <tr key={r.id}>
                <td>{r.sme_profiles?.company_name}</td>
                <td>{CATEGORY_LABELS[r.category]}</td>
                <td><Badge status={r.status} /></td>
                <td>{new Date(r.created_at).toLocaleDateString('th-TH')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
