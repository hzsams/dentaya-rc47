-- Versioned evidence for the existing pilot flow. No clinical approval is inferred.
create table if not exists public.validation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  requirement_id text not null check (requirement_id in ('D-01','D-02','D-03','D-04','D-05','D-06','D-07','D-08','D-09','D-10','D-11','D-12')),
  protocol_ref text not null check (char_length(btrim(protocol_ref)) between 3 and 180),
  release_version text not null check (char_length(btrim(release_version)) between 3 and 80),
  data_scope text not null check (data_scope in ('synthetic','usability','retrospective','prospective')),
  outcome text not null check (outcome in ('passed','failed','blocked')),
  expected_result text not null check (char_length(btrim(expected_result)) between 10 and 4000),
  observed_result text not null check (char_length(btrim(observed_result)) between 10 and 4000),
  evidence_ref text not null check (char_length(btrim(evidence_ref)) between 5 and 1000),
  authorization_ref text not null default '' check (char_length(authorization_ref) <= 1000),
  duration_seconds integer check (duration_seconds between 0 and 864000),
  issue_severity text not null check (issue_severity in ('none','low','medium','high','critical')),
  corrective_action text not null default '' check (char_length(corrective_action) <= 4000),
  case_id uuid references public.cases(id),
  supersedes uuid unique references public.validation_runs(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (data_scope = 'synthetic' or char_length(btrim(authorization_ref)) >= 5),
  check (outcome <> 'passed' or issue_severity not in ('high','critical')),
  check (outcome = 'passed' or char_length(btrim(corrective_action)) >= 10)
);
create index if not exists validation_runs_org_created_idx on public.validation_runs(organization_id,created_at desc,id desc);
alter table public.validation_runs enable row level security;
revoke all on table public.validation_runs from public,anon,authenticated;
grant select on table public.validation_runs to authenticated;
grant select,insert on table public.validation_runs to service_role;
drop policy if exists validation_runs_read on public.validation_runs;
create policy validation_runs_read on public.validation_runs for select to authenticated using(public.is_org_member(organization_id));

create or replace function public.dentaya_record_validation_run(
  p_organization_id uuid, p_requirement_id text, p_protocol_ref text, p_release_version text,
  p_data_scope text, p_outcome text, p_expected_result text, p_observed_result text,
  p_evidence_ref text, p_authorization_ref text, p_duration_seconds integer,
  p_issue_severity text, p_corrective_action text, p_case_id uuid default null,
  p_supersedes uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare
  v_id uuid;
  v_previous public.validation_runs%rowtype;
begin
  if auth.uid() is null or not public.is_org_role(p_organization_id,array['owner','admin','dentist','technician']) then
    raise exception 'Validation record permission denied' using errcode='42501';
  end if;
  if p_case_id is not null and not exists(select 1 from public.cases c where c.id=p_case_id and (c.clinic_org_id=p_organization_id or c.lab_org_id=p_organization_id)) then
    raise exception 'Case does not belong to the organization' using errcode='42501';
  end if;
  if p_supersedes is not null then
    select * into v_previous from public.validation_runs where id=p_supersedes for update;
    if not found or v_previous.organization_id<>p_organization_id or v_previous.requirement_id<>p_requirement_id
      or v_previous.protocol_ref<>btrim(p_protocol_ref) or v_previous.release_version<>btrim(p_release_version)
      or v_previous.data_scope<>p_data_scope then
      raise exception 'Correction reference does not match the record scope' using errcode='42501';
    end if;
  end if;
  insert into public.validation_runs(organization_id,requirement_id,protocol_ref,release_version,data_scope,outcome,
    expected_result,observed_result,evidence_ref,authorization_ref,duration_seconds,issue_severity,corrective_action,
    case_id,supersedes,created_by)
  values(p_organization_id,p_requirement_id,btrim(p_protocol_ref),btrim(p_release_version),p_data_scope,p_outcome,
    btrim(p_expected_result),btrim(p_observed_result),btrim(p_evidence_ref),btrim(coalesce(p_authorization_ref,'')),
    p_duration_seconds,p_issue_severity,btrim(coalesce(p_corrective_action,'')),p_case_id,p_supersedes,auth.uid()) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.dentaya_record_validation_run(uuid,text,text,text,text,text,text,text,text,text,integer,text,text,uuid,uuid) from public,anon;
grant execute on function public.dentaya_record_validation_run(uuid,text,text,text,text,text,text,text,text,text,integer,text,text,uuid,uuid) to authenticated;

create or replace function public.dentaya_validation_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Validation evidence is append-only; create a correction record' using errcode='42501'; end;
$$;
revoke all on function public.dentaya_validation_immutable() from public,anon,authenticated;
drop trigger if exists validation_runs_immutable on public.validation_runs;
create trigger validation_runs_immutable before update or delete on public.validation_runs for each row execute function public.dentaya_validation_immutable();
