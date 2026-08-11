'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
const ROLE_OPTIONS: [string, string][] = [
  ['sme', 'ผู้ประกอบการ SME'],
  ['agency', 'ผู้ให้บริการ'],
  ['expert', 'ที่ปรึกษา / ผู้เชี่ยวชาญ'],
  ['admin', 'ผู้ดูแลระบบ (ส.อ.ท.)'],
]
const CATEGORY_OPTIONS: [string, string][] = [
  ['credit', 'สินเชื่อ'],
  ['innovation', 'นวัตกรรม'],
  ['management', 'บริหารจัดการ'],
  ['marketing', 'การตลาด'],
  ['production', 'การผลิต'],
  ['upskill', 'Upskill / Reskill'],
  ['other', 'อื่น ๆ (ESG)'],
]
type User = {
  id: string
  email: string
  full_name: string | null
  role: string
  agency_name: string | null
  agency_categories: string[] | null
  approval_status: string | null
  requested_role: string | null
  phone: string | null
  agency_email: string | null
  agency_website: string | null
  agency_description: string | null
  agency_logo: string | null
  created_at: string | null
}
const roleLabel = (r: string) => ROLE_OPTIONS.find(([v]) => v === r)?.[1] ?? r
const catLabel = (c: string) => CATEGORY_OPTIONS.find(([v]) => v === c)?.[1] ?? c

