'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import AgencyAction from './AgencyAction'
import AgencyPackages from './AgencyPackages'

const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ', innovation: 'นวัตกรรม', management: 'บริหารจัดการ',
  marketing: 'การตลาด', production: 'การผลิต', upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}
const STATUS_LABELS: Record<string, string> = {
  submitted: 'ยื่นแล้ว', screening: 'กำลังคัดกรอง', forwarded: 'ส่งต่อหน่วยงาน',
  in_review: 'หน่วยงานพิจารณา', approved: 'สำเร็จ', rejected: 'ไม่ผ่าน',
}
function Badge({ status }: { status: string }) {
  return <span className={`badge b-${status}`}>{STATUS_LABELS[status] ?? status}</span>
}

type Profile = {
  id: string
  agency_name: string | null
  agency_categories: string[] | null
  full_name: string | null
  phone: string | null
  agency_email: string | null
  agency_website: string | null
  agency_description: string | null
}

export default function AgencyTabs({
  profile, requests, smeList, packages,
}: {
  profile: Profile
  requests: any[]
  smeList: any[]
  packages: any[]
}) {
  const [tab, setTab] = useState<'overview' | 'packages' | 'profile' | 'sme'>('overview')
  const cats = (profile.agency_categories ?? []) as string[]

  const tabStyle = (active: boolean) => ({
    border: 'none', background: 'none', cursor: 'pointer',
    padding: '10px 4px', fontSize: 15,
    fontWeight: active ? 600 : 400,
    color: active ? '#1e3a8a' : '#64748b',
    borderBottom: active ? '2px solid #1e3a8a' : '2px solid transparent',
  })

  return (
    <>
      <h1 className="page-title">{profile.agency_name ?? 'หน่วยงานสนับสนุน'}</h1>
      <p className="page-sub">
        รับผิดชอบด้าน: {cats.map(c => CATEGORY_LABELS[c]).join(' · ') || '—'}
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => setTab('overview')} style={tabStyle(tab === 'overview')}>
          คำขอที่ส่งต่อมา
        </button>
        <button onClick={() => setTab('packages')} style={tabStyle(tab === 'packages')}>
          แพ็กเกจของฉัน ({packages.length})
        </button>
        <button onClick={() => setTab('sme')} style={tabStyle(tab === 'sme')}>
          รายชื่อ SME ({smeList.length})
        </button>
        <button onClick={() => setTab('profile')} style={tabStyle(tab === 'profile')}>
          โปรไฟล์หน่วยงาน
        </button>
      </div>

      {tab === 'overview' && (
        <div className="card">
          <h2>คำขอที่ส่งต่อมายังหน่วยงาน ({requests.length})</h2>
          {requests.length === 0 ? (
            <p className="empty">ยังไม่มีคำขอที่ส่งต่อมา</p>
          ) : (
            <table>
              <thead>
                <tr><th>กิจการ</th><th>SME ONE ID</th><th>ด้าน</th><th>สถานะ</th><th>การดำเนินการ</th></tr>
              </thead>
              <tbody>
                {requests.map((r: any) => (
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
      )}

      {tab === 'sme' && (
        <div className="card">
          <h2>รายชื่อ SME ที่เกี่ยวข้อง ({smeList.length})</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -4, marginBottom: 12 }}>
            แสดงเฉพาะ SME ที่ยื่นคำขอในด้านที่หน่วยงานของท่านรับผิดชอบ
          </p>
          {smeList.length === 0 ? (
            <p className="empty">ยังไม่มี SME ที่ยื่นคำขอด้านของท่าน</p>
          ) : (
            <table>
              <thead>
                <tr><th>กิจการ</th><th>SME ONE ID</th><th>จังหวัด</th><th>ประเภทธุรกิจ</th></tr>
              </thead>
              <tbody>
                {smeList.map((s: any) => (
                  <tr key={s.id}>
                    <td>{s.company_name ?? '—'}</td>
                    <td>{s.sme_one_id ?? '—'}</td>
                    <td>{s.province ?? '—'}</td>
                    <td>{s.business_type ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

     {tab === 'packages' && (
        <AgencyPackages
          ownerId={profile.id}
          categories={(profile.agency_categories ?? []) as string[]}
          initial={packages}
        />
      )}

      {tab === 'profile' && <AgencyProfileForm profile={profile} />}
    </>
  )
}

function AgencyProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({
    agency_name: profile.agency_name ?? '',
    full_name: profile.full_name ?? '',
    phone: profile.phone ?? '',
    agency_email: profile.agency_email ?? '',
    agency_website: profile.agency_website ?? '',
    agency_description: profile.agency_description ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    setBusy(true); setMsg('')
    const { error } = await supabase
      .from('profiles')
      .update({
        agency_name: form.agency_name || null,
        full_name: form.full_name || null,
        phone: form.phone || null,
        agency_email: form.agency_email || null,
        agency_website: form.agency_website || null,
        agency_description: form.agency_description || null,
      })
      .eq('id', profile.id)
    setBusy(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setMsg('บันทึกเรียบร้อยแล้ว')
    router.refresh()
  }

  const fieldStyle = {
    width: '100%', padding: '8px 10px', fontSize: 14,
    borderRadius: 8, border: '1px solid #cbd5e1', marginTop: 4,
  } as const
  const labelStyle = { fontSize: 13, color: '#475569', fontWeight: 500 } as const

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>ข้อมูลหน่วยงาน</h2>
      {msg && (
        <div style={{ background: msg.startsWith('บันทึก') ? '#dcfce7' : '#fee2e2',
                   color: msg.startsWith('บันทึก') ? '#166534' : '#991b1b',
                   padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
          {msg}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>ชื่อหน่วยงาน / บริษัท</label>
          <input style={fieldStyle} value={form.agency_name} onChange={e => set('agency_name', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>รายละเอียดบริการ</label>
          <textarea style={{ ...fieldStyle, minHeight: 90, resize: 'vertical' }}
            placeholder="อธิบายบริการที่หน่วยงานของท่านให้แก่ SME"
            value={form.agency_description} onChange={e => set('agency_description', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>ชื่อผู้ติดต่อ</label>
            <input style={fieldStyle} value={form.full_name} onChange={e => set('full_name', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>เบอร์โทร</label>
            <input style={fieldStyle} value={form.phone} onChange={e => set('phone', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>อีเมลติดต่อ</label>
            <input style={fieldStyle} value={form.agency_email} onChange={e => set('agency_email', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>เว็บไซต์</label>
            <input style={fieldStyle} value={form.agency_website} onChange={e => set('agency_website', e.target.value)} />
          </div>
        </div>
        <div>
          <button className="btn" disabled={busy} onClick={save}>
            {busy ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
          </button>
        </div>
      </div>
    </div>
  )
}
