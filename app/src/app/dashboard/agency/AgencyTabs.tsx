'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import AgencyAction from './AgencyAction'
import AgencyPackages from './AgencyPackages'
import AgencyApplicants from './AgencyApplicants'
import AgencyOverview from './AgencyOverview'
import ChangePassword from '@/components/ChangePassword'
import { SlaConfig } from '@/lib/sla'

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
  agency_logo: string | null
}

// ข้อมูลหน่วยงานที่ใช้ร่วมกันทุก user ในหน่วยงานเดียวกัน (ตาราง agencies)
type Agency = {
  id: string
  name: string
  logo: string | null
  description: string | null
  website: string | null
  email: string | null
  contact_name: string | null
  contact_phone: string | null
}

export default function AgencyTabs({
  profile, requests, smeList, packages, applicants, currentUser, applicantCounts,
  slaConfig, holidays,
}: {
  profile: Profile
  requests: any[]
  smeList: any[]
  packages: any[]
  applicants: any[]
  currentUser: { id: string; name: string; role: string }
  applicantCounts: Record<string, number>
  slaConfig: SlaConfig
  holidays: string[]
}) {
  const supabase = createClient()
  const [tab, setTab] = useState<'overview' | 'packages' | 'profile' | 'sme' | 'settings'>('overview')
  const [filterPkg, setFilterPkg] = useState<string | null>(null)
  const [filterPkgTitle, setFilterPkgTitle] = useState<string | null>(null)
  const cats = (profile.agency_categories ?? []) as string[]

  // ข้อมูลหน่วยงาน (ชุดเดียวกันทุก user ในหน่วยงาน) — undefined = กำลังโหลด, null = ยังไม่ได้จัดกลุ่ม
  const [agency, setAgency] = useState<Agency | null | undefined>(undefined)

  // อีเมลของ user ที่ login อยู่ตอนนี้ (แสดงคู่กับชื่อ เหนือปุ่มตั้งค่า)
  const [myEmail, setMyEmail] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadAgency() {
      const { data, error } = await supabase.rpc('get_my_agency')
      if (cancelled) return
      if (error || !data || data.length === 0) { setAgency(null); return }
      setAgency(data[0])
    }
    async function loadEmail() {
      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      setMyEmail(data.user?.email ?? '')
    }
    loadAgency()
    loadEmail()
    return () => { cancelled = true }
  }, [])

  const tabStyle = (active: boolean) => ({
    border: 'none', background: 'none', cursor: 'pointer',
    padding: '10px 4px', fontSize: 15,
    fontWeight: active ? 600 : 400,
    color: active ? '#1e3a8a' : '#64748b',
    borderBottom: active ? '2px solid #1e3a8a' : '2px solid transparent',
  })

  // ไม่ fallback ไปใช้ profile.agency_name (ข้อความดิบที่พิมพ์ตอนสมัคร ยังไม่ผ่าน admin อนุมัติ)
  // เพื่อไม่ให้ดูเหมือนมีหน่วยงานแล้วทั้งที่จริงยังไม่ได้ถูกจัดกลุ่ม
  const displayName = agency?.name || 'หน่วยงานสนับสนุน'

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{currentUser.name || '—'}</div>
          <div>{myEmail}</div>
        </div>
      </div>

      <h1 className="page-title">{displayName}</h1>
      <p className="page-sub">
        รับผิดชอบด้าน: {cats.map(c => CATEGORY_LABELS[c]).join(' · ') || '—'}
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
        <button onClick={() => setTab('overview')} style={tabStyle(tab === 'overview')}>
          ภาพรวม
        </button>
        <button onClick={() => setTab('packages')} style={tabStyle(tab === 'packages')}>
          ข้อเสนอ/บริการของฉัน ({packages.length})
        </button>
        <button onClick={() => { setFilterPkg(null); setFilterPkgTitle(null); setTab('sme') }} style={tabStyle(tab === 'sme')}>
          ผู้รับบริการ/ผลิตภัณฑ์/โครงการ ({applicants.length})
        </button>
        <button onClick={() => setTab('profile')} style={tabStyle(tab === 'profile')}>
          ข้อมูลหน่วยงาน
        </button>
        <button onClick={() => setTab('settings')}
          style={{ ...tabStyle(tab === 'settings'), marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>⚙️</span> ตั้งค่า
        </button>
      </div>

      {tab === 'overview' && (
        <AgencyOverview
          applicants={applicants}
          packages={packages}
          applicantCounts={applicantCounts}
          onGoApplicants={(pkgId?: string, pkgTitle?: string) => { setFilterPkg(pkgId ?? null); setFilterPkgTitle(pkgTitle ?? null); setTab('sme') }}
          onGoPackages={() => setTab('packages')}
        />
      )}

      {tab === 'sme' && (
        <AgencyApplicants initial={applicants} currentUser={currentUser}
          filterPackageId={filterPkg} filterPackageTitle={filterPkgTitle}
          onClearFilter={() => { setFilterPkg(null); setFilterPkgTitle(null) }}
          allPackages={packages.map((p: any) => ({ id: p.id, title: p.title }))}
          slaConfig={slaConfig} holidays={holidays} />
      )}

      {tab === 'packages' && (
        <AgencyPackages
          ownerId={profile.id}
          categories={(profile.agency_categories ?? []) as string[]}
          initial={packages}
          applicantCounts={applicantCounts}
        />
      )}

      {tab === 'profile' && (
        <AgencyProfileForm agency={agency} onSaved={updated => setAgency(updated)} />
      )}
      {tab === 'settings' && <ChangePassword />}
    </>
  )
}

