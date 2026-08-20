import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // ใช้ implicit flow แทน PKCE (ค่า default ของ @supabase/ssr) เพราะ PKCE ต้อง
        // เปิดลิงก์จากอีเมลด้วย browser/อุปกรณ์เดียวกับตอนกด "ส่งลิงก์" เท่านั้น
        // (ต้องมี code_verifier ที่เก็บไว้ในเครื่องเดิม) ถ้าเปิดอีเมลคนละเครื่อง/คนละแอป
        // จะ fail ทุกครั้ง — implicit flow ไม่ต้องพึ่งอุปกรณ์เดิม ใช้ได้จากที่ไหนก็ได้
        flowType: 'implicit',
      },
    }
  )
}
