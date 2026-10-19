-- DentAYA RC13: organization operations control center settings.

create table if not exists public.organization_operations_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  daily_case_capacity integer not null default 24,
  warning_load_percent integer not null default 80,
  target_turnaround_hours integer not null default 72,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_operations_capacity_check check (daily_case_capacity between 1 and 500),
  constraint organization_operations_warning_check check (warning_load_percent between 40 and 100),
  constraint organization_operations_turnaround_check check (target_turnaround_hours between 1 and 720)
);

alter table public.organization_operations_settings enable row level security;

create index if not exists organization_operations_settings_updated_idx
  on public.organization_operations_settings(updated_at desc);

drop policy if exists organization_operations_settings_select_members on public.organization_operations_settings;
create policy organization_operations_settings_select_members
on public.organization_operations_settings for select
using (public.is_org_member(organization_id));

drop policy if exists organization_operations_settings_insert_admin on public.organization_operations_settings;
create policy organization_operations_settings_insert_admin
on public.organization_operations_settings for insert
with check (
  public.is_org_role(organization_id, array['owner','admin'])
  and created_by = (select auth.uid())
  and updated_by = (select auth.uid())
);

drop policy if exists organization_operations_settings_update_admin on public.organization_operations_settings;
create policy organization_operations_settings_update_admin
on public.organization_operations_settings for update
using (public.is_org_role(organization_id, array['owner','admin']))
with check (
  public.is_org_role(organization_id, array['owner','admin'])
  and updated_by = (select auth.uid())
);

drop trigger if exists organization_operations_settings_set_updated_at on public.organization_operations_settings;
create trigger organization_operations_settings_set_updated_at
before update on public.organization_operations_settings
for each row execute function public.set_updated_at();