function AgencyProfileForm({
  agency, onSaved,
}: {
  agency: Agency | null | undefined
  onSaved: (updated: Agency) => void
}) {
  const supabase = createClient()

  // ยังโหลดอยู่
  if (agency === undefined) {
    return (
      <div className="card" style={{ maxWidth: 640 }}>
        <p className="empty">กำลังโหลดข้อมูลหน่วยงาน…</p>
      </div>
    )
  }

  // ยังไม่ได้จัดกลุ่มเข้าหน่วยงาน
  if (agency === null) {
    return <NotGroupedPanel supabase={supabase} />
  }

  return <AgencyProfileFormReady agency={agency} onSaved={onSaved} supabase={supabase} />
}
function NotGroupedPanel({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [requested, setRequested] = useState<{ id: string | null; name: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    supabase.rpc('list_agencies_for_signup').then(({ data }: any) => setAgencies(data ?? []))
    supabase.rpc('get_my_join_request').then(({ data }: any) => {
      if (data && data.length > 0 && data[0].requested_agency_id) {
        setRequested({ id: data[0].requested_agency_id, name: data[0].requested_agency_name })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submit() {
    if (!selectedId) { setMsg('กรุณาเลือกหน่วยงาน'); return }
    setBusy(true); setMsg('')
    const { error } = await supabase.rpc('agency_request_join', { p_agency_id: selectedId })
    setBusy(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    const found = agencies.find(a => a.id === selectedId)
    setRequested({ id: selectedId, name: found?.name ?? null })
  }

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>ข้อมูลหน่วยงาน</h2>
      <div style={{
        background: '#fef9c3', color: '#a16207', padding: '12px 16px',
        borderRadius: 10, fontSize: 14, lineHeight: 1.6, marginBottom: 16,
      }}>
        บัญชีของท่านยังไม่ได้จัดกลุ่มเข้าหน่วยงาน
      </div>

      {requested?.id ? (
        <div style={{ background: '#dbeafe', color: '#1e40af', padding: '12px 16px', borderRadius: 10, fontSize: 14 }}>
          ✓ ส่งคำขอเข้าร่วม <strong>{requested.name}</strong> แล้ว — รอผู้ดูแลระบบอนุมัติ
        </div>
      ) : (
        <>
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>
            เลือกหน่วยงานที่ท่านสังกัด แล้วส่งคำขอให้ผู้ดูแลระบบอนุมัติเข้าร่วม
          </p>
          {msg && <div className="alert alert-err" style={{ marginBottom: 10 }}>{msg}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
              style={{ flex: 1, minWidth: 200, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)' }}>
              <option value="">— เลือกหน่วยงาน —</option>
              {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button className="btn btn-sm" disabled={busy} onClick={submit}>
              {busy ? 'กำลังส่ง…' : 'ส่งคำขอเข้าร่วม'}
            </button>
          </div>
          {agencies.length === 0 && (
            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
              ยังไม่มีหน่วยงานในระบบให้เลือก — กรุณาติดต่อผู้ดูแลระบบเพื่อสร้างหน่วยงานใหม่
            </p>
          )}
        </>
      )}
    </div>
  )
}
 
function AgencyProfileFormReady({
  agency, onSaved, supabase,
}: {
  agency: Agency
  onSaved: (updated: Agency) => void
  supabase: ReturnType<typeof createClient>
}) {
  const [form, setForm] = useState({
    name: agency.name ?? '',
    contact_name: agency.contact_name ?? '',
    contact_phone: agency.contact_phone ?? '',
    email: agency.email ?? '',
    website: agency.website ?? '',
    description: agency.description ?? '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(agency.logo ?? null)
  const [dragOver, setDragOver] = useState(false)
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function onPickLogo(file: File | null) {
    setLogoFile(file)
    if (file) setLogoPreview(URL.createObjectURL(file))
  }

  async function save() {
    setBusy(true); setMsg('')
    let logoUrl: string = agency.logo ?? ''
    if (logoFile) {
      setUploadPct(0)
      const timer = setInterval(() => {
        setUploadPct(p => (p === null ? 10 : Math.min(p + 15, 90)))
      }, 150)
      const ext = logoFile.name.split('.').pop()
      const path = `logos/${agency.id}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('package-images')
        .upload(path, logoFile)
      clearInterval(timer)
      if (upErr) { setBusy(false); setUploadPct(null); setMsg('อัปโหลดโลโก้ไม่สำเร็จ: ' + upErr.message); return }
      setUploadPct(100)
      const { data: pub } = supabase.storage.from('package-images').getPublicUrl(path)
      logoUrl = pub.publicUrl
      setTimeout(() => setUploadPct(null), 600)
    }

    const { error } = await supabase.rpc('agency_update_own_agency', {
      p_name: form.name || agency.name,
      p_logo: logoUrl || null,
      p_description: form.description || null,
      p_website: form.website || null,
      p_email: form.email || null,
      p_contact_name: form.contact_name || null,
      p_contact_phone: form.contact_phone || null,
    })
    setBusy(false)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setMsg('บันทึกเรียบร้อยแล้ว')
    onSaved({
      ...agency,
      name: form.name || agency.name,
      logo: logoUrl || null,
      description: form.description || null,
      website: form.website || null,
      email: form.email || null,
      contact_name: form.contact_name || null,
      contact_phone: form.contact_phone || null,
    })
  }

  const fieldStyle = {
    width: '100%', padding: '8px 10px', fontSize: 14,
    borderRadius: 8, border: '1px solid #cbd5e1', marginTop: 4,
  } as const
  const labelStyle = { fontSize: 13, color: '#475569', fontWeight: 500 } as const

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h2>ข้อมูลหน่วยงาน</h2>
      <p style={{ fontSize: 13, color: '#64748b', marginTop: -8, marginBottom: 12 }}>
        ข้อมูลชุดนี้ใช้ร่วมกันทุกบัญชีในหน่วยงานเดียวกัน แก้ไขที่นี่แล้วทุกคนจะเห็นการเปลี่ยนแปลงทันที
      </p>
      {msg && (
        <div style={{ background: msg.startsWith('บันทึก') ? '#dcfce7' : '#fee2e2',
                   color: msg.startsWith('บันทึก') ? '#166534' : '#991b1b',
                   padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 14 }}>
          {msg}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>โลโก้หน่วยงาน</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
            <div style={{
              width: 72, height: 72, borderRadius: 12, border: '1px solid #e2e8f0',
              background: '#f8fafc', flexShrink: 0, overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {logoPreview ? (
                <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 11, color: '#cbd5e1' }}>ไม่มีโลโก้</span>
              )}
            </div>
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={e => { e.preventDefault(); setDragOver(false) }}
              onDrop={e => {
                e.preventDefault(); setDragOver(false)
                const f = e.dataTransfer.files?.[0]
                if (f && f.type.startsWith('image/')) onPickLogo(f)
              }}
              style={{
                flex: 1, cursor: 'pointer', textAlign: 'center',
                padding: '18px 12px', borderRadius: 10,
                border: `2px dashed ${dragOver ? '#1e3a8a' : '#cbd5e1'}`,
                background: dragOver ? '#eff6ff' : '#f8fafc',
                color: '#64748b', fontSize: 13, transition: 'all .15s',
              }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>🖼️</div>
              {logoFile ? `เลือกแล้ว: ${logoFile.name}` : 'ลากรูปมาวาง หรือคลิกเพื่อเลือกไฟล์'}
              {uploadPct !== null && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${uploadPct}%`, background: '#1e3a8a',
                      borderRadius: 4, transition: 'width .2s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#1e3a8a', marginTop: 4, fontWeight: 600 }}>
                    {uploadPct < 100 ? `กำลังอัปโหลด… ${uploadPct}%` : 'อัปโหลดเสร็จ ✓'}
                  </div>
                </div>
              )}
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => onPickLogo(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <div>
          <label style={labelStyle}>ชื่อหน่วยงาน / บริษัท</label>
          <input style={fieldStyle} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>รายละเอียดบริการ</label>
          <textarea style={{ ...fieldStyle, minHeight: 90, resize: 'vertical' }}
            placeholder="อธิบายบริการที่หน่วยงานของท่านให้แก่ SME"
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>ชื่อผู้ติดต่อ</label>
            <input style={fieldStyle} value={form.contact_name} onChange={e => set('contact_name', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>เบอร์โทร</label>
            <input style={fieldStyle} value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>อีเมลติดต่อ</label>
            <input style={fieldStyle} value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>เว็บไซต์</label>
            <input style={fieldStyle} value={form.website} onChange={e => set('website', e.target.value)} />
          </div>
        </div>
        <div>
          <button className="btn" disabled={busy} onClick={save}>
            {busy ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
          </button>
        </div>

        <AgencyEditHistory supabase={supabase} agencyId={agency.id} refreshKey={msg} />
      </div>
    </div>
  )
}

function AgencyEditHistory({
  supabase, agencyId, refreshKey,
}: {
  supabase: ReturnType<typeof createClient>
  agencyId: string
  refreshKey: string
}) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<{ id: string; changed_by_name: string | null; changed_by_role: string | null; created_at: string }[] | null>(null)

  async function toggle() {
    if (open) { setOpen(false); return }
    setOpen(true)
    const { data, error } = await supabase.rpc('get_my_agency_edit_logs')
    if (!error) setLogs(data ?? [])
  }

  // เมื่อบันทึกสำเร็จ (refreshKey เปลี่ยน) ให้ล้าง cache เพื่อโหลดใหม่รอบหน้าที่เปิด
  useEffect(() => { setLogs(null) }, [refreshKey])

  const ROLE_LABEL: Record<string, string> = { agency: 'หน่วยงาน', expert: 'ที่ปรึกษา', admin: 'ผู้ดูแลระบบ' }

  return (
    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
      <button
        onClick={toggle}
        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#1e3a8a', fontSize: 13, padding: 0 }}>
        {open ? '▼' : '▶'} ประวัติการแก้ไข
      </button>
      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {logs === null ? (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>กำลังโหลด…</span>
          ) : logs.length === 0 ? (
            <span style={{ fontSize: 12, color: '#94a3b8' }}>ยังไม่มีประวัติการแก้ไข</span>
          ) : (
            logs.map(log => (
              <div key={log.id} style={{ fontSize: 12, color: '#475569', background: '#f8fafc', borderRadius: 6, padding: '6px 10px' }}>
                <strong>{log.changed_by_name ?? '—'}</strong>
                <span style={{ color: '#94a3b8' }}> ({ROLE_LABEL[log.changed_by_role ?? ''] ?? log.changed_by_role})</span>
                {' '}แก้ไขข้อมูลหน่วยงาน
                <div style={{ color: '#94a3b8', marginTop: 2 }}>
                  {new Date(log.created_at).toLocaleString('th-TH')}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
