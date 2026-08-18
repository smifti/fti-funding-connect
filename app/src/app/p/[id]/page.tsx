import { createClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PackageDetailContent from '../../dashboard/shared-packages/PackageDetailContent'

export default async function PublicPackagePage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_package_detail', { p_package_id: params.id })

  if (error || !data) return notFound()

  const raw = data as any

  // ปรับโครงสร้างข้อมูลจาก RPC (แบบแบน) ให้ตรงกับ shape ที่ PackageDetailContent ต้องการ (profiles.agencies.*)
  const pkg = {
    ...raw,
    profiles: {
      agency_name: null,
      full_name: null,
      agencies: {
        name: raw.agency_name ?? null,
        logo: raw.agency_logo ?? null,
        website: raw.agency_website ?? null,
        description: null,
        contact_name: raw.agency_contact_name ?? null,
        contact_phone: raw.agency_contact_phone ?? null,
        email: raw.agency_email ?? null,
      },
    },
  }

  const applyHref = `/login?redirect=${encodeURIComponent('/dashboard?package=' + pkg.id)}`

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7fb' }}>
      {/* แถบหัวเรื่องแบบเรียบง่าย ไม่ต้อง login */}
      <div style={{ background: '#1e2a78', padding: '14px 0' }}>
        <div className="container">
          <Link href="/" style={{ color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
            ← FTI SME Funding Connect
          </Link>
        </div>
      </div>

      <div className="container" style={{ padding: '24px 0 60px' }}>
        <div style={{
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(20,29,87,.06), 0 8px 24px rgba(20,29,87,.06)',
          maxWidth: 1120, margin: '0 auto',
        }}>
          <PackageDetailContent
            pkg={pkg}
            applicantCount={0}
            mode="public"
            applyHref={applyHref}
          />
        </div>
      </div>
    </div>
  )
}
