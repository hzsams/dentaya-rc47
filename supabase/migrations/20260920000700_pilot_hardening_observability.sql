-- DentAYA RC12: pilot hardening / operational observability.
-- Adds append-only, organization-scoped operational telemetry with a server-stamped RPC.

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  severity text not null default 'error' check (severity in ('info', 'warning', 'error', 'critical')),
  source text not null default 'client' check (source in ('client', 'route', 'network', 'api', 'system')),
  message text not null,
  error_code text,
  route text,
  request_id uuid,
  details jsonb not null default '{}'::jsonb,
  client_created_at timestamptz,
  created_at timestamptz not null default now(),
  constraint operational_events_event_type_length check (char_length(btrim(event_type)) between 2 and 80),
  constraint operational_events_message_length check (char_length(btrim(message)) between 1 and 2000),
  constraint operational_events_error_code_length check (error_code is null or char_length(error_code) <= 120),
  constraint operational_events_route_length check (route is null or char_length(route) <= 500),
  constraint operational_events_details_size check (octet_length(details::text) <= 16384)
);

create index if not exists operational_events_org_created_idx
  on public.operational_events(organization_id, created_at desc);
create index if not exists operational_events_severity_created_idx
  on public.operational_events(severity, created_at desc);
create index if not exists operational_events_type_created_idx
  on public.operational_events(event_type, created_at desc);

alter table public.operational_events enable row level security;

revoke all on table public.operational_events from public, anon, authenticated;
grant select on table public.operational_events to authenticated;
grant all on table public.operational_events to service_role;

drop policy if exists operational_events_select_admins on public.operational_events;
create policy operational_events_select_admins
on public.operational_events
for select
to authenticated
using (
  organization_id is not null
  and exists (
    select 1
    from public.memberships m
    where m.organization_id = operational_events.organization_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  )
);

create or replace function public.dentaya_log_operational_event(
  p_event_type text,
  p_severity text default 'error',
  p_source text default 'client',
  p_message text default 'Operational event',
  p_error_code text default null,
  p_route text default null,
  p_request_id uuid default null,
  p_details jsonb default '{}'::jsonb,
  p_client_created_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_id uuid;
  v_event_type text := left(btrim(coalesce(p_event_type, '')), 80);
  v_message text := left(btrim(coalesce(p_message, '')), 2000);
  v_details jsonb := coalesce(p_details, '{}'::jsonb);
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if char_length(v_event_type) < 2 then
    raise exception 'INVALID_OPERATIONAL_EVENT_TYPE';
  end if;

  if p_severity not in ('info', 'warning', 'error', 'critical') then
    raise exception 'INVALID_OPERATIONAL_EVENT_SEVERITY';
  end if;

  if p_source not in ('client', 'route', 'network', 'api', 'system') then
    raise exception 'INVALID_OPERATIONAL_EVENT_SOURCE';
  end if;

  if char_length(v_message) < 1 then
    v_message := 'Operational event';
  end if;

  if octet_length(v_details::text) > 16384 then
    v_details := jsonb_build_object('truncated', true);
  end if;

  select m.organization_id
  into v_org_id
  from public.memberships m
  where m.user_id = v_user_id
    and m.status = 'active'
  order by m.created_at asc
  limit 1;

  insert into public.operational_events(
    organization_id,
    user_id,
    event_type,
    severity,
    source,
    message,
    error_code,
    route,
    request_id,
    details,
    client_created_at
  ) values (
    v_org_id,
    v_user_id,
    v_event_type,
    p_severity,
    p_source,
    v_message,
    nullif(left(btrim(coalesce(p_error_code, '')), 120), ''),
    nullif(left(btrim(coalesce(p_route, '')), 500), ''),
    p_request_id,
    v_details,
    p_client_created_at
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.dentaya_log_operational_event(text,text,text,text,text,text,uuid,jsonb,timestamptz) from public, anon;
grant execute on function public.dentaya_log_operational_event(text,text,text,text,text,text,uuid,jsonb,timestamptz) to authenticated, service_role;
