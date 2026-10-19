-- DentAYA Production RC5 — End-to-end workflow lock
-- Hardens clinic → lab → CAD approval → production → courier → delivery.

create unique index if not exists shipments_one_active_per_case_idx
  on public.shipments(case_id)
  where status in ('created', 'pickup_requested', 'picked_up', 'in_transit');

create or replace function public.guard_case_status_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed boolean := false;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'new' and new.status = 'accepted' then
    v_allowed := public.is_org_role(old.lab_org_id, array['owner', 'admin', 'technician']);
  elsif old.status in ('accepted', 'design') and new.status = 'approval' then
    v_allowed := public.is_org_role(old.lab_org_id, array['owner', 'admin', 'technician']);
  elsif old.status = 'approval' and new.status in ('production', 'design') then
    v_allowed := public.is_org_role(old.clinic_org_id, array['owner', 'admin', 'dentist']);
  elsif old.status = 'production' and new.status = 'qc' then
    v_allowed := public.is_org_role(old.lab_org_id, array['owner', 'admin', 'technician']);
  elsif old.status = 'qc' and new.status = 'ready' then
    v_allowed := public.is_org_role(old.lab_org_id, array['owner', 'admin', 'technician']);
  elsif old.status = 'ready' and new.status = 'shipped' then
    v_allowed := exists (
      select 1 from public.shipments s
      where s.case_id = old.id
        and s.status in ('picked_up', 'in_transit', 'delivered')
    );
  elsif old.status = 'shipped' and new.status = 'delivered' then
    v_allowed := exists (
      select 1 from public.shipments s
      where s.case_id = old.id
        and s.status = 'delivered'
    );
  elsif new.status = 'cancelled' and old.status not in ('shipped', 'delivered', 'cancelled') then
    v_allowed := public.is_org_role(old.clinic_org_id, array['owner', 'admin', 'dentist']);
  end if;

  if not v_allowed then
    raise exception 'Invalid DentAYA case transition: % -> %', old.status, new.status
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_case_status_transition() from public, anon, authenticated;

drop trigger if exists cases_guard_status_transition on public.cases;
create trigger cases_guard_status_transition
before update of status on public.cases
for each row execute function public.guard_case_status_transition();

create or replace function public.guard_shipment_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_valid_courier boolean;
  v_valid_driver boolean;
begin
  if new.courier_org_id is not null then
    select exists (
      select 1 from public.organizations o
      where o.id = new.courier_org_id
        and o.org_type = 'courier'
        and o.directory_visible
    ) into v_valid_courier;

    if not v_valid_courier then
      raise exception 'Selected courier organization is unavailable.' using errcode = '23514';
    end if;
  end if;

  if new.courier_driver_id is not null then
    select exists (
      select 1 from public.courier_drivers d
      where d.id = new.courier_driver_id
        and d.organization_id = new.courier_org_id
        and d.status in ('available', 'assigned')
    ) into v_valid_driver;

    if not v_valid_driver then
      raise exception 'Selected courier driver is unavailable for this courier organization.' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('created', 'pickup_requested') then
      raise exception 'New shipments must start as created or pickup_requested.' using errcode = '23514';
    end if;
    if new.status = 'pickup_requested' and new.courier_org_id is null then
      raise exception 'pickup_requested shipments require a courier organization.' using errcode = '23514';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'created' and new.status in ('pickup_requested', 'cancelled'))
      or (old.status = 'pickup_requested' and new.status in ('picked_up', 'cancelled'))
      or (old.status = 'picked_up' and new.status in ('in_transit', 'cancelled'))
      or (old.status = 'in_transit' and new.status in ('delivered', 'cancelled'))
    ) then
      raise exception 'Invalid DentAYA shipment transition: % -> %', old.status, new.status using errcode = '23514';
    end if;

    if new.status in ('pickup_requested', 'picked_up', 'in_transit', 'delivered') and new.courier_org_id is null then
      raise exception 'This shipment status requires a courier organization.' using errcode = '23514';
    end if;

    if new.status in ('picked_up', 'in_transit', 'delivered') and new.courier_driver_id is null then
      raise exception 'Select a courier driver before pickup.' using errcode = '23514';
    end if;

    if new.status = 'picked_up' and new.pickup_at is null then new.pickup_at := now(); end if;
    if new.status = 'delivered' and new.delivered_at is null then new.delivered_at := now(); end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_shipment_transition() from public, anon, authenticated;

drop trigger if exists shipments_guard_transition on public.shipments;
create trigger shipments_guard_transition
before insert or update on public.shipments
for each row execute function public.guard_shipment_transition();

