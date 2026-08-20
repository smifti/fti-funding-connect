import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/resend'

const LOGO_URL = 'https://jvlakqyqyhaqcsvusgtg.supabase.co/storage/v1/object/public/assets/FDC_Logo01.png'
const CONFIRM_BASE_URL = 'https://ftifunding.com/api/confirm-approval'

function buildConfirmEmailHtml(name: string, confirmUrl: string): string {
  const displayName = name?.trim() ? name.trim() : 'สมาชิก'
  return `
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ยืนยันตัวตน</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color:#ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06);">

          <tr>
            <td align="center" style="padding: 32px 24px 20px; background-color: #ffffff;">
              <img src="${LOGO_URL}" alt="FTI SME Funding Connect" width="280" style="display:block; width: 280px; max-width: 100%; height: auto;" />
            </td>
          </tr>

          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #1e3a8a 0%, #16a34a 100%);"></td>
          </tr>

          <tr>
            <td style="padding: 32px 32px 8px;">
              <h1 style="margin: 0 0 16px; font-size: 20px; color: #1e293b; font-weight: 700;">
                ลงทะเบียนสำเร็จแล้ว 🎉
              </h1>
              <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7; color: #334155;">
                สวัสดีคุณ <strong>${displayName}</strong>
              </p>
              <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7; color: #334155;">
                ขอบคุณที่ลงทะเบียนเข้าใช้งานระบบ <strong>FTI SME Funding Connect</strong>
                ก่อนเข้าใช้งาน กรุณากดปุ่มด้านล่างเพื่อยืนยันตัวตนของท่านก่อนหนึ่งครั้ง
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 16px 32px 32px;">
              <a href="${confirmUrl}"
                style="display:inline-block; background-color:#16a34a; color:#ffffff; text-decoration:none;
                       font-size: 15px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
                ยืนยันตัวตน
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="background-color: #f8fafc; border-radius: 10px; padding: 16px 20px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #64748b;">
                  💡 หลังจากยืนยันตัวตนแล้ว ท่านจะสามารถเข้าสู่ระบบและเริ่มใช้งานได้ทันที
                  หากปุ่มด้านบนกดไม่ได้ ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์: <br />
                  <span style="word-break: break-all; color: #2563eb;">${confirmUrl}</span>
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #94a3b8; text-align: center;">
                อีเมลนี้ส่งจากระบบอัตโนมัติ กรุณาอย่าตอบกลับ<br />
                หากท่านไม่ได้ลงทะเบียนบัญชีนี้ กรุณาละเว้นอีเมลฉบับนี้<br /><br />
                © สภาอุตสาหกรรมแห่งประเทศไทย (ส.อ.ท.) — FTI SME Funding Connect
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { userId?: string; email?: string }
    const { userId, email } = body

    if (!userId && !email) {
      return NextResponse.json({ ok: false, error: 'ไม่มี userId หรือ email' }, { status: 400 })
    }

    // ดึงอีเมล/ชื่อ/token ของ user คนนี้ผ่าน RPC (ไม่ต้อง login)
    // ถ้ามี userId ใช้ RPC เดิม (เรียกตอนสมัครเสร็จใหม่ ๆ) ถ้ามีแต่ email ใช้ RPC ตัวใหม่
    // (เรียกจากหน้า login ตอนผู้ใช้ล็อกอินไม่ได้เพราะยังไม่ยืนยัน และไม่มี userId ในมือ)
    const supabase = await createClient()
    const { data, error: rpcError } = userId
      ? await supabase.rpc('get_signup_confirmation_info', { p_user_id: userId })
      : await supabase.rpc('get_signup_confirmation_info_by_email', { p_email: email })

    if (rpcError || !data || data.length === 0) {
      // ไม่ error กลับไปแบบเปิดเผยรายละเอียด (ป้องกันการเดา user id/email เพื่อสืบข้อมูล)
      return NextResponse.json({ ok: false, error: 'ไม่พบข้อมูลสำหรับส่งอีเมล' }, { status: 200 })
    }

    const row = data[0]
    const confirmUrl = `${CONFIRM_BASE_URL}?token=${row.token}`
    const html = buildConfirmEmailHtml(row.full_name ?? '', confirmUrl)

    const result = await sendEmail({
      to: row.email,
      subject: 'กรุณายืนยันตัวตน — FTI SME Funding Connect',
      html,
    })

    if (result.ok === false) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 })
    }

    return NextResponse.json({ ok: true, id: result.id })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด' }, { status: 200 })
  }
}
