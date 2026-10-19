-- DentAYA MVP v6 Step 3 — Onboarding
-- Canlı Supabase projesine uygulanmıştır.

create table if not exists public.user_onboarding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_snapshot text,
  completed boolean not null default false,
  dismissed boolean not null default false,
  current_step integer not null default 0 check (current_step >= 0 and current_step <= 20),
  completed_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, organization_id)
);

create index if not exists user_onboarding_user_org_idx
  on public.user_onboarding(user_id, organization_id);

alter table public.user_onboarding enable row level security;

create policy user_onboarding_select_self
on public.user_onboarding for select
using (
  auth.uid() = user_id
  and public.is_org_member(organization_id)
);

create policy user_onboarding_insert_self
on public.user_onboarding for insert
with check (
  auth.uid() = user_id
  and public.is_org_member(organization_id)
);

create policy user_onboarding_update_self
on public.user_onboarding for update
using (
  auth.uid() = user_id
  and public.is_org_member(organization_id)
)
with check (
  auth.uid() = user_id
  and public.is_org_member(organization_id)
);
