-- DentAYA MVP v6 Step 2 — Smart Notifications
-- Bu migration canlı Supabase projesine uygulanmıştır.
-- Bu dosya kaynak kontrol / proje geçmişi içindir.

alter table public.notifications
  add column if not exists category text not null default 'system',
  add column if not exists action_path text,
  add column if not exists dedupe_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.notifications
  drop constraint if exists notifications_category_check;

alter table public.notifications
  add constraint notifications_category_check
  check (category in ('case','design','finance','delivery','message','system'));

alter table public.notifications
  drop constraint if exists notifications_dedupe_key_key;

alter table public.notifications
  add constraint notifications_dedupe_key_key unique (dedupe_key);

create or replace function public.emit_org_notification(
  p_organization_id uuid,
  p_title text,
  p_body text,
  p_severity text,
  p_entity_type text,
  p_entity_id uuid,
  p_category text,
  p_action_path text,
  p_dedupe_key text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications(
    organization_id,
    recipient_user_id,
    title,
    body,
    severity,
    entity_type,
    entity_id,
    category,
    action_path,
    dedupe_key
  )
  select
    p_organization_id,
    m.user_id,
    left(p_title, 180),
    left(p_body, 2000),
    p_severity,
    p_entity_type,
    p_entity_id,
    p_category,
    p_action_path,
    p_dedupe_key || ':' || m.user_id::text
  from public.memberships m
  where m.organization_id = p_organization_id
    and m.status = 'active'
  on conflict (dedupe_key) do nothing;
$$;

revoke all on function public.emit_org_notification(uuid, text, text, text, text, uuid, text, text, text)
from public, anon, authenticated;

create or replace function public.notify_case_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_body text;
  v_severity text := case when new.priority in ('high', 'urgent') then 'warning' else 'info' end;
  v_key text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  v_title := case when tg_op = 'INSERT' then 'Yeni vaka' else 'Vaka durumu güncellendi' end;
  v_body := new.case_number || ' · ' || new.title || ' · ' || new.status;
  v_key := 'case:' || new.id::text || ':' || new.status || ':' || extract(epoch from new.updated_at)::bigint::text;

  perform public.emit_org_notification(
    new.clinic_org_id, v_title, v_body, v_severity,
    'case', new.id, 'case', '/cases/' || new.id::text, v_key || ':clinic'
  );

  if new.lab_org_id is not null then
    perform public.emit_org_notification(
      new.lab_org_id, v_title, v_body, v_severity,
      'case', new.id, 'case', '/cases/' || new.id::text, v_key || ':lab'
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_design_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic_id uuid;
begin
  select c.clinic_org_id into v_clinic_id from public.cases c where c.id = new.case_id;
  perform public.emit_org_notification(
    v_clinic_id,
    'Tasarım onayı bekliyor',
    'v' || new.version_number::text || ' tasarım sürümü incelemeye gönderildi.',
    'warning',
    'case_design_review',
    new.id,
    'design',
    '/cases/' || new.case_id::text || '?tab=cad',
    'design-review:' || new.id::text
  );
  return new;
end;
$$;

create or replace function public.notify_case_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case public.cases%rowtype;
  v_target uuid;
begin
  select * into v_case from public.cases where id = new.case_id;
  v_target := case when new.sender_org_id = v_case.clinic_org_id then v_case.lab_org_id else v_case.clinic_org_id end;
  if v_target is not null then
    perform public.emit_org_notification(
      v_target,
      'Yeni vaka mesajı',
      coalesce(new.sender_name, 'Ekip üyesi') || ': ' || left(new.body, 160),
      'info',
      'case_message',
      new.id,
      'message',
      '/cases/' || new.case_id::text || '?tab=messages',
      'case-message:' || new.id::text
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_organization_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.organization_conversations%rowtype;
  v_target uuid;
begin
  select * into v_conversation from public.organization_conversations where id = new.conversation_id;
  v_target := case when new.sender_org_id = v_conversation.clinic_org_id then v_conversation.lab_org_id else v_conversation.clinic_org_id end;
  perform public.emit_org_notification(
    v_target,
    'Yeni kurum mesajı',
    coalesce(new.sender_name, 'Ekip üyesi') || ': ' || left(new.body, 160),
    'info',
    'organization_message',
    new.id,
    'message',
    '/messages?conversation=' || new.conversation_id::text,
    'organization-message:' || new.id::text
  );
  return new;
end;
$$;

create or replace function public.notify_shipment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  foreach v_org_id in array array[new.from_org_id, new.to_org_id, new.courier_org_id] loop
    if v_org_id is not null then
      perform public.emit_org_notification(
        v_org_id,
        'Teslimat durumu güncellendi',
        coalesce(new.tracking_code, 'Gönderi') || ' · ' || new.status,
        case when new.status = 'delivered' then 'success' else 'info' end,
        'shipment',
        new.id,
        'delivery',
        '/logistics',
        'shipment:' || new.id::text || ':' || new.status || ':' || v_org_id::text
      );
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.notify_case_change() from public, anon, authenticated;
revoke all on function public.notify_design_review() from public, anon, authenticated;
revoke all on function public.notify_case_message() from public, anon, authenticated;
revoke all on function public.notify_organization_message() from public, anon, authenticated;
revoke all on function public.notify_shipment_change() from public, anon, authenticated;

drop trigger if exists trg_notify_case_change on public.cases;
create trigger trg_notify_case_change
after insert or update of status on public.cases
for each row execute function public.notify_case_change();

drop trigger if exists trg_notify_design_review on public.case_design_reviews;
create trigger trg_notify_design_review
after insert on public.case_design_reviews
for each row execute function public.notify_design_review();

drop trigger if exists trg_notify_case_message on public.case_messages;
create trigger trg_notify_case_message
after insert on public.case_messages
for each row execute function public.notify_case_message();

drop trigger if exists trg_notify_organization_message on public.organization_messages;
create trigger trg_notify_organization_message
after insert on public.organization_messages
for each row execute function public.notify_organization_message();

drop trigger if exists trg_notify_shipment_change on public.shipments;
create trigger trg_notify_shipment_change
after insert or update of status on public.shipments
for each row execute function public.notify_shipment_change();
