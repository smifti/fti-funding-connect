import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/resend'

const LOGO_URL = 'https://jvlakqyqyhaqcsvusgtg.supabase.co/storage/v1/object/public/assets/FDC_Logo01.png'
const DSAR_ADMIN_URL = 'https://ftifunding.com/dashboard/dsar-requests'
const DSAR_MY_URL = 'https://ftifunding.com/dashboard/privacy'

const REQUEST_TYPE_LABEL: Record<string, string> = {
  access: 'ขอเข้าถึง/ขอรับสำเนาข้อมูล',
  rectify: 'ขอแก้ไขข้อมูลให้ถูกต้อง',
  delete: 'ขอให้ลบ/ทำลายข้อมูล',
  restrict: 'ขอให้ระงับการใช้ข้อมูล',
  object: 'คัดค้านการประมวลผลข้อมูล',
  portability: 'ขอรับ/โอนย้ายข้อมูล',
  withdraw_consent: 'ถอนความยินยอม',
}
const STATUS_LABEL: Record<string, string> = {
  completed: 'เสร็จสิ้น',
  rejected: 'ปฏิเสธคำขอ',
}

function emailShell(bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
          ${bodyHtml}
          <tr>
            <td style="padding: 0 32px 32px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
              <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
                สภาอุตสาหกรรมแห่งประเทศไทย · FTI SME Funding Connect
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildNewRequestHtml(requesterName: string, requestType: string, details: string | null): string {
  return emailShell(`
    <tr>
      <td style="padding: 32px 32px 8px;">
        <h1 style="margin: 0 0 16px; font-size: 20px; color: #1e293b; font-weight: 700;">
          📋 มีคำขอใช้สิทธิเจ้าของข้อมูล (DSAR) ใหม่
        </h1>
        <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7; color: #334155;">
          <strong>${requesterName}</strong> ได้ยื่นคำขอประเภท
          <strong>${REQUEST_TYPE_LABEL[requestType] ?? requestType}</strong>
        </p>
        ${details ? `<p style="margin: 0 0 12px; font-size: 14px; line-height: 1.7; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 8px;">${details}</p>` : ''}
        <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7; color: #334155;">
          กรุณาเข้าไปตรวจสอบและดำเนินการในระบบ
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 16px 32px 32px;">
        <a href="${DSAR_ADMIN_URL}"
          style="display:inline-block; background-color:#1e3a8a; color:#ffffff; text-decoration:none;
                 font-size: 15px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
          ไปที่หน้าจัดการคำขอ
        </a>
      </td>
    </tr>
  `)
}

function buildResolvedHtml(requestType: string, status: string, resolutionNote: string | null): string {
  const statusColor = status === 'completed' ? '#16a34a' : '#dc2626'
  return emailShell(`
    <tr>
      <td style="padding: 32px 32px 8px;">
        <h1 style="margin: 0 0 16px; font-size: 20px; color: #1e293b; font-weight: 700;">
          คำขอใช้สิทธิของท่านได้รับการดำเนินการแล้ว
        </h1>
        <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.7; color: #334155;">
          คำขอประเภท <strong>${REQUEST_TYPE_LABEL[requestType] ?? requestType}</strong> ของท่าน
          มีสถานะ: <strong style="color: ${statusColor};">${STATUS_LABEL[status] ?? status}</strong>
        </p>
        ${resolutionNote ? `<p style="margin: 0 0 12px; font-size: 14px; line-height: 1.7; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 8px;"><strong>ผลการดำเนินการ:</strong> ${resolutionNote}</p>` : ''}
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 16px 32px 32px;">
        <a href="${DSAR_MY_URL}"
          style="display:inline-block; background-color:#1e3a8a; color:#ffffff; text-decoration:none;
                 font-size: 15px; font-weight: 600; padding: 12px 32px; border-radius: 8px;">
          ดูรายละเอียด
        </a>
      </td>
    </tr>
  `)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { requestId?: string; type?: 'new' | 'resolved' }
    const { requestId, type } = body

    if (!requestId || (type !== 'new' && type !== 'resolved')) {
      return NextResponse.json({ ok: false, error: 'พารามิเตอร์ไม่ถูกต้อง' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error: rpcError } = await supabase.rpc('get_dsar_notification_data', { p_request_id: requestId })

    if (rpcError || !data || data.length === 0) {
      return NextResponse.json({ ok: false, error: 'ไม่พบข้อมูลคำขอ' }, { status: 200 })
    }
    const row = data[0]

    if (type === 'new') {
      // แจ้ง admin ทุกคนในระบบ
      const { data: admins } = await supabase.rpc('get_admin_emails')
      if (!admins || admins.length === 0) {
        return NextResponse.json({ ok: false, error: 'ไม่พบอีเมล admin' }, { status: 200 })
      }
      const html = buildNewRequestHtml(row.user_full_name ?? 'ผู้ใช้งาน', row.request_type, row.details)
      await Promise.all(
        admins.map((a: { email: string }) =>
          sendEmail({ to: a.email, subject: 'มีคำขอใช้สิทธิเจ้าของข้อมูล (DSAR) ใหม่ — FTI SME Funding Connect', html })
        )
      )
    } else {
      // แจ้งผู้ยื่นคำขอ
      if (row.status !== 'completed' && row.status !== 'rejected') {
        return NextResponse.json({ ok: true, skipped: true })
      }
      const html = buildResolvedHtml(row.request_type, row.status, row.resolution_note)
      await sendEmail({
        to: row.user_email,
        subject: 'คำขอใช้สิทธิเจ้าของข้อมูลของท่านได้รับการดำเนินการแล้ว — FTI SME Funding Connect',
        html,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 200 })
  }
}
