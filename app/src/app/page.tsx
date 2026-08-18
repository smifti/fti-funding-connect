import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'
import PublicPackageCatalog from './PublicPackageCatalog'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()
  const { data: packages } = await supabase.rpc('list_public_packages')

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7fb' }}>
      {/* แถบหัวเรื่อง */}
      <div style={{ background: '#1e2a78', padding: '16px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>FTI SME Funding Connect</span>
          <Link href="/login" className="btn btn-sm" style={{ width: 'auto' }}>
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>

      {/* Hero: วัตถุประสงค์โครงการ */}
      <div style={{ background: 'linear-gradient(135deg, #141d57, #4733a8)', padding: '48px 0' }}>
        <div className="container" style={{ textAlign: 'center', color: '#fff' }}>
          <h1 style={{ fontSize: 28, margin: '0 0 12px' }}>เชื่อมโยงโอกาส สู่เงินทุน เพื่อ SME ไทยเติบโต</h1>
          <p style={{ fontSize: 15, maxWidth: 640, margin: '0 auto', opacity: 0.9, lineHeight: 1.7 }}>
            FTI SME Funding Connect คือแพลตฟอร์มที่สภาอุตสาหกรรมแห่งประเทศไทย (ส.อ.ท.) จัดทำขึ้น
            เพื่อเชื่อมโยงผู้ประกอบการ SME เข้ากับแหล่งเงินทุน สินเชื่อ และบริการสนับสนุนธุรกิจ
            จากหน่วยงานพันธมิตรทั่วประเทศ ให้ค้นหาและเข้าถึงความช่วยเหลือที่เหมาะกับธุรกิจของท่านได้ง่ายขึ้น
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn" style={{ width: 'auto', padding: '12px 28px' }}>
              ลงทะเบียนใช้งาน
            </Link>
            <a href="#packages" className="btn btn-ghost"
              style={{ width: 'auto', padding: '12px 28px', color: '#fff', borderColor: 'rgba(255,255,255,.4)' }}>
              ดูบริการทั้งหมด
            </a>
          </div>
        </div>
      </div>

      {/* รายการบริการ */}
      <div id="packages" className="container" style={{ padding: '40px 0 60px' }}>
        <h2 style={{ fontSize: 20, color: '#1e2a78', marginBottom: 4 }}>บริการสนับสนุน SME</h2>
        <p style={{ fontSize: 14, color: '#6b7088', marginBottom: 20 }}>
          รวมสินเชื่อและบริการสนับสนุนจากหน่วยงานพันธมิตร — คลิกเพื่อดูรายละเอียด
        </p>
       
        <PublicPackageCatalog packages={packages ?? []} />
      </div>
    </div>
  )
}
