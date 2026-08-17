// ============================================
// resend.ts — utility function สำหรับส่งอีเมลผ่าน Resend API
// ใช้ฝั่ง server เท่านั้น (API Route) เพราะต้องใช้ RESEND_API_KEY ที่เป็นความลับ
// ============================================

const RESEND_API_URL = 'https://api.resend.com/emails'

// โดเมนที่ verify แล้วใน Resend — ใช้เป็นผู้ส่ง (from address)
const FROM_ADDRESS = 'FTI SME Funding Connect <noreply@ftifunding.com>'

export type SendEmailParams = {
  to: string
  subject: string
  html: string
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/**
 * ส่งอีเมลผ่าน Resend API
 * ต้องเรียกจากฝั่ง server เท่านั้น (API Route / Server Action) เพราะใช้ RESEND_API_KEY
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY ยังไม่ได้ตั้งค่าใน environment variables' }
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject,
        html,
      }),
    })

    const data = await res.json() as { id?: string; message?: string }

    if (!res.ok) {
      return { ok: false, error: data?.message || `Resend API error: ${res.status}` }
    }

    return { ok: true, id: data.id ?? '' }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Resend API' }
  }
}
