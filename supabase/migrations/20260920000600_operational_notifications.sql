-- DentAYA RC9: operational courier ETA notifications.

create or replace function public.notify_shipment_eta_threshold()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_org_id uuid;
  v_target_label text;
  v_minutes integer;
  v_key text;
begin
  if new.status in ('delivered', 'cancelled') or new.remaining_duration_seconds is null then
    return new;
  end if;

  -- Only emit when the route crosses into the 15-minute arrival window.
  if new.remaining_duration_seconds > 900 then
    return new;
  end if;
  if old.remaining_duration_seconds is not null and old.remaining_duration_seconds <= 900 then
    return new;
  end if;

  if new.status in ('created', 'pickup_requested') then
    v_target_org_id := new.from_org_id;
    v_target_label := 'alım noktasına';
    v_key := 'shipment-near-pickup:' || new.id::text;
  else
    v_target_org_id := new.to_org_id;
    v_target_label := 'teslim noktasına';
    v_key := 'shipment-near-dropoff:' || new.id::text;
  end if;

  v_minutes := greatest(1, ceil(new.remaining_duration_seconds / 60.0)::integer);

  perform public.emit_org_notification(
    v_target_org_id,
    'Kurye yaklaşıyor',
    coalesce(new.tracking_code, 'Gönderi') || ' · ' || v_target_label || ' yaklaşık ' || v_minutes::text || ' dk',
    case when v_minutes <= 5 then 'warning' else 'info' end,
    'shipment',
    new.id,
    'delivery',
    '/logistics',
    v_key
  );

  return new;
end;
$$;

revoke all on function public.notify_shipment_eta_threshold() from public, anon, authenticated;

drop trigger if exists trg_notify_shipment_eta_threshold on public.shipments;
create trigger trg_notify_shipment_eta_threshold
after update of remaining_duration_seconds on public.shipments
for each row execute function public.notify_shipment_eta_threshold();