export default function UserManager({
  initialUsers, myId,
}: { initialUsers: User[]; myId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'all' | 'sme' | 'agency' | 'expert' | 'admin'>('all')
  const [editing, setEditing] = useState<string | null>(null)
  const [role, setRole] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [cats, setCats] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<User | null>(null)

  function startEdit(u: User) {
    setEditing(u.id)
    setRole(u.role)
    setAgencyName(u.agency_name ?? '')
    setCats(u.agency_categories ?? [])
    setMsg('')
  }
  function toggleCat(c: string) {
    setCats(cats.includes(c) ? cats.filter(x => x !== c) : [...cats, c])
  }
  async function save(userId: string) {
    setSaving(true); setMsg('')
    const { error } = await supabase.rpc('admin_update_role', {
      target_user_id: userId,
      new_role: role,
      new_agency_name: role === 'agency' ? agencyName : null,
      new_agency_categories: role === 'agency' ? cats : null,
    })
    setSaving(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setEditing(null)
    router.refresh()
  }
  const countByRole = (r: string) => initialUsers.filter(u => u.role === r).length
  let shown = initialUsers
  if (tab === 'sme') shown = initialUsers.filter(u => u.role === 'sme')
  else if (tab === 'agency') shown = initialUsers.filter(u => u.role === 'agency')
  else if (tab === 'expert') shown = initialUsers.filter(u => u.role === 'expert')
  else if (tab === 'admin') shown = initialUsers.filter(u => u.role === 'admin')
  const tabStyle = (active: boolean) => ({
    border: 'none', background: 'none', cursor: 'pointer',
    padding: '10px 6px', fontSize: 14, whiteSpace: 'nowrap' as const,
    fontWeight: active ? 600 : 400,
    color: active ? '#1e3a8a' : '#64748b',
    borderBottom: active ? '2px solid #1e3a8a' : '2px solid transparent',
  })
  return (
    <div>
      {msg && <div className="alert alert-err" style={{ marginBottom: 12 }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <button onClick={() => setTab('all')} style={tabStyle(tab === 'all')}>
          ทั้งหมด ({initialUsers.length})
        </button>
        <button onClick={() => setTab('sme')} style={tabStyle(tab === 'sme')}>
          SME ({countByRole('sme')})
        </button>
        <button onClick={() => setTab('agency')} style={tabStyle(tab === 'agency')}>
          ผู้ให้บริการ ({countByRole('agency')})
        </button>
        <button onClick={() => setTab('expert')} style={tabStyle(tab === 'expert')}>
          ที่ปรึกษา/ผู้เชี่ยวชาญ ({countByRole('expert')})
        </button>
        <button onClick={() => setTab('admin')} style={tabStyle(tab === 'admin')}>
          ผู้ดูแล ({countByRole('admin')})
        </button>
      </div>
      <div className="card">
        {shown.length === 0 ? (
          <p className="empty">ไม่มีผู้ใช้ในกลุ่มนี้</p>
        ) : (
          <table>
            <thead>
              <tr><th>ชื่อ / อีเมล</th><th>บทบาทปัจจุบัน</th><th>การจัดการ</th></tr>
            </thead>
            <tbody>
              {shown.map((u, i) => {
                const rowBg = i % 2 === 1 ? '#e8eef5' : '#ffffff'
                return (
                <tr key={u.id}>
                  <td style={{ background: rowBg }}>
                    <button onClick={() => setDetail(u)}
                      style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer',
                        textAlign: 'left', color: '#1e3a8a', fontWeight: 600, fontSize: 'inherit' }}>
                      {u.full_name || '—'}
                    </button>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
                  </td>
                  <td style={{ background: rowBg }}>
                    {roleLabel(u.role)}
                    {u.approval_status === 'pending' && (
                      <span style={{ marginLeft: 6, background: '#fef9c3', color: '#a16207', fontSize: 11,
                        padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>รออนุมัติ</span>
                    )}
                    {u.role === 'agency' && u.agency_categories && u.agency_categories.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {u.agency_name} · {u.agency_categories.map(c => catLabel(c)).join(', ')}
                      </div>
                    )}
                  </td>
                  <td style={{ background: rowBg }}>
                    {editing === u.id ? (
                      <div style={{ minWidth: 280 }}>
                        <select value={role} onChange={e => setRole(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 8 }}>
                          {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        {role === 'agency' && (
                          <>
                            <input value={agencyName} onChange={e => setAgencyName(e.target.value)}
                              placeholder="ชื่อหน่วยงาน เช่น SME D Bank"
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, marginBottom: 8 }} />
                            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>เลือกด้านที่รับผิดชอบ:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                              {CATEGORY_OPTIONS.map(([v, l]) => (
                                <button key={v} type="button"
                                  className={`cat-chip ${cats.includes(v) ? 'active' : ''}`}
                                  onClick={() => toggleCat(v)}>{l}</button>
                              ))}
                            </div>
                          </>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm" disabled={saving} onClick={() => save(u.id)}>
                            {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>ยกเลิก</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDetail(u)}>ดูรายละเอียด</button>
                        {u.id === myId ? (
                          <span style={{ fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>บัญชีของคุณ</span>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(u)}>เปลี่ยนสิทธิ์</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {detail && <UserDetailModal user={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

// ---------- Modal ----------
function UserDetailModal({ user, onClose }: { user: User; onClose: () => void }) {
  const supabase = createClient()
  const isAgency = user.role === 'agency'
  const isSme = user.role === 'sme'
  const [smeTab, setSmeTab] = useState<'business' | 'product' | 'funding' | 'contact'>('business')
  const [sme, setSme] = useState<any>(null)
  const [loadingSme, setLoadingSme] = useState(false)

  useEffect(() => {
    if (!isSme) return
    setLoadingSme(true)
    supabase.rpc('admin_get_sme_profile', { target_owner_id: user.id })
      .then(({ data }) => {
        setSme(Array.isArray(data) ? data[0] ?? null : data)
        setLoadingSme(false)
      })
  }, [isSme, user.id])

  const row = (label: string, value: any) => (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ width: 150, flexShrink: 0, fontSize: 13, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 14, color: '#1f2937', wordBreak: 'break-word' }}>{value || '—'}</div>
    </div>
  )

  const smeTabStyle = (active: boolean) => ({
    border: 'none', background: 'none', cursor: 'pointer',
    padding: '8px 4px', fontSize: 13, whiteSpace: 'nowrap' as const,
    fontWeight: active ? 600 : 400,
    color: active ? '#1e3a8a' : '#64748b',
    borderBottom: active ? '2px solid #1e3a8a' : '2px solid transparent',
  })

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, maxWidth: 600, width: '100%',
          marginTop: 40, boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ background: '#1e3a8a', color: '#fff', padding: '16px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{user.full_name || 'ไม่มีชื่อ'}</div>
            <div style={{ fontSize: 13, opacity: .85 }}>{roleLabel(user.role)}</div>
          </div>
          <button onClick={onClose}
            style={{ border: 'none', background: 'rgba(255,255,255,.2)', color: '#fff',
              width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        {/* body */}
        <div style={{ padding: '16px 20px' }}>
          {isAgency && user.agency_logo && (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <img src={user.agency_logo} alt="logo"
                style={{ maxWidth: 120, maxHeight: 120, objectFit: 'contain', borderRadius: 10, border: '1px solid #e2e8f0' }} />
            </div>
          )}

          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>ข้อมูลบัญชี</div>
          {row('อีเมล', user.email)}
          {row('บทบาท', roleLabel(user.role))}
          {row('สถานะ', user.approval_status === 'pending'
            ? 'รออนุมัติ'
            : (isSme ? 'ใช้งานทั่วไป' : 'อนุมัติแล้ว'))}
          {user.requested_role && user.approval_status === 'pending' &&
            row('สมัครขอเป็น', roleLabel(user.requested_role))}
          {user.phone && row('เบอร์โทร', user.phone)}
          {user.created_at && row('สมัครเมื่อ', new Date(user.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }))}

          {/* ผู้ให้บริการ */}
          {isAgency && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', margin: '16px 0 4px' }}>ข้อมูลผู้ให้บริการ</div>
              {row('ชื่อหน่วยงาน', user.agency_name)}
              {row('ด้านที่รับผิดชอบ', user.agency_categories && user.agency_categories.length > 0
                ? user.agency_categories.map(c => catLabel(c)).join(', ') : null)}
              {row('อีเมลติดต่อ', user.agency_email)}
              {row('เว็บไซต์', user.agency_website)}
              {row('รายละเอียดบริการ', user.agency_description)}
            </>
          )}

          {/* SME — 4 แท็บ */}
          {isSme && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', margin: '16px 0 8px' }}>ข้อมูลกิจการ</div>
              {loadingSme ? (
                <p style={{ fontSize: 14, color: '#64748b', padding: '12px 0' }}>กำลังโหลดข้อมูล…</p>
              ) : !sme ? (
                <p style={{ fontSize: 14, color: '#64748b', padding: '12px 0' }}>ยังไม่มีข้อมูลกิจการ</p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 14, borderBottom: '1px solid #e2e8f0', marginBottom: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => setSmeTab('business')} style={smeTabStyle(smeTab === 'business')}>ข้อมูลกิจการ</button>
                    <button onClick={() => setSmeTab('product')} style={smeTabStyle(smeTab === 'product')}>สินค้า/การตลาด</button>
                    <button onClick={() => setSmeTab('funding')} style={smeTabStyle(smeTab === 'funding')}>ประวัติทุน</button>
                    <button onClick={() => setSmeTab('contact')} style={smeTabStyle(smeTab === 'contact')}>ผู้ติดต่อ</button>
                  </div>

                  {smeTab === 'business' && (
                    <>
                      {row('ชื่อกิจการ', sme.company_name)}
                      {row('เลขนิติบุคคล', sme.sme_one_id)}
                      {row('เลขผู้เสียภาษี', sme.tax_id)}
                      {row('ประเภทธุรกิจ', sme.business_type)}
                      {row('จังหวัด', sme.province)}
                      {row('ที่อยู่', sme.address)}
                      {row('รหัสไปรษณีย์', sme.postal_code)}
                      {row('ปีที่ก่อตั้ง', sme.year_started)}
                      {row('จำนวนพนักงาน', sme.employee_count)}
                      {row('เลขสมาชิก ส.อ.ท.', sme.fti_member_id)}
                      {row('กลุ่มอุตสาหกรรม', sme.industry_group)}
                      {row('ชื่อเจ้าของ', sme.owner_name)}
                    </>
                  )}
                  {smeTab === 'product' && (
                    <>
                      {row('สินค้า/บริการหลัก', sme.main_product)}
                      {row('แบรนด์', sme.brand)}
                      {row('ช่องทางขาย', sme.sales_channel)}
                      {row('เว็บไซต์', sme.website)}
                      {row('โซเชียลมีเดีย', sme.social_media)}
                      {row('มาตรฐานสินค้า', sme.product_standard)}
                      {row('รางวัล', sme.awards)}
                      {row('ประวัติส่งออก', sme.export_history)}
                      {row('ประเทศที่ส่งออก', sme.export_countries)}
                    </>
                  )}
                  {smeTab === 'funding' && (
                    <>
                      {row('ประวัติการรับทุน', sme.funding_history)}
                      {row('หน่วยงานที่เคยได้รับ', sme.funding_agency)}
                      {row('วงเงินที่เคยได้รับ', sme.funding_amount)}
                      {row('บริการที่สนใจ', Array.isArray(sme.services_wanted) && sme.services_wanted.length > 0
                        ? sme.services_wanted.map((c: string) => catLabel(c)).join(', ') : null)}
                    </>
                  )}
                  {smeTab === 'contact' && (
                    <>
                      {row('ชื่อผู้ประสานงาน', sme.coordinator_name)}
                      {row('ตำแหน่ง', sme.coordinator_position)}
                      {row('เบอร์โทร', sme.coordinator_phone)}
                      {row('อีเมล', sme.coordinator_email)}
                      {row('LINE', sme.coordinator_line)}
                      {row('ความสัมพันธ์กับกิจการ', sme.coordinator_relation)}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
        {/* footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>ปิด</button>
        </div>
      </div>
    </div>
  )
}
