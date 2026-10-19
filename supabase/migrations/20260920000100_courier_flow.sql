-- DentAYA production flow: courier directory + case/shipment synchronization.

-- Clinics and laboratories need to see opt-in courier organizations when they
-- create a shipment. Membership-based access remains unchanged.
drop policy if exists organizations_select_member_or_directory on public.organizations;
create policy organizations_select_member_or_directory on public.organizations for select
using (
  public.is_org_member(id)
  or (
    directory_visible
    and org_type in ('laboratory', 'courier')
  )
);

-- A courier can update a shipment, but cannot update a case directly. Keep
-- the case timeline authoritative by synchronizing the case status from the
-- shipment status in a security-definer trigger.
create or replace function public.sync_case_status_from_shipment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_case_status text;
  v_next_status text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  v_next_status := case
    when new.status in ('picked_up', 'in_transit') then 'shipped'
    when new.status = 'delivered' then 'delivered'
    else null
  end;

  if v_next_status is null then
    return new;
  end if;

  select status into v_case_status
  from public.cases
  where id = new.case_id;

  if v_case_status in ('cancelled', 'delivered') then
    return new;
  end if;

  update public.cases
  set status = v_next_status,
      updated_at = now()
  where id = new.case_id
    and status <> v_next_status;

  return new;
end;
$$;

revoke all on function public.sync_case_status_from_shipment() from public, anon, authenticated;

drop trigger if exists trg_sync_case_status_from_shipment on public.shipments;
create trigger trg_sync_case_status_from_shipment
after insert or update of status on public.shipments
for each row execute function public.sync_case_status_from_shipment();
