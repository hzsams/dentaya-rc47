-- DentAYA RC8: production courier routing, live-location hardening and delivery proof.

alter table public.shipments
  add column if not exists planned_distance_meters integer,
  add column if not exists planned_duration_seconds integer,
  add column if not exists remaining_distance_meters integer,
  add column if not exists remaining_duration_seconds integer,
  add column if not exists route_polyline text,
  add column if not exists route_calculated_at timestamptz,
  add column if not exists eta_at timestamptz,
  add column if not exists actual_distance_meters integer,
  add column if not exists actual_duration_seconds integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipments'::regclass
      and conname = 'shipments_route_metrics_nonnegative'
  ) then
    alter table public.shipments
      add constraint shipments_route_metrics_nonnegative
      check (
        (planned_distance_meters is null or planned_distance_meters >= 0)
        and (planned_duration_seconds is null or planned_duration_seconds >= 0)
        and (remaining_distance_meters is null or remaining_distance_meters >= 0)
        and (remaining_duration_seconds is null or remaining_duration_seconds >= 0)
        and (actual_distance_meters is null or actual_distance_meters >= 0)
        and (actual_duration_seconds is null or actual_duration_seconds >= 0)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipments'::regclass
      and conname = 'shipments_route_polyline_length'
  ) then
    alter table public.shipments
      add constraint shipments_route_polyline_length
      check (route_polyline is null or char_length(route_polyline) <= 100000);
  end if;
end $$;

create table if not exists public.shipment_delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null unique references public.shipments(id) on delete cascade,
  recipient_name text not null,
  confirmation_code_hash text,
  confirmation_code_last4 text,
  delivery_note text,
  photo_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint shipment_delivery_proofs_recipient_length check (char_length(btrim(recipient_name)) between 2 and 160),
  constraint shipment_delivery_proofs_code_length check (confirmation_code_last4 is null or char_length(confirmation_code_last4) between 1 and 4),
  constraint shipment_delivery_proofs_note_length check (delivery_note is null or char_length(delivery_note) <= 2000),
  constraint shipment_delivery_proofs_photo_length check (photo_path is null or char_length(photo_path) <= 700)
);

create index if not exists shipment_delivery_proofs_created_at_idx
  on public.shipment_delivery_proofs(created_at desc);

alter table public.shipment_delivery_proofs enable row level security;

drop policy if exists shipment_delivery_proofs_select_participants on public.shipment_delivery_proofs;
create policy shipment_delivery_proofs_select_participants on public.shipment_delivery_proofs for select
using (
  exists (
    select 1 from public.shipments s
    where s.id = shipment_id
      and (
        public.is_org_member(s.from_org_id)
        or public.is_org_member(s.to_org_id)
        or (s.courier_org_id is not null and public.is_org_member(s.courier_org_id))
      )
  )
);

drop policy if exists shipment_delivery_proofs_insert_courier on public.shipment_delivery_proofs;
create policy shipment_delivery_proofs_insert_courier on public.shipment_delivery_proofs for insert
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.shipments s
    where s.id = shipment_id
      and s.courier_org_id is not null
      and s.status = 'in_transit'
      and public.is_org_role(s.courier_org_id, array['owner', 'admin', 'courier'])
  )
);

