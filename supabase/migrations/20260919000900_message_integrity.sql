-- DentAYA MVP RC1: stamp trusted message sender metadata and validate case context.

create or replace function public.stamp_org_message_sender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  new.sender_user_id := v_uid;

  select m.role
    into new.sender_role
  from public.memberships m
  where m.user_id = v_uid
    and m.organization_id = new.sender_org_id
    and m.status = 'active'
    and m.role in ('owner','admin','dentist','assistant','technician')
  limit 1;

  if new.sender_role is null then
    raise exception 'Message write access denied';
  end if;

  select coalesce(p.full_name, new.sender_name, 'DentAYA User')
    into new.sender_name
  from public.profiles p
  where p.id = v_uid;

  if new.sender_name is null then
    new.sender_name := 'DentAYA User';
  end if;

  return new;
end;
$$;

revoke all on function public.stamp_org_message_sender() from public, anon, authenticated;

drop trigger if exists trg_stamp_org_message_sender
on public.organization_messages;

create trigger trg_stamp_org_message_sender
before insert on public.organization_messages
for each row execute function public.stamp_org_message_sender();

drop policy if exists org_messages_participant_insert
on public.organization_messages;

create policy org_messages_participant_insert
on public.organization_messages
for insert
with check (
  auth.uid() = sender_user_id
  and public.is_org_member(sender_org_id)
  and exists (
    select 1
    from public.organization_conversations c
    where c.id = organization_messages.conversation_id
      and sender_org_id in (c.clinic_org_id, c.lab_org_id)
      and (
        public.is_org_member(c.clinic_org_id)
        or public.is_org_member(c.lab_org_id)
      )
      and (
        organization_messages.context_case_id is null
        or exists (
          select 1
          from public.cases ca
          where ca.id = organization_messages.context_case_id
            and ca.clinic_org_id = c.clinic_org_id
            and ca.lab_org_id = c.lab_org_id
        )
      )
  )
);
