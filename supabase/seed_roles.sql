-- =====================================================================
-- ตั้งค่าบทบาทผู้ใช้ (รันใน Supabase SQL Editor หลังจากผู้ใช้สมัครแล้ว)
-- =====================================================================
-- ค่าเริ่มต้นทุกคนเป็น 'sme' โดยอัตโนมัติ
-- คำสั่งด้านล่างใช้ยกระดับเป็น expert / agency / admin

-- ---- ตั้งเป็น ADMIN (ส.อ.ท. / FTI) ----
update public.profiles
set role = 'admin', full_name = 'ผู้ดูแลระบบ ส.อ.ท.'
where id = (select id from auth.users where email = 'admin@fti.or.th');

-- ---- ตั้งเป็น EXPERT (ที่ปรึกษา/ผู้เชี่ยวชาญ) ----
update public.profiles
set role = 'expert', full_name = 'ที่ปรึกษา SME'
where id = (select id from auth.users where email = 'expert@fti.or.th');

-- ---- ตั้งเป็น AGENCY: ธนาคาร (รับผิดชอบด้านสินเชื่อ) ----
update public.profiles
set role = 'agency',
    agency_name = 'SME D Bank',
    agency_categories = '{credit}'
where id = (select id from auth.users where email = 'bank@example.com');

-- ---- ตั้งเป็น AGENCY: หน่วยนวัตกรรม (NIA/depa) ----
update public.profiles
set role = 'agency',
    agency_name = 'NIA / depa',
    agency_categories = '{innovation,upskill}'
where id = (select id from auth.users where email = 'innovation@example.com');

-- ---- ตัวอย่างหน่วยงานรับหลายด้าน ----
-- agency_categories = '{marketing,production,management}'