-- Extend the private storage object guard for shipment proof photos.
create or replace function public.can_access_dentaya_object(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id_text text := split_part(object_name, '/', 2);
begin
  if object_name ~ '^cases/[0-9a-fA-F-]{36}/' then
    return public.can_access_case(v_id_text::uuid);
  end if;
  if object_name ~ '^patients/[0-9a-fA-F-]{36}/' then
    return public.can_access_patient(v_id_text::uuid);
  end if;
  if object_name ~ '^shipments/[0-9a-fA-F-]{36}/' then
    return exists (
      select 1 from public.shipments s
      where s.id = v_id_text::uuid
        and (
          public.is_org_member(s.from_org_id)
          or public.is_org_member(s.to_org_id)
          or (s.courier_org_id is not null and public.is_org_member(s.courier_org_id))
        )
    );
  end if;
  return false;
exception when invalid_text_representation then
  return false;
end;
$$;

revoke all on function public.can_access_dentaya_object(text) from public, anon;
grant execute on function public.can_access_dentaya_object(text) to authenticated;

create or replace function public.guard_courier_location_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_shipment public.shipments%rowtype;
  v_driver_user_id uuid;
begin
  if v_uid is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_shipment
  from public.shipments
  where id = new.shipment_id;

  if not found then
    raise exception 'Shipment not found.' using errcode = 'P0002';
  end if;

  if v_shipment.status not in ('pickup_requested', 'picked_up', 'in_transit') then
    raise exception 'Live location is only accepted for an active courier shipment.' using errcode = '23514';
  end if;

  if v_shipment.courier_org_id is null or new.courier_org_id is distinct from v_shipment.courier_org_id then
    raise exception 'Courier location organization does not match the shipment.' using errcode = '42501';
  end if;

  if not public.is_org_role(v_shipment.courier_org_id, array['owner', 'admin', 'courier']) then
    raise exception 'Courier membership is required to publish live location.' using errcode = '42501';
  end if;

  if new.created_by is distinct from v_uid then
    raise exception 'Courier location creator identity mismatch.' using errcode = '42501';
  end if;

  if v_shipment.courier_driver_id is not null then
    if new.courier_driver_id is distinct from v_shipment.courier_driver_id then
      raise exception 'Courier location driver does not match the assigned driver.' using errcode = '42501';
    end if;

    select d.user_id into v_driver_user_id
    from public.courier_drivers d
    where d.id = v_shipment.courier_driver_id
      and d.organization_id = v_shipment.courier_org_id;

    if not found then
      raise exception 'Assigned courier driver is invalid.' using errcode = '23514';
    end if;

    if v_driver_user_id is not null
      and v_driver_user_id is distinct from v_uid
      and not public.is_org_role(v_shipment.courier_org_id, array['owner', 'admin']) then
      raise exception 'Only the assigned driver can publish this shipment location.' using errcode = '42501';
    end if;
  end if;

  if new.recorded_at > now() + interval '5 minutes' then
    raise exception 'Courier location timestamp is too far in the future.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_courier_location_insert() from public, anon, authenticated;

drop trigger if exists courier_locations_guard_insert on public.courier_locations;
create trigger courier_locations_guard_insert
before insert on public.courier_locations
for each row execute function public.guard_courier_location_insert();

drop policy if exists courier_locations_insert_courier on public.courier_locations;
create policy courier_locations_insert_courier on public.courier_locations for insert
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.shipments s
    where s.id = shipment_id
      and s.courier_org_id = courier_org_id
      and s.status in ('pickup_requested', 'picked_up', 'in_transit')
      and public.is_org_role(s.courier_org_id, array['owner', 'admin', 'courier'])
  )
);

