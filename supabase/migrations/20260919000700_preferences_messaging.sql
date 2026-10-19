-- DentAYA MVP RC1: appearance + professional clinic/lab messaging metadata.

alter table public.user_preferences
  drop constraint if exists user_preferences_theme_check;

alter table public.user_preferences
  add constraint user_preferences_theme_check
  check (
    theme in (
      'midnight','ocean','emerald','violet','graphite','light',
      'cobalt','aurora','rose','amber','frost','obsidian',
      'teal','navy','sand','pearl','plum','slate'
    )
  );

alter table public.user_preferences
  add column if not exists custom_accent text,
  add column if not exists use_custom_accent boolean not null default false;

alter table public.user_preferences
  drop constraint if exists user_preferences_custom_accent_check;

alter table public.user_preferences
  add constraint user_preferences_custom_accent_check
  check (
    custom_accent is null
    or custom_accent ~ '^#[0-9A-Fa-f]{6}$'
  );

alter table public.organization_messages
  add column if not exists sender_role text,
  add column if not exists context_case_id uuid references public.cases(id) on delete set null;

create index if not exists organization_messages_context_case_idx
  on public.organization_messages(context_case_id, created_at desc);
