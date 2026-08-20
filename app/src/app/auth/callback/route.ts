import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// รับลิงก์จากอีเมลของ Supabase Auth (เช่น ลิงก์รีเซ็ตรหัสผ่าน) ที่มี ?code=...
// แลก code เป็น session (ตั้ง cookie ให้) แล้ว redirect ต่อไปตาม ?next=
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const next = req.nextUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, req.url))
    }
  }

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('confirm_error', '1')
  return NextResponse.redirect(loginUrl)
}
