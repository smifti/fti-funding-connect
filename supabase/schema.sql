-- =====================================================================
-- FTI SME Funding Connect — Database Schema (Supabase / PostgreSQL)
-- รองรับ: Auth หลายสิทธิ์ + Row Level Security (RLS)
-- =====================================================================
-- บทบาท (roles):
--   sme        : ผู้ประกอบการ — เห็นเฉพาะข้อมูล/คำขอของตัวเอง
--   agency     : หน่วยงาน (ธนาคาร/NIA/depa ฯลฯ) — เห็นเฉพาะ SME ที่เลือก "ด้าน" ตรงกับหน่วยงานตน
--   expert     : ที่ปรึกษา/ผู้เชี่ยวชาญ — คัดกรอง จัดกลุ่ม ส่งต่อ
--   admin      : ส.อ.ท./FTI — เห็นทั้งหมด, dashboard ภาพรวม
-- =====================================================================

-- ---------- ENUM types ----------
create type user_role as enum ('sme', 'agency', 'expert', 'admin');

-- 7 ด้านที่ SME ขอรับการสนับสนุน (ตามภาพ ขั้นตอน 2)
create type support_category as enum (
  'credit',        -- สินเชื่อ
  'innovation',    -- นวัตกรรม
  'management',    -- บริหารจัดการ
  'marketing',     -- การตลาด
  'production',    -- การผลิต
  'upskill',       -- Upskill / Reskill
  'other'          -- อื่น ๆ (สิ่งแวดล้อม / ESG)
);

create type request_status as enum (
  'submitted',     -- ยื่นแล้ว รอคัดกรอง
  'screening',     -- ผู้เชี่ยวชาญกำลังคัดกรอง
  'forwarded',     -- ส่งต่อหน่วยงานแล้ว
  'in_review',     -- หน่วยงานกำลังพิจารณา
  'approved',      -- สำเร็จ / อนุมัติ
  'rejected'       -- ไม่ผ่าน
);

-- =====================================================================
-- 1) PROFILES — ผูกกับ auth.users (1:1)
-- =====================================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role not null default 'sme',
  full_name    text,
  phone        text,
  -- สำหรับ role = agency: หน่วยงานนี้รับผิดชอบด้านใดบ้าง
  agency_name  text,
  agency_categories support_category[] default '{}',
  created_at   timestamptz not null default now()
);

-- =====================================================================
-- 2) SME_PROFILES — โปรไฟล์ผู้ประกอบการ (ขั้นตอน 1, 4)
-- =====================================================================
create table public.sme_profiles (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  sme_one_id   text unique,                 -- เทียบกับ SME ONE ID
  company_name text not null,
  tax_id       text,
  business_type text,
  province     text,
  created_at   timestamptz not null default now()
);
create index on public.sme_profiles(owner_id);

-- =====================================================================
-- 3) HEALTH_CHECKS — แบบประเมิน 5 ด้าน (ขั้นตอน 3)
-- =====================================================================
create table public.health_checks (
  id           uuid primary key default gen_random_uuid(),
  sme_id       uuid not null references public.sme_profiles(id) on delete cascade,
  score_finance     int check (score_finance between 0 and 100),
  score_marketing   int check (score_marketing between 0 and 100),
  score_operations  int check (score_operations between 0 and 100),
  score_hr          int check (score_hr between 0 and 100),
  score_innovation  int check (score_innovation between 0 and 100),
  strengths    text,
  weaknesses   text,
  recommendation text,
  created_at   timestamptz not null default now()
);
create index on public.health_checks(sme_id);

-- =====================================================================
-- 4) FUNDING_REQUESTS — คำขอรับการสนับสนุน (ขั้นตอน 2, 4, 6)
-- =====================================================================
create table public.funding_requests (
  id           uuid primary key default gen_random_uuid(),
  sme_id       uuid not null references public.sme_profiles(id) on delete cascade,
  category     support_category not null,
  status       request_status not null default 'submitted',
  detail       text,
  -- หน่วยงานที่รับเรื่อง (set เมื่อ forwarded)
  assigned_agency uuid references public.profiles(id),
  -- ผู้เชี่ยวชาญที่คัดกรอง
  screened_by  uuid references public.profiles(id),
  expert_note  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- ป้องกันรับซ้ำ: SME 1 ราย ขอด้านเดียวกันที่ยังไม่ปิด ได้แค่ 1 คำขอ
  unique (sme_id, category)
);
create index on public.funding_requests(sme_id);
create index on public.funding_requests(category);
create index on public.funding_requests(status);
create index on public.funding_requests(assigned_agency);

