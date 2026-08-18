'use client'
import PackageDetailContent, { type Pkg } from './PackageDetailContent'

export type { Pkg }

export default function PackageDetailModal({
  pkg, applicantCount, onClose,
  mode = 'agency',
  canApply = false, isApplied = false, applying = false, onApply, closedLabel,
  isSaved = false, onToggleSave, savingBookmark = false,
}: {
  pkg: Pkg
  applicantCount: number
  onClose: () => void
  mode?: 'sme' | 'agency' | 'admin' | 'public'
  canApply?: boolean
  isApplied?: boolean
  applying?: boolean
  onApply?: () => void
  closedLabel?: string
  isSaved?: boolean
  onToggleSave?: () => void
  savingBookmark?: boolean
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 16,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          background: '#fff', borderRadius: 16, width: '100%', maxWidth: 1120,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>

        {/* ปุ่มปิด ลอยมุมขวาบนเสมอ */}
        <button onClick={onClose} aria-label="ปิด" style={{
          position: 'absolute', top: 24, right: 24, zIndex: 20,
          width: 32, height: 32, borderRadius: '50%', border: 'none',
          background: 'rgba(15,23,42,0.55)', color: '#fff', cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}>×</button>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <PackageDetailContent
            pkg={pkg}
            applicantCount={applicantCount}
            mode={mode}
            canApply={canApply}
            isApplied={isApplied}
            applying={applying}
            onApply={onApply}
            closedLabel={closedLabel}
            isSaved={isSaved}
            onToggleSave={onToggleSave}
            savingBookmark={savingBookmark}
          />
        </div>
      </div>
    </div>
  )
}
