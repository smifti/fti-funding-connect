'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import AgencyAction from './AgencyAction'
import AgencyPackages from './AgencyPackages'
import AgencyApplicants from './AgencyApplicants'
import AgencyOverview from './AgencyOverview'
import ChangePassword from '@/components/ChangePassword'
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
export default function AgencyTabs({
  profile, requests, smeList, packages, applicants, currentUser, applicantCounts,
}: {
  profile: Profile
  requests: any[]
  smeList: any[]
  packages: any[]
  applicants: any[]
  currentUser: { id: string; name: string; role: string }
  applicantCounts: Record<string, number>
}) {
  const [tab, setTab] = useState<'overview' | 'packages' | 'profile' | 'sme' | 'settings'>('overview')
  const [filterPkg, setFilterPkg] = useState<string | null>(null)
  const [filterPkgTitle, setFilterPkgTitle] = useState<string | null>(null)
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
          ภาพรวม
        </button>
        <button onClick={() => setTab('packages')} style={tabStyle(tab === 'packages')}>
          แพ็กเกจของฉัน ({packages.length})
        </button>
        <button onClick={() => { setFilterPkg(null); setFilterPkgTitle(null); setTab('sme') }} style={tabStyle(tab === 'sme')}>
          ผู้สมัครแพ็กเกจ ({applicants.length})
        </button>
        <button onClick={() => setTab('profile')} style={tabStyle(tab === 'profile')}>
          โปรไฟล์หน่วยงาน
        </button>
        <button onClick={() => setTab('settings')} style={tabStyle(tab === 'settings')}>
          ตั้งค่า
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
          allPackages={packages.map((p: any) => ({ id: p.id, title: p.title }))} />
      )}
      {tab === 'packages' && (
        <AgencyPackages
          ownerId={profile.id}
          categories={(profile.agency_categories ?? []) as string[]}
          initial={packages}
          applicantCounts={applicantCounts}
        />
      )}
      {tab === 'profile' && <AgencyProfileForm profile={profile} />}
      {tab === 'settings' && <ChangePassword />}
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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(profile.agency_logo ?? null)
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
    let logoUrl: string | undefined = undefined
    if (logoFile) {
      setUploadPct(0)
      const timer = setInterval(() => {
        setUploadPct(p => (p === null ? 10 : Math.min(p + 15, 90)))
      }, 150)
      const ext = logoFile.name.split('.').pop()
      const path = `logos/${profile.id}-${Date.now()}.${ext}`
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
    const payload: any = {
      agency_name: form.agency_name || null,
      full_name: form.full_name || null,
      phone: form.phone || null,
      agency_email: form.agency_email || null,
      agency_website: form.agency_website || null,
      agency_description: form.agency_description || null,
    }
    if (logoUrl !== undefined) payload.agency_logo = logoUrl
    const { error } = await supabase.from('profiles').update(payload).eq('id', profile.id)
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
