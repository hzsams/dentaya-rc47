-- DentAYA RC7: organization route addresses for clinic ↔ laboratory courier flow.

alter table public.organizations
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists address_district text,
  add column if not exists address_city text,
  add column if not exists address_postal_code text,
  add column if not exists address_country_code text not null default 'TR',
  add column if not exists address_formatted text,
  add column if not exists address_lat double precision,
  add column if not exists address_lng double precision,
  add column if not exists address_place_id text,
  add column if not exists address_verified_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.organizations'::regclass
      and conname = 'organizations_address_lat_range'
  ) then
    alter table public.organizations
      add constraint organizations_address_lat_range
      check (address_lat is null or address_lat between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.organizations'::regclass
      and conname = 'organizations_address_lng_range'
  ) then
    alter table public.organizations
      add constraint organizations_address_lng_range
      check (address_lng is null or address_lng between -180 and 180);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.organizations'::regclass
      and conname = 'organizations_address_coordinate_pair'
  ) then
    alter table public.organizations
      add constraint organizations_address_coordinate_pair
      check ((address_lat is null) = (address_lng is null));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.organizations'::regclass
      and conname = 'organizations_address_lengths'
  ) then
    alter table public.organizations
      add constraint organizations_address_lengths
      check (
        coalesce(char_length(address_line1), 0) <= 240
        and coalesce(char_length(address_line2), 0) <= 240
        and coalesce(char_length(address_district), 0) <= 120
        and coalesce(char_length(address_city), 0) <= 120
        and coalesce(char_length(address_postal_code), 0) <= 24
        and coalesce(char_length(address_country_code), 0) <= 2
        and coalesce(char_length(address_formatted), 0) <= 600
        and coalesce(char_length(address_place_id), 0) <= 255
      );
  end if;
end $$;

alter table public.shipments
  add column if not exists pickup_address_text text,
  add column if not exists dropoff_address_text text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.shipments'::regclass
      and conname = 'shipments_route_address_lengths'
  ) then
    alter table public.shipments
      add constraint shipments_route_address_lengths
      check (
        coalesce(char_length(pickup_address_text), 0) <= 600
        and coalesce(char_length(dropoff_address_text), 0) <= 600
      );
  end if;
end $$;

create or replace function public.organization_route_address(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(o.address_formatted), ''),
    nullif(
      concat_ws(', ',
        nullif(btrim(o.address_line1), ''),
        nullif(btrim(o.address_line2), ''),
        nullif(btrim(o.address_district), ''),
        nullif(btrim(o.address_city), ''),
        nullif(btrim(o.address_postal_code), ''),
        nullif(btrim(o.address_country_code), '')
      ),
      ''
    )
  )
  from public.organizations o
  where o.id = p_org_id
$$;

revoke all on function public.organization_route_address(uuid) from public, anon, authenticated;

create or replace function public.sync_open_shipments_from_org_address()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_address text;
begin
  if new.org_type not in ('clinic', 'laboratory') then
    return new;
  end if;

  v_address := coalesce(
    nullif(btrim(new.address_formatted), ''),
    nullif(
      concat_ws(', ',
        nullif(btrim(new.address_line1), ''),
        nullif(btrim(new.address_line2), ''),
        nullif(btrim(new.address_district), ''),
        nullif(btrim(new.address_city), ''),
        nullif(btrim(new.address_postal_code), ''),
        nullif(btrim(new.address_country_code), '')
      ),
      ''
    )
  );

  update public.shipments
  set pickup_label = new.name,
      pickup_address_text = v_address,
      pickup_lat = new.address_lat,
      pickup_lng = new.address_lng,
      updated_at = now()
  where from_org_id = new.id
    and status in ('created', 'pickup_requested');

  update public.shipments
  set dropoff_label = new.name,
      dropoff_address_text = v_address,
      dropoff_lat = new.address_lat,
      dropoff_lng = new.address_lng,
      updated_at = now()
  where to_org_id = new.id
    and status in ('created', 'pickup_requested');

  return new;
