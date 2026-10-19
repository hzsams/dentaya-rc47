-- DentAYA MVP UX + Finance v5
-- Bu migration canlı DentAYA Supabase projesine 2026-09-19 tarihinde uygulanmıştır.
-- Kaynak kontrol / proje geçmişi için bu pakette tutulur.

alter table public.user_preferences
  drop constraint if exists user_preferences_theme_check;

alter table public.user_preferences
  add constraint user_preferences_theme_check
  check (
    theme in (
      'midnight','ocean','emerald','violet','graphite','light',
      'cobalt','aurora','rose','amber','frost','obsidian',
      'teal','navy','sand','pearl','plum','slate',
      'mint','sky','lavender','ivory','blush','sage'
    )
  );

create table if not exists public.lab_case_quotes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  lab_org_id uuid not null references public.organizations(id) on delete cascade,
  clinic_org_id uuid not null references public.organizations(id) on delete cascade,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD')),
  status text not null default 'draft'
    check (status in ('draft','sent','accepted','rejected')),
  basis jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lab_case_quotes_lab_idx
  on public.lab_case_quotes(lab_org_id, updated_at desc);

create index if not exists lab_case_quotes_clinic_idx
  on public.lab_case_quotes(clinic_org_id, updated_at desc);

alter table public.lab_case_quotes enable row level security;

drop policy if exists lab_case_quotes_select_participants on public.lab_case_quotes;
create policy lab_case_quotes_select_participants
on public.lab_case_quotes for select
using (
  public.is_org_member(lab_org_id)
  or public.is_org_member(clinic_org_id)
);

drop policy if exists lab_case_quotes_insert_lab on public.lab_case_quotes;
create policy lab_case_quotes_insert_lab
on public.lab_case_quotes for insert
with check (
  public.is_org_role(lab_org_id, array['owner','admin','technician']::text[])
  and exists (
    select 1 from public.cases c
    where c.id = lab_case_quotes.case_id
      and c.lab_org_id = lab_case_quotes.lab_org_id
      and c.clinic_org_id = lab_case_quotes.clinic_org_id
  )
);

drop policy if exists lab_case_quotes_update_lab on public.lab_case_quotes;
create policy lab_case_quotes_update_lab
on public.lab_case_quotes for update
using (
  public.is_org_role(lab_org_id, array['owner','admin','technician']::text[])
)
with check (
  public.is_org_role(lab_org_id, array['owner','admin','technician']::text[])
  and exists (
    select 1 from public.cases c
    where c.id = lab_case_quotes.case_id
      and c.lab_org_id = lab_case_quotes.lab_org_id
      and c.clinic_org_id = lab_case_quotes.clinic_org_id
  )
);

create table if not exists public.clinic_case_finance (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  clinic_org_id uuid not null references public.organizations(id) on delete cascade,
  patient_price numeric(12,2) not null default 0 check (patient_price >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','EUR','USD')),
  payment_status text not null default 'quote'
    check (payment_status in ('quote','pending','partial','paid','cancelled')),
  overhead_pct numeric(6,2) not null default 20 check (overhead_pct >= 0 and overhead_pct <= 500),
  target_margin_pct numeric(6,2) not null default 35 check (target_margin_pct >= 0 and target_margin_pct < 100),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clinic_case_finance_clinic_idx
  on public.clinic_case_finance(clinic_org_id, updated_at desc);

alter table public.clinic_case_finance enable row level security;

drop policy if exists clinic_case_finance_select_clinic on public.clinic_case_finance;
create policy clinic_case_finance_select_clinic
on public.clinic_case_finance for select
using (public.is_org_member(clinic_org_id));

drop policy if exists clinic_case_finance_insert_clinic on public.clinic_case_finance;
create policy clinic_case_finance_insert_clinic
on public.clinic_case_finance for insert
with check (
  public.is_org_role(clinic_org_id, array['owner','admin','dentist','assistant']::text[])
  and exists (
    select 1 from public.cases c
    where c.id = clinic_case_finance.case_id
      and c.clinic_org_id = clinic_case_finance.clinic_org_id
  )
);

drop policy if exists clinic_case_finance_update_clinic on public.clinic_case_finance;
create policy clinic_case_finance_update_clinic
on public.clinic_case_finance for update
using (
  public.is_org_role(clinic_org_id, array['owner','admin','dentist','assistant']::text[])
)
with check (
  public.is_org_role(clinic_org_id, array['owner','admin','dentist','assistant']::text[])
  and exists (
    select 1 from public.cases c
    where c.id = clinic_case_finance.case_id
      and c.clinic_org_id = clinic_case_finance.clinic_org_id
  )
);

alter table public.lab_case_quotes
  add constraint lab_case_quotes_notes_length_check
  check (notes is null or char_length(notes) <= 2000);

alter table public.clinic_case_finance
  add constraint clinic_case_finance_notes_length_check
  check (notes is null or char_length(notes) <= 2000);

drop trigger if exists lab_case_quotes_guard_identity on public.lab_case_quotes;
create trigger lab_case_quotes_guard_identity
before update on public.lab_case_quotes
for each row execute function public.enforce_update_columns(
  'amount', 'currency', 'status', 'basis', 'notes', 'updated_by', 'updated_at'
);

drop trigger if exists lab_case_quotes_set_updated_at on public.lab_case_quotes;
create trigger lab_case_quotes_set_updated_at
before update on public.lab_case_quotes
for each row execute function public.set_updated_at();

drop trigger if exists clinic_case_finance_guard_identity on public.clinic_case_finance;
create trigger clinic_case_finance_guard_identity
before update on public.clinic_case_finance
for each row execute function public.enforce_update_columns(
  'patient_price', 'discount_amount', 'paid_amount', 'currency', 'payment_status',
  'overhead_pct', 'target_margin_pct', 'notes', 'updated_by', 'updated_at'
);

drop trigger if exists clinic_case_finance_set_updated_at on public.clinic_case_finance;
create trigger clinic_case_finance_set_updated_at
before update on public.clinic_case_finance
for each row execute function public.set_updated_at();

create or replace function public.notify_lab_quote_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.emit_org_notification(
    new.clinic_org_id,
    case when new.status = 'sent' then 'Laboratuvar fiyatı hazır' else 'Laboratuvar fiyatı güncellendi' end,
    'Vaka teklifi ' || new.amount::text || ' ' || new.currency || ' · ' || new.status,
    case when new.status = 'sent' then 'success' else 'info' end,
    'lab_case_quote',
    new.id,
    'finance',
    '/cases/' || new.case_id::text || '?tab=finance',
    'lab-quote:' || new.id::text || ':' || new.status || ':' || extract(epoch from new.updated_at)::bigint::text
  );
  return new;
end;
$$;

revoke all on function public.notify_lab_quote_change() from public, anon, authenticated;
drop trigger if exists trg_notify_lab_quote_change on public.lab_case_quotes;
create trigger trg_notify_lab_quote_change
after insert or update of status, amount on public.lab_case_quotes
for each row execute function public.notify_lab_quote_change();
