-- DentAYA Production RC6 — Atomic lab/clinic case actions
-- Moves the remaining primary case actions behind one transactional RPC so
-- status + audit event cannot diverge.

create or replace function public.dentaya_transition_case(
  p_case_id uuid,
  p_next_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_case public.cases%rowtype;
  v_event_type text;
  v_message text;
  v_actor_org_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_case
  from public.cases
  where id = p_case_id
  for update;

  if not found then
    raise exception 'Case not found.' using errcode = 'P0002';
  end if;

  if v_case.status = 'new' and p_next_status = 'accepted' then
    if not public.is_org_role(v_case.lab_org_id, array['owner', 'admin', 'technician']) then
      raise exception 'Only the assigned laboratory can accept this case.' using errcode = '42501';
    end if;
    v_event_type := 'case_accepted';
    v_message := 'Laboratuvar vakayı kabul etti.';
    v_actor_org_id := v_case.lab_org_id;

  elsif v_case.status = 'production' and p_next_status = 'qc' then
    if not public.is_org_role(v_case.lab_org_id, array['owner', 'admin', 'technician']) then
      raise exception 'Only the assigned laboratory can complete production.' using errcode = '42501';
    end if;
    v_event_type := 'production_completed';
    v_message := 'Üretim tamamlandı ve vaka kalite kontrol aşamasına geçti.';
    v_actor_org_id := v_case.lab_org_id;

  elsif v_case.status = 'qc' and p_next_status = 'ready' then
    if not public.is_org_role(v_case.lab_org_id, array['owner', 'admin', 'technician']) then
      raise exception 'Only the assigned laboratory can complete quality control.' using errcode = '42501';
    end if;
    v_event_type := 'qc_completed';
    v_message := 'Kalite kontrol tamamlandı. Vaka teslimata hazır.';
    v_actor_org_id := v_case.lab_org_id;

  elsif p_next_status = 'cancelled'
    and v_case.status not in ('shipped', 'delivered', 'cancelled') then
    if not public.is_org_role(v_case.clinic_org_id, array['owner', 'admin', 'dentist']) then
      raise exception 'Only the clinic can cancel this case.' using errcode = '42501';
    end if;
    v_event_type := 'case_cancelled';
    v_message := 'Vaka klinik tarafından iptal edildi.';
    v_actor_org_id := v_case.clinic_org_id;

  else
    raise exception 'Unsupported DentAYA case action: % -> %', v_case.status, p_next_status
      using errcode = '23514';
  end if;

  update public.cases
  set status = p_next_status,
      updated_by = v_uid,
      updated_at = now()
  where id = v_case.id;

  insert into public.case_events(
    case_id,
    event_type,
    from_status,
    to_status,
    message,
    created_by,
    actor_label,
    actor_org_id
  ) values (
    v_case.id,
    v_event_type,
    v_case.status,
    p_next_status,
    v_message,
    v_uid,
    coalesce((select p.full_name from public.profiles p where p.id = v_uid), 'DentAYA Kullanıcısı'),
    v_actor_org_id
  );

  return p_next_status;
end;
$$;

revoke all on function public.dentaya_transition_case(uuid, text) from public, anon;
grant execute on function public.dentaya_transition_case(uuid, text) to authenticated;