create or replace function public.dentaya_record_route_snapshot(
  p_shipment_id uuid,
  p_planned_distance_meters integer,
  p_planned_duration_seconds integer,
  p_remaining_distance_meters integer,
  p_remaining_duration_seconds integer,
  p_eta_at timestamptz,
  p_polyline text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shipment public.shipments%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if not found then raise exception 'Shipment not found.' using errcode = 'P0002'; end if;

  if not (
    public.is_org_member(v_shipment.from_org_id)
    or public.is_org_member(v_shipment.to_org_id)
    or (v_shipment.courier_org_id is not null and public.is_org_member(v_shipment.courier_org_id))
  ) then
    raise exception 'Shipment access denied.' using errcode = '42501';
  end if;

  if coalesce(p_planned_distance_meters, 0) < 0 or coalesce(p_planned_distance_meters, 0) > 5000000
    or coalesce(p_remaining_distance_meters, 0) < 0 or coalesce(p_remaining_distance_meters, 0) > 5000000
    or coalesce(p_planned_duration_seconds, 0) < 0 or coalesce(p_planned_duration_seconds, 0) > 604800
    or coalesce(p_remaining_duration_seconds, 0) < 0 or coalesce(p_remaining_duration_seconds, 0) > 604800 then
    raise exception 'Route metrics are outside allowed bounds.' using errcode = '23514';
  end if;

  if p_polyline is not null and char_length(p_polyline) > 100000 then
    raise exception 'Route polyline is too long.' using errcode = '22001';
  end if;

  update public.shipments
  set planned_distance_meters = coalesce(p_planned_distance_meters, planned_distance_meters),
      planned_duration_seconds = coalesce(p_planned_duration_seconds, planned_duration_seconds),
      remaining_distance_meters = p_remaining_distance_meters,
      remaining_duration_seconds = p_remaining_duration_seconds,
      route_polyline = p_polyline,
      route_calculated_at = now(),
      eta_at = p_eta_at,
      updated_at = now()
  where id = p_shipment_id;

  return p_shipment_id;
end;
$$;

revoke all on function public.dentaya_record_route_snapshot(uuid, integer, integer, integer, integer, timestamptz, text) from public, anon;
grant execute on function public.dentaya_record_route_snapshot(uuid, integer, integer, integer, integer, timestamptz, text) to authenticated;

create or replace function public.dentaya_shipment_actual_distance_meters(p_shipment_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with ordered as (
    select
      latitude,
      longitude,
      lag(latitude) over (order by recorded_at, id) as prev_latitude,
      lag(longitude) over (order by recorded_at, id) as prev_longitude
    from public.courier_locations
    where shipment_id = p_shipment_id
  ), segments as (
    select
      6371000.0 * acos(
        least(1.0, greatest(-1.0,
          sin(radians(prev_latitude)) * sin(radians(latitude))
          + cos(radians(prev_latitude)) * cos(radians(latitude))
          * cos(radians(longitude - prev_longitude))
        ))
      ) as meters
    from ordered
    where prev_latitude is not null and prev_longitude is not null
  )
  select coalesce(round(sum(meters)), 0)::integer from segments
$$;

revoke all on function public.dentaya_shipment_actual_distance_meters(uuid) from public, anon, authenticated;

create or replace function public.require_delivery_proof_before_delivered()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'delivered'
    and old.status is distinct from new.status
    and not exists (
      select 1 from public.shipment_delivery_proofs p where p.shipment_id = new.id
    ) then
    raise exception 'Delivery proof is required before marking the shipment delivered.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.require_delivery_proof_before_delivered() from public, anon, authenticated;

drop trigger if exists shipments_require_delivery_proof on public.shipments;
create trigger shipments_require_delivery_proof
before update of status on public.shipments
for each row execute function public.require_delivery_proof_before_delivered();

create or replace function public.dentaya_complete_delivery(
  p_shipment_id uuid,
  p_recipient_name text,
  p_confirmation_code text default null,
  p_delivery_note text default null,
  p_photo_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_shipment public.shipments%rowtype;
  v_code text := nullif(btrim(coalesce(p_confirmation_code, '')), '');
  v_note text := nullif(btrim(coalesce(p_delivery_note, '')), '');
  v_photo text := nullif(btrim(coalesce(p_photo_path, '')), '');
  v_actor_label text;
  v_actual_distance integer;
  v_actual_duration integer;
begin
  if v_uid is null then raise exception 'Authentication required.' using errcode = '42501'; end if;

  select * into v_shipment from public.shipments where id = p_shipment_id for update;
  if not found then raise exception 'Shipment not found.' using errcode = 'P0002'; end if;

  if v_shipment.courier_org_id is null
    or not public.is_org_role(v_shipment.courier_org_id, array['owner', 'admin', 'courier']) then
    raise exception 'Courier permission is required to complete delivery.' using errcode = '42501';
  end if;

  if v_shipment.status <> 'in_transit' then
    raise exception 'Shipment must be in transit before delivery.' using errcode = '23514';
  end if;

  if v_shipment.courier_driver_id is null then
    raise exception 'Assigned driver is required before delivery.' using errcode = '23514';
  end if;

  if char_length(btrim(coalesce(p_recipient_name, ''))) not between 2 and 160 then
    raise exception 'Recipient name must be between 2 and 160 characters.' using errcode = '23514';
  end if;

  if v_code is not null and char_length(v_code) > 12 then
    raise exception 'Confirmation code is too long.' using errcode = '22001';
  end if;

  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'Delivery note is too long.' using errcode = '22001';
  end if;

  if v_photo is not null and v_photo !~ ('^shipments/' || p_shipment_id::text || '/proof/[A-Za-z0-9._-]+$') then
    raise exception 'Delivery proof photo path is invalid.' using errcode = '23514';
  end if;

  insert into public.shipment_delivery_proofs(
    shipment_id, recipient_name, confirmation_code_hash, confirmation_code_last4,
    delivery_note, photo_path, created_by
  ) values (
    p_shipment_id,
    btrim(p_recipient_name),
    case when v_code is null then null else encode(extensions.digest(v_code, 'sha256'), 'hex') end,
    case when v_code is null then null else right(v_code, least(4, char_length(v_code))) end,
    v_note,
    v_photo,
    v_uid
  );

  v_actual_distance := public.dentaya_shipment_actual_distance_meters(p_shipment_id);
  v_actual_duration := case
    when v_shipment.pickup_at is null then null
    else greatest(0, floor(extract(epoch from (now() - v_shipment.pickup_at)))::integer)
  end;

  update public.shipments
  set status = 'delivered',
      delivered_at = now(),
      remaining_distance_meters = 0,
      remaining_duration_seconds = 0,
      eta_at = now(),
      actual_distance_meters = v_actual_distance,
      actual_duration_seconds = v_actual_duration,
      updated_at = now()
  where id = p_shipment_id;

  select coalesce(p.full_name, 'DentAYA Kurye') into v_actor_label
  from public.profiles p where p.id = v_uid;

  insert into public.case_events(
    case_id, event_type, from_status, to_status, message, created_by, actor_label, actor_org_id
  ) values (
    v_shipment.case_id,
    'delivery_proof_recorded',
    'shipped',
    'delivered',
    'Teslimat kanıtı kaydedildi · teslim alan: ' || btrim(p_recipient_name),
    v_uid,
    coalesce(v_actor_label, 'DentAYA Kurye'),
    v_shipment.courier_org_id
  );

  return p_shipment_id;
exception
  when unique_violation then
    raise exception 'Delivery proof has already been recorded.' using errcode = '23505';
end;
$$;

revoke all on function public.dentaya_complete_delivery(uuid, text, text, text, text) from public, anon;
grant execute on function public.dentaya_complete_delivery(uuid, text, text, text, text) to authenticated;

-- RC7 added address snapshot fields and RC8 adds route metrics. Keep immutable
-- shipment identity guarded while allowing these operational fields to change.
drop trigger if exists shipments_guard_identity on public.shipments;
create trigger shipments_guard_identity before update on public.shipments
for each row execute function public.enforce_update_columns(
  'courier_org_id', 'courier_driver_id', 'courier_name', 'tracking_code', 'status',
  'pickup_at', 'delivered_at', 'notes', 'pickup_label', 'dropoff_label',
  'pickup_address_text', 'dropoff_address_text',
  'pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng',
  'planned_distance_meters', 'planned_duration_seconds',
  'remaining_distance_meters', 'remaining_duration_seconds',
  'route_polyline', 'route_calculated_at', 'eta_at',
  'actual_distance_meters', 'actual_duration_seconds',
  'updated_at'
);

-- New table is created after the foundation grants, so grant explicitly.
grant select, insert on public.shipment_delivery_proofs to authenticated;
