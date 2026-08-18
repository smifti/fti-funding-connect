import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'

const LOGO_URL = 'https://jvlakqyqyhaqcsvusgtg.supabase.co/storage/v1/object/public/assets/FDC_Logo01.png'
const LOGIN_URL = 'https://ftifunding.com/login'

function buildWelcomeEmailHtml(name: string): string {
  const displayName = name?.trim() ? name.trim() : 'สมาชิกใหม่'
  return `
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ลงทะเบียนสำเร็จ</title>
</head>
<body style="margin:0; padding:0; background-color:#f1f5f9; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color:#ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.06);">

          <!-- Header: โลโก้ -->
          <tr>
            <td align="center" style="padding: 32px 24px 20px; background-color: #ffffff;">
              <img src="${LOGO_URL}" alt="FTI SME Funding Connect" width="280" style="display:block; width: 280px; max-width: 100%; height: auto;" />
            </td>
          </tr>

          <!-- แถบสี -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #1e3a8a 0%, #16a34a 100%);"></td>
          </tr>

          <!-- เนื้อหา -->
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
                บัญชีของท่านพร้อมใช้งานแล้ว ท่านสามารถเข้าสู่ระบบเพื่อเพิ่มข้อมูลกิจการ
                และเริ่มค้นหาแหล่งเงินทุนที่เหมาะสมกับธุรกิจของท่านได้ทันที
              </p>
            </td>
          </tr>

          <!-- ปุ่มเข้าสู่ระบบ -->
          <tr>
            <td align="center" style="padding: 16px 32px 32px;">
              <a href="${LOGIN_URL}"
                style="display:inline-block; background-color:#1e3a8a; color:#ffffff; text-decoration:none;
                       font-size: 15px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
                เข้าสู่ระบบ
              </a>
            </td>
          </tr>

          <!-- คำแนะนำเพิ่มเติม -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <div style="background-color: #f8fafc; border-radius: 10px; padding: 16px 20px;">
                <p style="margin: 0; font-size: 13px; line-height: 1.7; color: #64748b;">
                  💡 <strong>ขั้นตอนถัดไป:</strong> เข้าสู่ระบบแล้วไปที่หน้า "โปรไฟล์" เพื่อกรอกข้อมูลกิจการเพิ่มเติม
                  เช่น ประเภทธุรกิจ ผลิตภัณฑ์ และความต้องการด้านเงินทุน เพื่อให้ระบบแนะนำบริการที่เหมาะกับท่านมากที่สุด
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
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
    const body = await req.json() as { email?: string; name?: string }
    const { email, name } = body

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ ok: false, error: 'อีเมลไม่ถูกต้อง' }, { status: 400 })
    }

    const html = buildWelcomeEmailHtml(name ?? '')

    const result = await sendEmail({
      to: email,
      subject: 'ลงทะเบียนสำเร็จ — FTI SME Funding Connect',
      html,
    })

    if (result.ok === false) {
      // ไม่ block การลงทะเบียนแม้ส่งอีเมลไม่สำเร็จ — แค่รายงาน error กลับไป
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 })
    }

    return NextResponse.json({ ok: true, id: result.id })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด' }, { status: 200 })
  }
}
