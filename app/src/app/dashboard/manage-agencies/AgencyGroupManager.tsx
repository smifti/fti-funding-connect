'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'

type Agency = {
  id: string
  name: string
  logo: string | null
  description: string | null
  website: string | null
  email: string | null
  contact_name: string | null
  contact_phone: string | null
  created_at: string
  member_count: number
  categories: string[]
}

const CATEGORIES: [string, string][] = [
  ['credit', 'สินเชื่อ'],
  ['innovation', 'นวัตกรรม'],
  ['management', 'บริหารจัดการ'],
  ['marketing', 'การตลาด'],
  ['production', 'การผลิต'],
  ['upskill', 'Upskill / Reskill'],
  ['other', 'อื่น ๆ (ESG)'],
]
const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES)

type UnassignedUser = {
  id: string
  email: string
  full_name: string | null
  role: string
  approval_status: string | null
  requested_role: string | null
  agency_name: string | null
  agency_logo: string | null
  agency_description: string | null
  agency_website: string | null
  agency_email: string | null
  phone: string | null
  created_at: string | null
  requested_agency_id: string | null
  requested_agency_name: string | null
}

type Member = { id: string; email: string; full_name: string | null; role: string; approval_status: string | null }

type AgencyFormState = {
  name: string
  logo: string
  description: string
  website: string
  email: string
  contact_name: string
  contact_phone: string
}

const emptyForm: AgencyFormState = {
  name: '', logo: '', description: '', website: '', email: '', contact_name: '', contact_phone: '',
}