create or replace function public.guard_design_review_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then return new; end if;
  if old.status <> 'pending' or new.status not in ('approved', 'revision_requested') then
    raise exception 'Design review decisions are final.' using errcode = '23514';
  end if;
  if new.reviewed_by is distinct from (select auth.uid()) then
    raise exception 'Design review reviewer identity mismatch.' using errcode = '42501';
  end if;
  if new.status = 'revision_requested' and coalesce(char_length(btrim(new.revision_note)), 0) = 0 then
    raise exception 'Revision note is required.' using errcode = '23514';
  end if;
  if new.status = 'approved' then new.revision_note := null; end if;
  if new.reviewed_at is null then new.reviewed_at := now(); end if;
  return new;
end;
$$;

revoke all on function public.guard_design_review_decision() from public, anon, authenticated;

drop trigger if exists case_design_reviews_guard_decision on public.case_design_reviews;
create trigger case_design_reviews_guard_decision
before update of status on public.case_design_reviews
for each row execute function public.guard_design_review_decision();

create or replace function public.dentaya_create_case_shipment(
  p_case_id uuid,
  p_courier_org_id uuid,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_case public.cases%rowtype;
  v_existing_id uuid;
  v_shipment_id uuid;
  v_tracking_code text;
  v_lab_name text;
  v_clinic_name text;
  v_actor_org_id uuid;
begin
  if v_uid is null then raise exception 'Authentication required.' using errcode = '42501'; end if;

  select * into v_case from public.cases where id = p_case_id for update;
  if not found then raise exception 'Case not found.' using errcode = 'P0002'; end if;
  if v_case.lab_org_id is null then raise exception 'Case has no laboratory.' using errcode = '23514'; end if;

  if not (
    public.is_org_role(v_case.clinic_org_id, array['owner', 'admin', 'dentist', 'assistant'])
    or public.is_org_role(v_case.lab_org_id, array['owner', 'admin', 'technician'])
  ) then
    raise exception 'Not allowed to create shipment for this case.' using errcode = '42501';
  end if;

  if v_case.status not in ('ready', 'shipped') then
    raise exception 'Case is not ready for delivery.' using errcode = '23514';
  end if;

  select s.id into v_existing_id
  from public.shipments s
  where s.case_id = p_case_id
    and s.status in ('created', 'pickup_requested', 'picked_up', 'in_transit')
  order by s.created_at desc limit 1;
  if v_existing_id is not null then return v_existing_id; end if;

  if p_courier_org_id is not null and not exists (
    select 1 from public.organizations o
    where o.id = p_courier_org_id and o.org_type = 'courier' and o.directory_visible
  ) then
    raise exception 'Courier organization is unavailable.' using errcode = '23514';
  end if;

  select o.name into v_lab_name from public.organizations o where o.id = v_case.lab_org_id;
  select o.name into v_clinic_name from public.organizations o where o.id = v_case.clinic_org_id;
  select m.organization_id into v_actor_org_id
  from public.memberships m
  where m.user_id = v_uid and m.status = 'active'
    and m.organization_id in (v_case.clinic_org_id, v_case.lab_org_id)
  limit 1;

  v_tracking_code := 'DYA-' || regexp_replace(v_case.case_number, '[^A-Za-z0-9]', '', 'g') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.shipments(
    case_id, from_org_id, to_org_id, courier_org_id, tracking_code, status,
    pickup_label, dropoff_label, created_by, client_request_id
  ) values (
    v_case.id, v_case.lab_org_id, v_case.clinic_org_id, p_courier_org_id, v_tracking_code,
    case when p_courier_org_id is null then 'created' else 'pickup_requested' end,
    coalesce(v_lab_name, 'Laboratuvar'), coalesce(v_clinic_name, 'Klinik'), v_uid, p_request_id
  ) returning id into v_shipment_id;

  insert into public.case_events(
    case_id, event_type, from_status, to_status, message, created_by, actor_label, actor_org_id
  ) values (
    v_case.id, 'shipment_created', v_case.status, v_case.status,
    case when p_courier_org_id is null then 'Kurye gönderisi oluşturuldu · ' || v_tracking_code
         else 'Kurye alım talebi oluşturuldu · ' || v_tracking_code end,
    v_uid,
    coalesce((select p.full_name from public.profiles p where p.id = v_uid), 'DentAYA Kullanıcısı'),
    v_actor_org_id
  );

  return v_shipment_id;
exception
  when unique_violation then
    select s.id into v_existing_id from public.shipments s
    where s.case_id = p_case_id and s.status in ('created', 'pickup_requested', 'picked_up', 'in_transit')
    order by s.created_at desc limit 1;
    if v_existing_id is not null then return v_existing_id; end if;
    raise;
end;
$$;

revoke all on function public.dentaya_create_case_shipment(uuid, uuid, uuid) from public, anon;
grant execute on function public.dentaya_create_case_shipment(uuid, uuid, uuid) to authenticated;

create or replace function public.dentaya_assign_courier(p_shipment_id uuid, p_courier_org_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_shipment public.shipments%rowtype;
  v_actor_org_id uuid;
  v_courier_name text;
begin
  if v_uid is null then raise exception 'Authentication required.' using errcode = '42501'; end if;

  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if not found then raise exception 'Shipment not found.' using errcode = 'P0002'; end if;

  if not (
    public.is_org_role(v_shipment.from_org_id, array['owner', 'admin', 'technician'])
    or public.is_org_role(v_shipment.to_org_id, array['owner', 'admin', 'dentist', 'assistant'])
  ) then
    raise exception 'Not allowed to assign courier for this shipment.' using errcode = '42501';
  end if;

  if v_shipment.status not in ('created', 'pickup_requested') then
    raise exception 'Courier can only be assigned before pickup.' using errcode = '23514';
  end if;

  select o.name into v_courier_name
  from public.organizations o
  where o.id = p_courier_org_id and o.org_type = 'courier' and o.directory_visible;
  if v_courier_name is null then raise exception 'Courier organization is unavailable.' using errcode = '23514'; end if;

  select m.organization_id into v_actor_org_id
  from public.memberships m
  where m.user_id = v_uid and m.status = 'active'
    and m.organization_id in (v_shipment.from_org_id, v_shipment.to_org_id)
  limit 1;

  update public.shipments
  set courier_org_id = p_courier_org_id,
      courier_driver_id = null,
      courier_name = null,
      status = 'pickup_requested',
      updated_at = now()
  where id = p_shipment_id;

  insert into public.case_events(
    case_id, event_type, from_status, to_status, message, created_by, actor_label, actor_org_id
  ) values (
    v_shipment.case_id, 'courier_assigned', null, null,
    'Kurye ağı atandı · ' || v_courier_name,
    v_uid,
    coalesce((select p.full_name from public.profiles p where p.id = v_uid), 'DentAYA Kullanıcısı'),
    v_actor_org_id
  );

  return p_shipment_id;
end;
$$;

revoke all on function public.dentaya_assign_courier(uuid, uuid) from public, anon;
grant execute on function public.dentaya_assign_courier(uuid, uuid) to authenticated;

create or replace function public.dentaya_review_design(
  p_review_id uuid,
  p_decision text,
  p_revision_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_review public.case_design_reviews%rowtype;
  v_case public.cases%rowtype;
  v_next_status text;
begin
  if v_uid is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if p_decision not in ('approved', 'revision_requested') then
    raise exception 'Invalid design review decision.' using errcode = '23514';
  end if;
  if p_decision = 'revision_requested' and coalesce(char_length(btrim(p_revision_note)), 0) = 0 then
    raise exception 'Revision note is required.' using errcode = '23514';
  end if;
  if coalesce(char_length(p_revision_note), 0) > 2000 then
    raise exception 'Revision note is too long.' using errcode = '22001';
  end if;

  select * into v_review from public.case_design_reviews where id = p_review_id for update;
  if not found then raise exception 'Design review not found.' using errcode = 'P0002'; end if;
  select * into v_case from public.cases where id = v_review.case_id for update;

  if not public.is_org_role(v_case.clinic_org_id, array['owner', 'admin', 'dentist']) then
    raise exception 'Only the clinic can decide the design review.' using errcode = '42501';
  end if;
  if v_review.status <> 'pending' then
    raise exception 'Design review has already been decided.' using errcode = '23514';
  end if;
  if v_case.status <> 'approval' then
    raise exception 'Case is not waiting for design approval.' using errcode = '23514';
  end if;

  v_next_status := case when p_decision = 'approved' then 'production' else 'design' end;

  update public.case_design_reviews
  set status = p_decision,
      revision_note = case when p_decision = 'revision_requested' then btrim(p_revision_note) else null end,
      reviewed_by = v_uid,
      reviewed_at = now(),
      updated_at = now()
  where id = p_review_id;

  update public.cases
  set status = v_next_status,
      updated_by = v_uid,
      updated_at = now()
  where id = v_case.id;

  insert into public.case_events(
    case_id, event_type, from_status, to_status, message, created_by, actor_label, actor_org_id
  ) values (
    v_case.id,
    case when p_decision = 'approved' then 'design_approved' else 'revision_requested' end,
    'approval', v_next_status,
    case when p_decision = 'approved'
      then 'Tasarım v' || v_review.version_number::text || ' klinik tarafından onaylandı.'
      else 'Tasarım v' || v_review.version_number::text || ' için revizyon istendi: ' || btrim(p_revision_note)
    end,
    v_uid,
    coalesce((select p.full_name from public.profiles p where p.id = v_uid), 'DentAYA Kullanıcısı'),
    v_case.clinic_org_id
  );

  return v_review.id;
end;
$$;

revoke all on function public.dentaya_review_design(uuid, text, text) from public, anon;
grant execute on function public.dentaya_review_design(uuid, text, text) to authenticated;

create or replace function public.dentaya_submit_design_version(
  p_project_id uuid,
  p_attachment_id uuid,
  p_source_scan_id uuid,
  p_version_number integer,
  p_parameters jsonb,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_project public.design_projects%rowtype;
  v_case public.cases%rowtype;
  v_version_id uuid;
  v_expected_version integer;
begin
  if v_uid is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if p_version_number < 1 then raise exception 'Invalid design version number.' using errcode = '23514'; end if;

  select * into v_project
  from public.design_projects
  where id = p_project_id
  for update;
  if not found then raise exception 'Design project not found.' using errcode = 'P0002'; end if;

  select * into v_case
  from public.cases
  where id = v_project.case_id
  for update;
  if not found then raise exception 'Case not found.' using errcode = 'P0002'; end if;

  if not public.is_org_role(v_project.lab_org_id, array['owner', 'admin', 'technician']) then
    raise exception 'Only the assigned laboratory can submit a design.' using errcode = '42501';
  end if;

  if v_case.status not in ('accepted', 'design') then
    raise exception 'Case is not ready for a design submission.' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.attachments a
    where a.id = p_attachment_id
      and a.case_id = v_case.id
      and a.category = 'design'
      and a.created_by = v_uid
  ) then
    raise exception 'Design attachment does not belong to this submission.' using errcode = '23514';
  end if;

  if p_source_scan_id is not null and not exists (
    select 1 from public.scan_sessions s
    where s.id = p_source_scan_id
      and s.case_id = v_case.id
  ) then
    raise exception 'Source scan does not belong to this case.' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.case_design_reviews r
    where r.case_id = v_case.id and r.status = 'pending'
  ) then
    raise exception 'A design review is already pending for this case.' using errcode = '23514';
  end if;

  select coalesce(max(v.version_number), 0) + 1
    into v_expected_version
  from public.design_versions v
  where v.project_id = p_project_id;

  if p_version_number <> v_expected_version then
    raise exception 'Design version changed concurrently. Expected %, received %.', v_expected_version, p_version_number
      using errcode = '40001';
  end if;

  insert into public.design_versions(
    project_id,
    version_number,
    attachment_id,
    source_scan_id,
    status,
    parameters,
    note,
    created_by
  ) values (
    p_project_id,
    p_version_number,
    p_attachment_id,
    p_source_scan_id,
    'submitted',
    coalesce(p_parameters, '{}'::jsonb),
    p_note,
    v_uid
  ) returning id into v_version_id;

  insert into public.case_design_reviews(
    case_id,
    attachment_id,
    version_number,
    status,
    submitted_by,
    submitted_at
  ) values (
    v_case.id,
    p_attachment_id,
    p_version_number,
    'pending',
    v_uid,
    now()
  );

  update public.design_projects
  set workflow_stage = 'review',
      status = 'ready_for_review',
      updated_by = v_uid,
      updated_at = now()
  where id = p_project_id;

  update public.cases
  set status = 'approval',
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
    'design_submitted',
    v_case.status,
    'approval',
    'Tasarım v' || p_version_number::text || ' klinik onayına gönderildi.',
    v_uid,
    coalesce((select p.full_name from public.profiles p where p.id = v_uid), 'DentAYA Kullanıcısı'),
    v_project.lab_org_id
  );

  return v_version_id;
end;
$$;

revoke all on function public.dentaya_submit_design_version(uuid, uuid, uuid, integer, jsonb, text) from public, anon;
grant execute on function public.dentaya_submit_design_version(uuid, uuid, uuid, integer, jsonb, text) to authenticated;
