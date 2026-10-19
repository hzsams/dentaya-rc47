create table if not exists public.pre_registrations (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 1 and 100),
 email text not null unique check (char_length(email) <= 254),
 role text not null check (role in ('clinic','laboratory','other')),
 consent_version text not null,
 created_at timestamptz not null default now()
);
alter table public.pre_registrations enable row level security;
revoke all on public.pre_registrations from anon, authenticated;
grant all on public.pre_registrations to service_role;
