'use client'

// Modal ขอความยินยอม PDPA ก่อนส่งคำขอไปยังธนาคาร/สถาบันการเงินที่เลือก
// อิงเนื้อหาจากเอกสาร "ความยินยอมในการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล — ระบบ FTI SME Funding Connect"
// แสดงก่อนกด "สมัคร" ทุกครั้ง (ตามที่เอกสารระบุว่าต้องยินยอมเฉพาะสถาบันการเงินที่เลือกในแต่ละครั้ง)

export default function PdpaConsentModal({
  agencyName, packageTitle, onCancel, onAccept, loading,
}: {
  agencyName: string
  packageTitle: string
  onCancel: () => void
  onAccept: () => void
  loading?: boolean
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, maxWidth: 620, width: '100%',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 24px 0' }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>ความยินยอมในการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>ระบบ FTI SME Funding Connect</p>
        </div>

        <div style={{ padding: '12px 24px', overflowY: 'auto', flex: 1, fontSize: 14, lineHeight: 1.7 }}>
          <p>
            สภาอุตสาหกรรมแห่งประเทศไทย (&quot;ส.อ.ท.&quot;) ให้ความสำคัญกับการคุ้มครองข้อมูลส่วนบุคคลของผู้ใช้งาน
            และจะเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลของท่านเท่าที่จำเป็นภายใต้วัตถุประสงค์ที่เกี่ยวข้องกับการให้บริการของระบบ
            และตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562
          </p>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, margin: '12px 0' }}>
            <strong>ท่านกำลังสมัคร:</strong> {packageTitle}<br />
            <strong>จาก:</strong> {agencyName}
          </div>

          <p>
            เมื่อท่านเลือกสมัครหรือขอรับบริการจากธนาคารหรือสถาบันการเงินผ่านระบบ FTI SME Funding Connect
            ท่านตกลงให้ ส.อ.ท. เปิดเผยหรือส่งต่อข้อมูลและเอกสารที่เกี่ยวข้องกับคำขอของท่านให้แก่{' '}
            <strong>{agencyName}</strong> เพื่อวัตถุประสงค์ในการตรวจสอบคุณสมบัติเบื้องต้น ติดต่อและให้คำปรึกษาแก่ท่าน
            พิจารณาคำขอรับบริการหรือคำขอสินเชื่อ ขอข้อมูลหรือเอกสารเพิ่มเติม
            และดำเนินกระบวนการพิจารณาสินเชื่อหรือบริการทางการเงินของสถาบันการเงินนั้น
          </p>

          <p>
            เมื่อข้อมูลถูกส่งไปยังธนาคารหรือสถาบันการเงินแล้ว ธนาคารหรือสถาบันการเงินนั้นอาจมีฐานะเป็นผู้ควบคุมข้อมูลส่วนบุคคลแยกต่างหาก
            และจะดำเนินการกับข้อมูลของท่านตามนโยบายคุ้มครองข้อมูลส่วนบุคคลและหลักเกณฑ์ของธนาคารหรือสถาบันการเงินนั้น
          </p>

          <p style={{ fontWeight: 600 }}>
            การให้ความยินยอมในการส่งข้อมูลผ่าน FTI SME Funding Connect ไม่ถือเป็นการอนุมัติสินเชื่อ
            และไม่รับรองว่าท่านจะได้รับสินเชื่อหรือบริการจากสถาบันการเงิน
          </p>

          <p>
            ข้อมูลของท่านจะไม่ถูกส่งให้แก่ธนาคารหรือสถาบันการเงินอื่นที่ท่านไม่ได้เลือก
            เว้นแต่ท่านได้ให้ความยินยอมเพิ่มเติมไว้โดยชัดแจ้ง หรือเป็นกรณีที่กฎหมายกำหนดหรืออนุญาตให้ดำเนินการได้
          </p>

          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            ท่านมีสิทธิขอเข้าถึง แก้ไข ลบ ระงับการใช้ คัดค้าน หรือถอนความยินยอมที่ให้ไว้ได้ตามช่องทางที่ ส.อ.ท. กำหนด
            ทั้งนี้การถอนความยินยอมจะไม่กระทบต่อการดำเนินการที่เกิดขึ้นโดยชอบด้วยกฎหมายก่อนการถอนความยินยอม
          </p>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14, marginTop: 12 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>
              การกด &quot;ยอมรับและดำเนินการต่อ&quot; ด้านล่าง หมายถึง:
            </p>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>ข้าพเจ้าได้อ่านและรับทราบประกาศความเป็นส่วนตัว (Privacy Notice) ของระบบนี้แล้ว</li>
              <li>
                ข้าพเจ้ายินยอมให้ ส.อ.ท. เปิดเผยหรือส่งต่อข้อมูลส่วนบุคคล ข้อมูลกิจการ ข้อมูลทางการเงิน
                และเอกสารที่ข้าพเจ้าให้ไว้ ไปยัง <strong>{agencyName}</strong>{' '}
                เพื่อการติดต่อ ตรวจสอบคุณสมบัติ พิจารณาคำขอ และดำเนินการเกี่ยวกับบริการที่ข้าพเจ้าสมัคร
              </li>
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading} style={{ flex: 1 }}>
            ยกเลิก
          </button>
          <button className="btn" onClick={onAccept} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'กำลังดำเนินการ…' : 'ยอมรับและดำเนินการต่อ'}
          </button>
        </div>
      </div>
    </div>
  )
}
