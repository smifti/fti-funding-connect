'use client'

const CATEGORY_LABELS: Record<string, string> = {
  credit: 'สินเชื่อ', innovation: 'นวัตกรรม', management: 'บริหารจัดการ',
  marketing: 'การตลาด', production: 'การผลิต', upskill: 'Upskill / Reskill',
  other: 'อื่น ๆ (ESG)',
}

// คำนวณสถานะรวมของใบสมัคร จาก steps
function caseStatus(steps: Record<string, any>): 'submitted' | 'screening' | 'in_progress' | 'completed' | 'rejected' {
  const s = steps ?? {}
  if (Object.values(s).some((x: any) => x?.state === 'failed')) return 'rejected'
  if (s.completed?.state === 'passed') return 'completed'
  if (s.in_progress?.state === 'passed') return 'in_progress'
  if (s.screening?.state === 'passed') return 'in_progress'
  return 'submitted'
}

export default function AgencyOverview({
  applicants, packages, applicantCounts, onGoApplicants, onGoPackages,
}: {
  applicants: any[]
  packages: any[]
  applicantCounts: Record<string, number>
  onGoApplicants: (pkgId?: string, pkgTitle?: string) => void
  onGoPackages: () => void
}) {
  // นับตามสถานะ
  const counts = { submitted: 0, screening: 0, in_progress: 0, completed: 0, rejected: 0 }
  for (const a of applicants) {
    const st = caseStatus(a.steps)
    counts[st]++
  }
  const total = applicants.length

  // การ์ดสรุป
  const cards = [
    { label: 'คำขอใหม่', value: counts.submitted, color: '#1e3a8a', bg: '#eff6ff', desc: 'เพิ่งสมัคร ยังไม่ดำเนินการ' },
    { label: 'กำลังพิจารณา/ดำเนินการ', value: counts.in_progress, color: '#a16207', bg: '#fef9c3', desc: 'อยู่ระหว่างตรวจสอบ/ให้บริการ' },
    { label: 'ได้รับการสนับสนุนแล้ว', value: counts.completed, color: '#166534', bg: '#dcfce7', desc: 'ดำเนินการสำเร็จ' },
    { label: 'ไม่ผ่าน', value: counts.rejected, color: '#991b1b', bg: '#fee2e2', desc: 'ไม่ผ่านการพิจารณา' },
    { label: 'ผู้สมัครทั้งหมด', value: total, color: '#3730a3', bg: '#e0e7ff', desc: 'SME ที่สมัครแพ็กเกจ' },
  ]

  // งานที่ต้องดำเนินการ (ยังไม่เสร็จสิ้น และไม่ไม่ผ่าน)
  const todo = applicants.filter(a => {
    const st = caseStatus(a.steps)
    return st !== 'completed' && st !== 'rejected'
  }).slice(0, 5)

  const STATUS_TEXT: Record<string, string> = {
    submitted: 'คำขอใหม่ — รอรับเรื่อง',
    screening: 'อยู่ระหว่างพิจารณาคุณสมบัติ',
    in_progress: 'อยู่ระหว่างดำเนินการ',
  }

  // Pipeline
  const pipeline = [
    { label: 'ได้รับคำขอ', value: total, color: '#1e3a8a' },
    { label: 'รับเรื่อง', value: counts.screening + counts.in_progress + counts.completed, color: '#0891b2' },
    { label: 'กำลังดำเนินการ', value: counts.in_progress + counts.completed, color: '#a16207' },
    { label: 'สำเร็จ', value: counts.completed, color: '#166534' },
  ]
  const maxPipe = Math.max(total, 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* การ์ดสรุป */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.color, marginTop: 2 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      {/* งานที่ต้องดำเนินการ */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>งานที่ต้องดำเนินการ</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => onGoApplicants()}>ดูทั้งหมด</button>
        </div>
        {todo.length === 0 ? (
          <p className="empty">ไม่มีงานค้าง 🎉</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todo.map(a => {
              const st = caseStatus(a.steps)
              return (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', background: '#f8fafc', borderRadius: 8, gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{a.sme_profiles?.company_name ?? '—'}</span>
                    <span style={{ fontSize: 13, color: '#64748b' }}> · {a.packages?.title ?? '—'}</span>
                    <div style={{ fontSize: 12, color: '#a16207' }}>{STATUS_TEXT[st] ?? st}</div>
                  </div>
                  <button className="btn btn-sm" onClick={() => onGoApplicants(p.id, p.title)}>ดูผู้สมัคร</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pipeline */}
      <div className="card">
        <h2>สถานะคำขอทั้งหมด</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          {pipeline.map(p => (
            <div key={p.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{p.label}</span><span style={{ fontWeight: 600 }}>{p.value}</span>
              </div>
              <div style={{ height: 10, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(p.value / maxPipe) * 100}%`,
                  background: p.color, borderRadius: 5, transition: 'width .3s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ภาพรวมแพ็กเกจ */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>ภาพรวมแพ็กเกจ ({packages.length})</h2>
          <button className="btn btn-ghost btn-sm" onClick={onGoPackages}>จัดการแพ็กเกจ</button>
        </div>
        {packages.length === 0 ? (
          <p className="empty">ยังไม่มีแพ็กเกจ</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {packages.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', background: '#f8fafc', borderRadius: 8, gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{p.title}</span>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{CATEGORY_LABELS[p.category] ?? p.category}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13 }}>สมัคร <strong style={{ color: '#1e3a8a' }}>{applicantCounts[p.id] ?? 0}</strong> ราย</span>
                  <button className="btn btn-sm" onClick={() => onGoApplicants(p.id)}>ดูผู้สมัคร</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* เฟส 2: ผลลัพธ์การสนับสนุน (เตรียมโครง — รอเพิ่มข้อมูลมูลค่า/โควตา) */}
      <div className="card" style={{ opacity: 0.7 }}>
        <h2>ผลลัพธ์การสนับสนุน</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 8 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#166534' }}>{counts.completed}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>SME ที่ได้รับการสนับสนุน</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#94a3b8' }}>—</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>มูลค่าการสนับสนุนรวม (เร็ว ๆ นี้)</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e3a8a' }}>
              {total > 0 ? Math.round((counts.completed / total) * 100) : 0}%
            </div>
            <div style={{ fontSize: 13, color: '#64748b' }}>อัตราได้รับการสนับสนุน</div>
          </div>
        </div>
      </div>
    </div>
  )
}
