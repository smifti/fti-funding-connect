import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const loginUrl = new URL('/login', req.url)

  if (!token) {
    loginUrl.searchParams.set('confirm_error', '1')
    return NextResponse.redirect(loginUrl)
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('confirm_approval_email', { p_token: token })

    if (error || !data) {
      loginUrl.searchParams.set('confirm_error', '1')
      return NextResponse.redirect(loginUrl)
    }

    loginUrl.searchParams.set('confirmed', '1')
    return NextResponse.redirect(loginUrl)
  } catch {
    loginUrl.searchParams.set('confirm_error', '1')
    return NextResponse.redirect(loginUrl)
  }
}