end;
$$;

revoke all on function public.sync_open_shipments_from_org_address() from public, anon, authenticated;

drop trigger if exists trg_sync_open_shipments_from_org_address on public.organizations;
create trigger trg_sync_open_shipments_from_org_address
after update of
  name,
  address_line1,
  address_line2,
  address_district,
  address_city,
  address_postal_code,
  address_country_code,
  address_formatted,
  address_lat,
  address_lng,
  address_place_id,
  address_verified_at
on public.organizations
for each row execute function public.sync_open_shipments_from_org_address();

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
  v_lab public.organizations%rowtype;
  v_clinic public.organizations%rowtype;
  v_actor_org_id uuid;
  v_pickup_address text;
  v_dropoff_address text;
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

  select * into v_lab from public.organizations o where o.id = v_case.lab_org_id;
  select * into v_clinic from public.organizations o where o.id = v_case.clinic_org_id;

  v_pickup_address := coalesce(
    nullif(btrim(v_lab.address_formatted), ''),
    nullif(concat_ws(', ',
      nullif(btrim(v_lab.address_line1), ''), nullif(btrim(v_lab.address_line2), ''),
      nullif(btrim(v_lab.address_district), ''), nullif(btrim(v_lab.address_city), ''),
      nullif(btrim(v_lab.address_postal_code), ''), nullif(btrim(v_lab.address_country_code), '')
    ), '')
  );

  v_dropoff_address := coalesce(
    nullif(btrim(v_clinic.address_formatted), ''),
    nullif(concat_ws(', ',
      nullif(btrim(v_clinic.address_line1), ''), nullif(btrim(v_clinic.address_line2), ''),
      nullif(btrim(v_clinic.address_district), ''), nullif(btrim(v_clinic.address_city), ''),
      nullif(btrim(v_clinic.address_postal_code), ''), nullif(btrim(v_clinic.address_country_code), '')
    ), '')
  );

  select m.organization_id into v_actor_org_id
  from public.memberships m
  where m.user_id = v_uid and m.status = 'active'
    and m.organization_id in (v_case.clinic_org_id, v_case.lab_org_id)
  limit 1;

  v_tracking_code := 'DYA-' || regexp_replace(v_case.case_number, '[^A-Za-z0-9]', '', 'g') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.shipments(
    case_id, from_org_id, to_org_id, courier_org_id, tracking_code, status,
    pickup_label, dropoff_label, pickup_address_text, dropoff_address_text,
    pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
    created_by, client_request_id
  ) values (
    v_case.id, v_case.lab_org_id, v_case.clinic_org_id, p_courier_org_id, v_tracking_code,
    case when p_courier_org_id is null then 'created' else 'pickup_requested' end,
    coalesce(v_lab.name, 'Laboratuvar'), coalesce(v_clinic.name, 'Klinik'),
    v_pickup_address, v_dropoff_address,
    v_lab.address_lat, v_lab.address_lng, v_clinic.address_lat, v_clinic.address_lng,
    v_uid, p_request_id
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

-- Backfill address snapshots for any still-pending shipments when an address already exists.
update public.shipments s
set pickup_label = coalesce(o.name, s.pickup_label),
    pickup_address_text = coalesce(s.pickup_address_text, public.organization_route_address(o.id)),
    pickup_lat = coalesce(s.pickup_lat, o.address_lat),
    pickup_lng = coalesce(s.pickup_lng, o.address_lng)
from public.organizations o
where s.from_org_id = o.id
  and s.status in ('created', 'pickup_requested');

update public.shipments s
set dropoff_label = coalesce(o.name, s.dropoff_label),
    dropoff_address_text = coalesce(s.dropoff_address_text, public.organization_route_address(o.id)),
    dropoff_lat = coalesce(s.dropoff_lat, o.address_lat),
    dropoff_lng = coalesce(s.dropoff_lng, o.address_lng)
from public.organizations o
where s.to_org_id = o.id
  and s.status in ('created', 'pickup_requested');
