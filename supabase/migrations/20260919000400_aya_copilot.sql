-- DentAYA MVP v6 Step 10 — AYA Copilot
-- Canlı Supabase projesine uygulanmıştır.

alter table public.ai_sessions
  add column if not exists assistant_mode text not null default 'local',
  add column if not exists model_name text,
  add column if not exists action_key text,
  add column if not exists context_summary jsonb not null default '{}'::jsonb;

alter table public.ai_sessions
  drop constraint if exists ai_sessions_assistant_mode_check;

alter table public.ai_sessions
  add constraint ai_sessions_assistant_mode_check
  check (assistant_mode in ('local','model'));

create index if not exists ai_sessions_org_case_created_idx
  on public.ai_sessions(organization_id,case_id,created_at desc);
