-- DentAYA MVP RC1: unify clinic and laboratory scan purposes.

alter table public.scan_sessions
  drop constraint if exists scan_sessions_scan_purpose_check;

alter table public.scan_sessions
  add constraint scan_sessions_scan_purpose_check
  check (
    scan_purpose in (
      'clinical','intraoral','preop',
      'working_model','master_model',
      'antagonist','bite','die','waxup',
      'verification','design_reference','other'
    )
  );