export default function AgencyGroupManager({
  initialAgencies, initialUnassigned,
}: {
  initialAgencies: Agency[]
  initialUnassigned: UnassignedUser[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [msg, setMsg] = useState('')
  const [working, setWorking] = useState<string | null>(null)
  const [selectedAgencyFor, setSelectedAgencyFor] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [membersCache, setMembersCache] = useState<Record<string, Member[]>>({})
  const [createModalUser, setCreateModalUser] = useState<UnassignedUser | null>(null)
  const [form, setForm] = useState<AgencyFormState>(emptyForm)

  // สำหรับ admin แก้ไขข้อมูลหน่วยงานที่มีอยู่แล้ว
  const [editModalAgency, setEditModalAgency] = useState<Agency | null>(null)
  const [editForm, setEditForm] = useState<AgencyFormState>(emptyForm)
  const [editCats, setEditCats] = useState<string[]>([])
  const [editBusy, setEditBusy] = useState(false)

  function toggleEditCat(c: string) {
    setEditCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  async function assignToAgency(userId: string) {
    const agencyId = selectedAgencyFor[userId]
    if (!agencyId) { setMsg('กรุณาเลือกหน่วยงานก่อน'); return }
    setWorking(userId); setMsg('')
    const { error } = await supabase.rpc('admin_assign_user_to_agency', {
      p_user_id: userId, p_agency_id: agencyId,
    })
    setWorking(null)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setMsg('เพิ่มเข้าหน่วยงานเรียบร้อยแล้ว')
    router.refresh()
  }

  async function unassignMember(userId: string, agencyId: string) {
    setWorking(userId); setMsg('')
    const { error } = await supabase.rpc('admin_unassign_user_from_agency', { p_user_id: userId })
    setWorking(null)
    if (error) { setMsg('เกิดข้อผิดพลาด: ' + error.message); return }
    setMsg('ถอดออกจากหน่วยงานเรียบร้อยแล้ว')
    setMembersCache(prev => ({ ...prev, [agencyId]: (prev[agencyId] ?? []).filter(m => m.id !== userId) }))
    router.refresh()
  }

  async function toggleExpand(agencyId: string) {
    if (expanded === agencyId) { setExpanded(null); return }
    setExpanded(agencyId)
    if (!membersCache[agencyId]) {
      const { data, error } = await supabase.rpc('admin_list_agency_members', { p_agency_id: agencyId })
      if (!error) setMembersCache(prev => ({ ...prev, [agencyId]: data ?? [] }))
    }
  }

  function openCreateModal(u: UnassignedUser) {
    setForm({
      name: u.agency_name ?? '',
      logo: u.agency_logo ?? '',
      description: u.agency_description ?? '',
      website: u.agency_website ?? '',
      email: u.agency_email ?? '',
      contact_name: u.full_name ?? '',
      contact_phone: u.phone ?? '',
    })
    setCreateModalUser(u)
  }

  async function submitCreateAgency() {
    if (!createModalUser) return
    if (!form.name.trim()) { setMsg('กรุณากรอกชื่อหน่วยงาน'); return }
    setWorking(createModalUser.id); setMsg('')

    const { data: newId, error: createError } = await supabase.rpc('admin_create_agency', {
      p_name: form.name.trim(),
      p_logo: form.logo.trim() || null,
      p_description: form.description.trim() || null,
      p_website: form.website.trim() || null,
      p_email: form.email.trim() || null,
      p_contact_name: form.contact_name.trim() || null,
      p_contact_phone: form.contact_phone.trim() || null,
    })
    if (createError || !newId) {
      setWorking(null)
      setMsg('เกิดข้อผิดพลาดตอนสร้างหน่วยงาน: ' + (createError?.message ?? ''))
      return
    }

    const { error: assignError } = await supabase.rpc('admin_assign_user_to_agency', {
      p_user_id: createModalUser.id, p_agency_id: newId,
    })
    setWorking(null)
    if (assignError) {
      setMsg('สร้างหน่วยงานสำเร็จ แต่ผูก user ไม่สำเร็จ: ' + assignError.message)
      return
    }

    setMsg(`สร้างหน่วยงาน "${form.name.trim()}" และเพิ่ม ${createModalUser.full_name || createModalUser.email} เรียบร้อยแล้ว`)
    setCreateModalUser(null)
    setForm(emptyForm)
    router.refresh()
  }

  // เปิด modal แก้ไขข้อมูลหน่วยงานที่มีอยู่แล้ว (สำหรับ admin ช่วยแก้ไขแทน)
  function openEditModal(a: Agency) {
    setEditForm({
      name: a.name ?? '',
      logo: a.logo ?? '',
      description: a.description ?? '',
      website: a.website ?? '',
      email: a.email ?? '',
      contact_name: a.contact_name ?? '',
      contact_phone: a.contact_phone ?? '',
    })
    setEditCats(a.categories ?? [])
    setEditModalAgency(a)
  }

  async function submitEditAgency() {
    if (!editModalAgency) return
    if (!editForm.name.trim()) { setMsg('กรุณากรอกชื่อหน่วยงาน'); return }
    setEditBusy(true); setMsg('')

    const { error } = await supabase.rpc('admin_update_agency', {
      p_agency_id: editModalAgency.id,
      p_name: editForm.name.trim(),
      p_logo: editForm.logo.trim() || null,
      p_description: editForm.description.trim() || null,
      p_website: editForm.website.trim() || null,
      p_email: editForm.email.trim() || null,
      p_contact_name: editForm.contact_name.trim() || null,
      p_contact_phone: editForm.contact_phone.trim() || null,
    })
    setEditBusy(false)
    if (error) { setMsg('แก้ไขไม่สำเร็จ: ' + error.message); return }

    // บันทึกหมวดหมู่แยกอีก RPC หนึ่ง (ตัวใหม่ที่เพิ่งย้ายมาจากระดับผู้ใช้)
    const { error: catError } = await supabase.rpc('admin_set_agency_categories', {
      p_agency_id: editModalAgency.id, p_categories: editCats,
    })
    if (catError) { setMsg('บันทึกข้อมูลหน่วยงานสำเร็จ แต่บันทึกหมวดหมู่ไม่สำเร็จ: ' + catError.message); return }

    setMsg(`แก้ไขข้อมูล "${editForm.name.trim()}" เรียบร้อยแล้ว`)
    setEditModalAgency(null)
    router.refresh()
  }

  return (
    <div>
      {msg && <div className="alert alert-ok" style={{ marginBottom: 12 }}>{msg}</div>}

      {/* หน่วยงานที่มีอยู่แล้ว */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>หน่วยงานที่จัดกลุ่มแล้ว ({initialAgencies.length})</h2>
        {initialAgencies.length === 0 ? (
          <p className="empty">ยังไม่มีหน่วยงานที่จัดกลุ่ม</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {initialAgencies.map(a => (
              <div key={a.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {a.logo && (
                      <img src={a.logo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'contain', border: '1px solid #e2e8f0' }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        สมาชิก {a.member_count} คน
                        {a.contact_name && <> · ผู้ติดต่อ: {a.contact_name}</>}
                        {a.contact_phone && <> · {a.contact_phone}</>}
                      </div>
                      {a.categories && a.categories.length > 0 ? (
                        <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {a.categories.map(c => (
                            <span key={c} style={{ fontSize: 11, background: '#eef2ff', color: '#4338ca',
                              padding: '1px 8px', borderRadius: 8, fontWeight: 600 }}>
                              {CATEGORY_LABELS[c] ?? c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>ยังไม่ได้ตั้งหมวดหมู่</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(a)}>
                      ✏️ แก้ไข
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleExpand(a.id)}>
                      {expanded === a.id ? 'ซ่อนสมาชิก' : 'ดูสมาชิก'}
                    </button>
                  </div>
                </div>

                {expanded === a.id && (
                  <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                    {!membersCache[a.id] ? (
                      <p className="empty">กำลังโหลด…</p>
                    ) : membersCache[a.id].length === 0 ? (
                      <p className="empty">ยังไม่มีสมาชิก</p>
                    ) : (
                      <table>
                        <thead>
                          <tr><th>ชื่อ / อีเมล</th><th>สถานะ</th><th></th></tr>
                        </thead>
                        <tbody>
                          {membersCache[a.id].map(m => (
                            <tr key={m.id}>
                              <td>{m.full_name || '—'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.email}</div></td>
                              <td>{m.approval_status === 'approved' ? 'อนุมัติแล้ว' : m.approval_status}</td>
                              <td>
                                <button className="btn btn-ghost btn-sm" disabled={working === m.id}
                                  onClick={() => unassignMember(m.id, a.id)}>
                                  ถอดออก
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ผู้ใช้ที่ยังไม่ได้จัดกลุ่ม */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>ผู้ใช้ที่ยังไม่ได้จัดกลุ่ม ({initialUnassigned.length})</h2>
        {initialUnassigned.length === 0 ? (
          <p className="empty">ไม่มีผู้ใช้ที่ยังไม่ได้จัดกลุ่ม</p>
        ) : (
          <table>
            <thead>
              <tr><th>ชื่อ / อีเมล</th><th>ชื่อหน่วยงาน (เดิม)</th><th>การจัดการ</th></tr>
            </thead>
            <tbody>
              {initialUnassigned.map(u => (
                <tr key={u.id}>
                  <td>
                    {u.full_name || '—'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{u.email}</div>
                    {u.requested_agency_name && (
                      <div style={{ fontSize: 12, color: '#1e40af', background: '#dbeafe', display: 'inline-block',
                        padding: '2px 8px', borderRadius: 8, marginTop: 4, fontWeight: 600 }}>
                        📩 ขอเข้าร่วม: {u.requested_agency_name}
                      </div>
                    )}
                  </td>
                  <td>{u.agency_name || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {u.requested_agency_id && (
                        <button className="btn btn-sm" disabled={working === u.id}
                          onClick={() => {
                            setSelectedAgencyFor(prev => ({ ...prev, [u.id]: u.requested_agency_id! }))
                            assignToAgency(u.id)
                          }}
                          style={{ background: '#16a34a' }}>
                          ✓ อนุมัติตามคำขอ
                        </button>
                      )}
                      <select
                        value={selectedAgencyFor[u.id] ?? ''}
                        onChange={e => setSelectedAgencyFor(prev => ({ ...prev, [u.id]: e.target.value }))}
                        style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line)', fontSize: 13 }}
                      >
                        <option value="">— เลือกหน่วยงาน —</option>
                        {initialAgencies.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <button className="btn btn-sm" disabled={working === u.id || !selectedAgencyFor[u.id]}
                        onClick={() => assignToAgency(u.id)}>
                        เพิ่มเข้าหน่วยงาน
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={working === u.id}
                        onClick={() => openCreateModal(u)}>
                        สร้างหน่วยงานใหม่จากข้อมูลนี้
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal สร้างหน่วยงานใหม่ */}
      {createModalUser && (
        <div
          onClick={() => setCreateModalUser(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16,
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480,
              maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
            <div style={{ padding: '18px 20px 0 20px', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>สร้างหน่วยงานใหม่</h2>
              <button onClick={() => setCreateModalUser(null)} aria-label="ปิด" style={{
                border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8',
              }}>×</button>
            </div>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>ชื่อหน่วยงาน *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>โลโก้ (URL รูปภาพ)</label>
                <input value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>รายละเอียดบริการ</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 9, minHeight: 70 }} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>ชื่อผู้ติดต่อ</label>
                <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>เบอร์โทร</label>
                <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>อีเมลติดต่อ</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>เว็บไซต์</label>
                <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setCreateModalUser(null)}>ยกเลิก</button>
              <button className="btn btn-sm" disabled={working === createModalUser.id} onClick={submitCreateAgency}>
                {working === createModalUser.id ? 'กำลังสร้าง…' : 'สร้างและเพิ่มสมาชิก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal แก้ไขข้อมูลหน่วยงานที่มีอยู่แล้ว (admin ช่วยแก้ไขแทน) */}
      {editModalAgency && (
        <div
          onClick={() => setEditModalAgency(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16,
          }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480,
              maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
            <div style={{ padding: '18px 20px 0 20px', display: 'flex', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>แก้ไขข้อมูลหน่วยงาน</h2>
              <button onClick={() => setEditModalAgency(null)} aria-label="ปิด" style={{
                border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8',
              }}>×</button>
            </div>
            <p style={{ padding: '4px 20px 0', fontSize: 12, color: '#94a3b8' }}>
              การแก้ไขนี้จะมีผลกับทุกบัญชีในหน่วยงานเดียวกัน และจะถูกบันทึกในประวัติการแก้ไขว่าแก้โดยผู้ดูแลระบบ
            </p>
            <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field" style={{ margin: 0 }}>
                <label>ชื่อหน่วยงาน *</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>โลโก้ (URL รูปภาพ)</label>
                <input value={editForm.logo} onChange={e => setEditForm(f => ({ ...f, logo: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>รายละเอียดบริการ</label>
                <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  style={{ width: '100%', padding: '11px 13px', border: '1px solid var(--line)', borderRadius: 9, minHeight: 70 }} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>ชื่อผู้ติดต่อ</label>
                <input value={editForm.contact_name} onChange={e => setEditForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>เบอร์โทร</label>
                <input value={editForm.contact_phone} onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>อีเมลติดต่อ</label>
                <input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>เว็บไซต์</label>
                <input value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label>หมวดหมู่ที่หน่วยงานนี้รับผิดชอบ</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORIES.map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      className={`cat-chip ${editCats.includes(val) ? 'active' : ''}`}
                      onClick={() => toggleEditCat(val)}
                    >
                      {label}{editCats.includes(val) ? ' ✓' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditModalAgency(null)}>ยกเลิก</button>
              <button className="btn btn-sm" disabled={editBusy} onClick={submitEditAgency}>
                {editBusy ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