-- =====================================================================
-- 5) STATUS_HISTORY — ติดตามแบบ real-time (ขั้นตอน 6)
-- =====================================================================
create table public.status_history (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.funding_requests(id) on delete cascade,
  old_status   request_status,
  new_status   request_status not null,
  changed_by   uuid references public.profiles(id),
  note         text,
  created_at   timestamptz not null default now()
);
create index on public.status_history(request_id);

-- =====================================================================
-- TRIGGERS
-- =====================================================================
-- สร้าง profile อัตโนมัติเมื่อมี user ใหม่ (default role = sme)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'sme', new.raw_user_meta_data->>'full_name');
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- บันทึกประวัติทุกครั้งที่ status เปลี่ยน + อัปเดต updated_at
create or replace function public.log_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into public.status_history (request_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end; $$;

create trigger trg_log_status
  before update on public.funding_requests
  for each row execute function public.log_status_change();

-- =====================================================================
-- HELPER: ดึง role ของ user ปัจจุบัน (ใช้ใน RLS)
-- =====================================================================
create or replace function public.my_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_agency_categories()
returns support_category[] language sql stable security definer set search_path = public as $$
  select coalesce(agency_categories, '{}') from public.profiles where id = auth.uid();
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.sme_profiles       enable row level security;
alter table public.health_checks      enable row level security;
alter table public.funding_requests   enable row level security;
alter table public.status_history     enable row level security;

-- ---------- profiles ----------
create policy "own profile read"   on public.profiles
  for select using (id = auth.uid() or public.my_role() in ('admin','expert'));
create policy "own profile update" on public.profiles
  for update using (id = auth.uid());
create policy "admin manage profiles" on public.profiles
  for all using (public.my_role() = 'admin');

-- ---------- sme_profiles ----------
-- SME เห็นของตัวเอง / expert + admin เห็นทั้งหมด / agency เห็นเฉพาะที่มีคำขอตรงด้านตน
create policy "sme own profile" on public.sme_profiles
  for all using (
    owner_id = auth.uid()
    or public.my_role() in ('admin','expert')
    or (public.my_role() = 'agency' and exists (
        select 1 from public.funding_requests fr
        where fr.sme_id = sme_profiles.id
          and fr.category = any (public.my_agency_categories())
    ))
  );

-- ---------- health_checks ----------
create policy "health check access" on public.health_checks
  for all using (
    public.my_role() in ('admin','expert')
    or exists (select 1 from public.sme_profiles s
               where s.id = health_checks.sme_id and s.owner_id = auth.uid())
    or (public.my_role() = 'agency' and exists (
        select 1 from public.funding_requests fr
        where fr.sme_id = health_checks.sme_id
          and fr.category = any (public.my_agency_categories())
    ))
  );

-- ---------- funding_requests ----------
-- SME: คำขอของตัวเอง (อ่าน/สร้าง/แก้ตอนยังไม่ส่งต่อ)
create policy "sme own requests read" on public.funding_requests
  for select using (
    exists (select 1 from public.sme_profiles s
            where s.id = funding_requests.sme_id and s.owner_id = auth.uid())
    or public.my_role() in ('admin','expert')
    or (public.my_role() = 'agency'
        and category = any (public.my_agency_categories()))
  );
create policy "sme create request" on public.funding_requests
  for insert with check (
    exists (select 1 from public.sme_profiles s
            where s.id = funding_requests.sme_id and s.owner_id = auth.uid())
  );
-- expert คัดกรอง/ส่งต่อ, agency อัปเดตสถานะด้านตน, admin ทำได้ทุกอย่าง
create policy "expert screen" on public.funding_requests
  for update using (public.my_role() in ('expert','admin'));
create policy "agency update own category" on public.funding_requests
  for update using (
    public.my_role() = 'agency'
    and category = any (public.my_agency_categories())
  );

-- ---------- status_history ----------
create policy "status history read" on public.status_history
  for select using (
    public.my_role() in ('admin','expert')
    or exists (
      select 1 from public.funding_requests fr
      join public.sme_profiles s on s.id = fr.sme_id
      where fr.id = status_history.request_id and s.owner_id = auth.uid())
    or (public.my_role() = 'agency' and exists (
        select 1 from public.funding_requests fr
        where fr.id = status_history.request_id
          and fr.category = any (public.my_agency_categories())))
  );
