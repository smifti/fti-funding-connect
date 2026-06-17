# FTI SME Funding Connect — คู่มือติดตั้ง (ฟรี 100%)

ระบบเชื่อมโยงการสนับสนุน SME พร้อมระบบ login หลายสิทธิ์
(SME / หน่วยงาน / ผู้เชี่ยวชาญ / ส.อ.ท.) ตามผังกระบวนการ

**สแตกที่ใช้ (ฟรีทั้งหมด):**
- Next.js (App Router) — ส่วนหน้าและ server logic
- Supabase — ฐานข้อมูล Postgres + Auth + Row Level Security
- Vercel — hosting

---

## ขั้นที่ 1 — สร้างโปรเจกต์ Supabase (ฟรี)

1. ไปที่ https://supabase.com → สมัคร → **New Project**
2. ตั้งชื่อ project, ตั้งรหัสผ่านฐานข้อมูล, เลือก region ใกล้ไทย (Singapore)
3. รอ ~2 นาทีให้ provision เสร็จ

## ขั้นที่ 2 — สร้างตารางและระบบสิทธิ์

1. ใน Supabase → เมนู **SQL Editor** → **New query**
2. คัดลอกเนื้อหาทั้งหมดจาก `supabase/schema.sql` วางแล้วกด **Run**
3. ตารางทั้งหมด, trigger, และ RLS policy จะถูกสร้างให้อัตโนมัติ

## ขั้นที่ 3 — ตั้งค่า Auth

1. ไปที่ **Authentication → Providers → Email** เปิดใช้งาน
2. (แนะนำตอนทดสอบ) ปิด "Confirm email" ที่ **Authentication → Sign In / Up**
   เพื่อให้ล็อกอินได้ทันทีโดยไม่ต้องยืนยันอีเมล
3. คัดลอกค่า 2 ตัวจาก **Project Settings → API**:
   - Project URL
   - anon public key

## ขั้นที่ 4 — รันในเครื่อง (ทดสอบ)

```bash
cd app
cp .env.local.example .env.local
# แก้ .env.local ใส่ URL และ anon key จากขั้นที่ 3
npm install
npm run dev
```

เปิด http://localhost:3000 → ลงทะเบียน SME ได้ทันที

## ขั้นที่ 5 — ตั้งบทบาทผู้ใช้

ผู้สมัครใหม่ทุกคนเป็น `sme` โดยอัตโนมัติ
หากต้องการตั้งให้เป็น expert / agency / admin:

1. ให้ผู้ใช้นั้นสมัครผ่านหน้า register ก่อน (เพื่อให้มี record ใน auth.users)
2. ไปที่ SQL Editor → เปิด `supabase/seed_roles.sql`
3. แก้อีเมลให้ตรงกับผู้ใช้จริง แล้ว Run เฉพาะคำสั่งที่ต้องการ

ตัวอย่าง: ตั้งให้ธนาคารเห็นเฉพาะคำขอ "สินเชื่อ"
```sql
update public.profiles
set role = 'agency', agency_name = 'SME D Bank', agency_categories = '{credit}'
where id = (select id from auth.users where email = 'bank@example.com');
```

## ขั้นที่ 6 — Deploy ขึ้น Vercel (ฟรี)

1. push โค้ดขึ้น GitHub
2. ไปที่ https://vercel.com → **Import Project** → เลือก repo
3. ตั้ง **Root Directory** = `app`
4. ใส่ Environment Variables 2 ตัว:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. กด **Deploy** — เสร็จแล้วได้ URL ใช้งานจริง

---

## วิธีที่ระบบบังคับสิทธิ์ (สำคัญ)

สิทธิ์ถูกบังคับที่ **ฐานข้อมูล** ด้วย Row Level Security ไม่ใช่แค่ที่หน้าจอ
แม้มีคนพยายามเรียก API ตรง ๆ ก็จะเห็นเฉพาะข้อมูลที่ตัวเองมีสิทธิ์:

| บทบาท | เห็นอะไร |
|--------|----------|
| SME | เฉพาะกิจการ คำขอ และ Health Check ของตัวเอง |
| หน่วยงาน | เฉพาะ SME ที่ยื่นคำขอ **ตรงด้านที่หน่วยงานรับผิดชอบ** |
| ผู้เชี่ยวชาญ | คำขอทั้งหมดที่รอคัดกรอง เพื่อส่งต่อ |
| ส.อ.ท. (admin) | ทั้งหมด + dashboard ภาพรวม |

## การแมปกับผังกระบวนการ

| ขั้นในผัง | ส่วนในระบบ |
|-----------|------------|
| 1 ยื่นใบสมัคร | หน้า register + sme_profiles |
| 2 เลือกด้าน (7 ด้าน) | NewRequestForm + enum support_category |
| 3 Health Check 5 ด้าน | ตาราง health_checks + แสดงผลใน SME dashboard |
| 4 ระบบ + ฐานข้อมูลกลาง | Supabase Postgres + RLS |
| 5 หน่วยงานเข้าถึงเฉพาะด้านตน | Agency dashboard + RLS by category |
| 6 ติดตาม real-time | status_history + Admin dashboard |
| กันรับซ้ำ | unique(sme_id, category) ใน funding_requests |

## ขีดจำกัด free tier
Supabase free รองรับ ~500MB DB และจะ pause หากไม่มีการใช้งานนานเกิน 1 สัปดาห์
(กดปุ่ม restore ได้ฟรี) เพียงพอสำหรับนำร่อง/POC หลักพันถึงหลักหมื่นราย
หากใช้งานจริงปริมาณมาก แนะนำอัปเกรด Supabase Pro ($25/เดือน)
