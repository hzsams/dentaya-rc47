-- DentAYA production foundation
-- Creates a clean, reproducible Supabase schema for clinic, laboratory,
-- courier, scan, CAD, messaging and team workflows.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (full_name is null or char_length(btrim(full_name)) between 2 and 120),
  constraint profiles_email_length check (email is null or char_length(email) <= 320),
  constraint profiles_phone_length check (phone is null or char_length(phone) <= 40)
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  org_type text not null check (org_type in ('clinic', 'laboratory', 'courier')),
  directory_visible boolean not null default false,
  demo_mode boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(btrim(name)) between 2 and 120),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$')
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  constraint memberships_role_check check (role in ('owner', 'admin', 'dentist', 'assistant', 'technician', 'courier', 'viewer'))
);

create unique index if not exists memberships_one_active_org_per_user_idx
  on public.memberships(user_id) where status = 'active';
create index if not exists memberships_org_status_idx
  on public.memberships(organization_id, status);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  owning_org_id uuid not null references public.organizations(id) on delete restrict,
  external_ref text,
  first_name text not null,
  last_name text not null,
  date_of_birth date,
  sex text,
  phone text,
  email text,
  blood_group text,
  allergy_notes text,
  medical_notes text,
  dental_notes text,
  consent_status text not null default 'pending' check (consent_status in ('pending', 'granted', 'withdrawn', 'demo')),
  demo_mode boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  client_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_first_name_length check (char_length(btrim(first_name)) between 1 and 80),
  constraint patients_last_name_length check (char_length(btrim(last_name)) between 1 and 80),
  constraint patients_email_length check (email is null or char_length(email) <= 320),
  constraint patients_notes_length check (
    coalesce(char_length(allergy_notes), 0) <= 4000
    and coalesce(char_length(medical_notes), 0) <= 8000
    and coalesce(char_length(dental_notes), 0) <= 8000
  ),
  unique (owning_org_id, external_ref),
  unique (owning_org_id, client_request_id)
);

create index if not exists patients_org_created_idx
  on public.patients(owning_org_id, created_at desc);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  patient_id uuid not null references public.patients(id) on delete restrict,
  clinic_org_id uuid not null references public.organizations(id) on delete restrict,
  lab_org_id uuid references public.organizations(id) on delete restrict,
  patient_reference text not null,
  title text not null,
  case_type text not null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'new' check (status in ('new', 'accepted', 'design', 'approval', 'production', 'qc', 'ready', 'shipped', 'delivered', 'cancelled')),
  due_date date,
  tooth_codes text[] not null default '{}',
  material text,
  shade text,
  clinical_notes text,
  lab_notes text,
  demo_mode boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  client_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cases_title_length check (char_length(btrim(title)) between 2 and 200),
  constraint cases_tooth_count check (cardinality(tooth_codes) between 1 and 32),
  constraint cases_notes_length check (coalesce(char_length(clinical_notes), 0) <= 4000 and coalesce(char_length(lab_notes), 0) <= 4000),
  constraint cases_distinct_parties check (lab_org_id is null or lab_org_id <> clinic_org_id),
  unique (clinic_org_id, client_request_id)
);

create index if not exists cases_clinic_updated_idx on public.cases(clinic_org_id, updated_at desc);
create index if not exists cases_lab_updated_idx on public.cases(lab_org_id, updated_at desc);
create index if not exists cases_patient_updated_idx on public.cases(patient_id, updated_at desc);
create index if not exists cases_status_due_idx on public.cases(status, due_date);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  appointment_type text not null default 'Kontrol',
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 480),
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,
  client_request_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_type_length check (char_length(btrim(appointment_type)) between 1 and 120),
  constraint appointments_notes_length check (notes is null or char_length(notes) <= 2000),
  unique (organization_id, client_request_id)
);

create index if not exists appointments_org_schedule_idx
  on public.appointments(organization_id, scheduled_at);
create index if not exists appointments_patient_schedule_idx
  on public.appointments(patient_id, scheduled_at desc);

create table if not exists public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  scan_ref text not null unique,
  patient_id uuid not null references public.patients(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  scan_type text not null default 'intraoral',
  arch text not null default 'full',
  scanner_brand text,
  scanner_model text,
  captured_at timestamptz not null default now(),
  file_name text,
  storage_bucket text,
  storage_path text,
  mesh_points integer check (mesh_points is null or mesh_points >= 0),
  triangle_count integer check (triangle_count is null or triangle_count >= 0),
  completeness_score numeric(6, 3) check (completeness_score is null or completeness_score between 0 and 100),
  occlusion_rms_mm numeric(8, 4) check (occlusion_rms_mm is null or occlusion_rms_mm >= 0),
  shade_reference text,
  metrics jsonb not null default '{}'::jsonb,
  notes text,
  demo_mode boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  captured_by_org_id uuid not null references public.organizations(id) on delete restrict,
  capture_context text not null default 'clinic' check (capture_context in ('clinic', 'laboratory')),
  capture_method text,
  capture_origin text not null default 'clinic' check (capture_origin in ('clinic', 'laboratory')),
  scan_origin text not null default 'clinic' check (scan_origin in ('clinic', 'laboratory')),
  scan_purpose text not null default 'clinical',
  client_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scan_sessions_scan_purpose_check check (scan_purpose in ('clinical', 'intraoral', 'preop', 'working_model', 'master_model', 'antagonist', 'bite', 'die', 'waxup', 'verification', 'design_reference', 'other')),
  constraint scan_sessions_notes_length check (notes is null or char_length(notes) <= 4000),
  unique (captured_by_org_id, client_request_id)
);

create index if not exists scan_sessions_patient_captured_idx on public.scan_sessions(patient_id, captured_at desc);
create index if not exists scan_sessions_case_captured_idx on public.scan_sessions(case_id, captured_at desc);
create index if not exists scan_sessions_captured_by_org_idx on public.scan_sessions(captured_by_org_id, captured_at desc);
create index if not exists scan_sessions_created_by_idx on public.scan_sessions(created_by);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade,
  case_id uuid references public.cases(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  category text not null default 'other' check (category in ('scan', 'model', 'design', 'photo', 'document', 'other')),
  created_by uuid references auth.users(id) on delete set null,
  client_request_id uuid,
  created_at timestamptz not null default now(),
  constraint attachments_owner_context check (patient_id is not null or case_id is not null),
  constraint attachments_file_name_length check (char_length(file_name) between 1 and 255),
  unique (storage_bucket, storage_path),
  unique (created_by, client_request_id)
);

create index if not exists attachments_case_created_idx on public.attachments(case_id, created_at desc);
create index if not exists attachments_patient_created_idx on public.attachments(patient_id, created_at desc);

create table if not exists public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  message text,
  created_by uuid references auth.users(id) on delete set null,
  actor_label text,
  actor_org_id uuid references public.organizations(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists case_events_case_created_idx on public.case_events(case_id, created_at desc);

create table if not exists public.case_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_org_id uuid not null references public.organizations(id) on delete restrict,
  sender_name text,
  sender_role text,
  body text not null,
  demo_mode boolean not null default false,
  client_request_id uuid,
  created_at timestamptz not null default now(),
  constraint case_messages_body_length check (char_length(btrim(body)) between 1 and 4000),
  unique (sender_id, client_request_id)
);

create index if not exists case_messages_case_created_idx on public.case_messages(case_id, created_at);
create index if not exists case_messages_sender_org_idx on public.case_messages(sender_org_id);

create table if not exists public.organization_conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_org_id uuid not null references public.organizations(id) on delete cascade,
  lab_org_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived')),
  last_message_at timestamptz not null default now(),
  clinic_last_read_at timestamptz,
  lab_last_read_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_conversations_distinct_parties check (clinic_org_id <> lab_org_id),
  unique (clinic_org_id, lab_org_id)
);

create index if not exists organization_conversations_lab_idx on public.organization_conversations(lab_org_id, last_message_at desc);

create table if not exists public.organization_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.organization_conversations(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_org_id uuid not null references public.organizations(id) on delete restrict,
  sender_name text,
  sender_role text,
  body text not null,
  context_case_id uuid references public.cases(id) on delete set null,
  demo_mode boolean not null default false,
  client_request_id uuid,
  created_at timestamptz not null default now(),
  unique (sender_user_id, client_request_id)
);

create index if not exists organization_messages_conversation_created_idx on public.organization_messages(conversation_id, created_at);
create index if not exists organization_messages_sender_org_idx on public.organization_messages(sender_org_id);
create index if not exists organization_messages_sender_user_idx on public.organization_messages(sender_user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'critical')),
  is_read boolean not null default false,
  read_at timestamptz,
  entity_type text,
  entity_id uuid,
  category text not null default 'system',
  action_path text,
  dedupe_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_title_length check (char_length(btrim(title)) between 1 and 180),
  constraint notifications_body_length check (body is null or char_length(body) <= 2000)
);

create index if not exists notifications_org_unread_idx on public.notifications(organization_id, is_read, created_at desc);
create index if not exists notifications_recipient_idx on public.notifications(recipient_user_id, created_at desc);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'midnight',
  motion_level text not null default 'full' check (motion_level in ('full', 'reduced', 'off')),
  compact_mode boolean not null default false,
  surface_style text not null default 'soft' check (surface_style in ('soft', 'solid', 'glass')),
  font_scale text not null default 'normal' check (font_scale in ('small', 'normal', 'large')),
  custom_accent text,
  use_custom_accent boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint user_preferences_theme_check check (theme in ('midnight', 'ocean', 'emerald', 'violet', 'graphite', 'light', 'cobalt', 'aurora', 'rose', 'amber', 'frost', 'obsidian', 'teal', 'navy', 'sand', 'pearl', 'plum', 'slate', 'mint', 'sky', 'lavender', 'ivory', 'blush', 'sage'))
);

create table if not exists public.user_notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  case_enabled boolean not null default true,
  design_enabled boolean not null default true,
  finance_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  message_enabled boolean not null default true,
  system_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.lab_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  description text,
  city text,
  district text,
  specialties text[] not null default '{}',
  turnaround_days integer check (turnaround_days is null or turnaround_days between 1 and 365),
  accepts_new_cases boolean not null default true,
  website text,
  contact_email text,
  services text[] not null default '{}',
  supported_materials text[] not null default '{}',
  software_stack text[] not null default '{}',
  delivery_regions text[] not null default '{}',
  supports_express boolean not null default false,
  pickup_available boolean not null default false,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'profile_verified', 'pilot_verified')),
  demo_rating numeric(3, 2) check (demo_rating is null or demo_rating between 0 and 5),
  demo_review_count integer not null default 0 check (demo_review_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lab_profiles_description_length check (description is null or char_length(description) <= 2000)
);

create table if not exists public.ai_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  case_id uuid references public.cases(id) on delete set null,
  prompt text not null,
  response text,
  safety_class text not null default 'decision_support',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ai_sessions_prompt_length check (char_length(prompt) between 1 and 4000),
  constraint ai_sessions_response_length check (response is null or char_length(response) <= 30000)
);

create index if not exists ai_sessions_org_created_idx on public.ai_sessions(organization_id, created_at desc);

create table if not exists public.design_projects (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  lab_org_id uuid not null references public.organizations(id) on delete restrict,
  source_scan_id uuid references public.scan_sessions(id) on delete set null,
  title text not null,
  restoration_type text not null,
  tooth_codes text[] not null default '{}',
  material text,
  shade text,
  workflow_stage text not null default 'scan' check (workflow_stage in ('scan', 'margin', 'design', 'contacts', 'thickness', 'review', 'approved')),
  status text not null default 'draft' check (status in ('draft', 'working', 'ready_for_review', 'revision', 'approved', 'archived')),
  settings jsonb not null default '{}'::jsonb,
  margin_points jsonb not null default '[]'::jsonb,
  measurements jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists design_projects_lab_updated_idx on public.design_projects(lab_org_id, updated_at desc);
create index if not exists design_projects_source_scan_idx on public.design_projects(source_scan_id);

create table if not exists public.design_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.design_projects(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  attachment_id uuid references public.attachments(id) on delete set null,
  source_scan_id uuid references public.scan_sessions(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'approved', 'revision_requested', 'superseded')),
  parameters jsonb not null default '{}'::jsonb,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create index if not exists design_versions_attachment_idx on public.design_versions(attachment_id);
create index if not exists design_versions_source_scan_idx on public.design_versions(source_scan_id);

create table if not exists public.case_design_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  attachment_id uuid not null references public.attachments(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'revision_requested', 'superseded')),
  revision_note text,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, version_number)
);

create index if not exists case_design_reviews_submitted_by_idx on public.case_design_reviews(submitted_by);
create index if not exists case_design_reviews_reviewed_by_idx on public.case_design_reviews(reviewed_by);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  from_org_id uuid not null references public.organizations(id) on delete restrict,
  to_org_id uuid not null references public.organizations(id) on delete restrict,
  courier_org_id uuid references public.organizations(id) on delete set null,
  courier_driver_id uuid,
  courier_name text,
  tracking_code text unique,
  status text not null default 'created' check (status in ('created', 'pickup_requested', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
  pickup_at timestamptz,
  delivered_at timestamptz,
  notes text,
  pickup_label text,
  dropoff_label text,
  pickup_lat double precision,
  pickup_lng double precision,
  dropoff_lat double precision,
  dropoff_lng double precision,
  created_by uuid references auth.users(id) on delete set null,
  client_request_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipments_distinct_parties check (from_org_id <> to_org_id),
  constraint shipments_notes_length check (notes is null or char_length(notes) <= 4000),
  unique (from_org_id, client_request_id)
);

create index if not exists shipments_from_org_idx on public.shipments(from_org_id, updated_at desc);
create index if not exists shipments_to_org_idx on public.shipments(to_org_id, updated_at desc);
create index if not exists shipments_courier_org_idx on public.shipments(courier_org_id, updated_at desc);
create index if not exists shipments_case_idx on public.shipments(case_id);

create table if not exists public.courier_drivers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text,
  vehicle_type text not null default 'motorcycle',
  plate text,
  status text not null default 'available' check (status in ('available', 'assigned', 'offline', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shipments
  add constraint shipments_courier_driver_fk
  foreign key (courier_driver_id) references public.courier_drivers(id) on delete set null;

create index if not exists courier_drivers_organization_idx on public.courier_drivers(organization_id);

create table if not exists public.courier_locations (
  id bigint generated by default as identity primary key,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  courier_org_id uuid not null references public.organizations(id) on delete cascade,
  courier_driver_id uuid references public.courier_drivers(id) on delete set null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m is null or accuracy_m >= 0),
  heading_deg double precision check (heading_deg is null or heading_deg between 0 and 360),
  speed_kmh double precision check (speed_kmh is null or speed_kmh >= 0),
  recorded_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists courier_locations_shipment_recorded_idx on public.courier_locations(shipment_id, recorded_at desc);
create index if not exists courier_locations_courier_org_idx on public.courier_locations(courier_org_id, recorded_at desc);

create table if not exists public.scan_annotations (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scan_sessions(id) on delete cascade,
  tooth_code text,
  region_label text,
  title text not null,
  note text,
  severity text not null default 'info' check (severity in ('info', 'watch', 'attention')),
  position_x double precision not null,
  position_y double precision not null,
  position_z double precision not null,
  demo_mode boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint scan_annotations_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint scan_annotations_note_length check (note is null or char_length(note) <= 2000)
);

create index if not exists scan_annotations_scan_created_idx on public.scan_annotations(scan_id, created_at);
create index if not exists scan_annotations_created_by_idx on public.scan_annotations(created_by);

create table if not exists public.tooth_status (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  tooth_code text not null,
  condition text not null default 'unknown',
  material text,
  shade text,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (patient_id, tooth_code)
);

create table if not exists public.dental_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  record_type text not null,
  tooth_code text,
  payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists dental_records_patient_recorded_idx on public.dental_records(patient_id, recorded_at desc);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'dentist', 'assistant', 'technician', 'courier', 'viewer')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint organization_invites_email_length check (char_length(email) between 3 and 320)
);

create index if not exists organization_invites_org_created_idx on public.organization_invites(organization_id, created_at desc);
create unique index if not exists organization_invites_one_pending_email_idx
  on public.organization_invites(organization_id, lower(email))
  where accepted_at is null and revoked_at is null;

-- Shared helpers. SECURITY DEFINER helpers use an empty search_path and fully
-- qualified names to prevent object-shadowing attacks.
create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = target_org_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$$;

create or replace function public.is_org_role(target_org_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships m
    where m.organization_id = target_org_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;

create or replace function public.can_access_case(target_case_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.cases c
    where c.id = target_case_id
      and (
        public.is_org_member(c.clinic_org_id)
        or (c.lab_org_id is not null and public.is_org_member(c.lab_org_id))
      )
  );
$$;

create or replace function public.can_access_patient(target_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patients p
    where p.id = target_patient_id
      and public.is_org_member(p.owning_org_id)
  ) or exists (
    select 1
    from public.cases c
    where c.patient_id = target_patient_id
      and c.lab_org_id is not null
      and public.is_org_member(c.lab_org_id)
  );
$$;

revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.is_org_role(uuid, text[]) from public, anon;
revoke all on function public.can_access_case(uuid) from public, anon;
revoke all on function public.can_access_patient(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_role(uuid, text[]) to authenticated;
grant execute on function public.can_access_case(uuid) to authenticated;
grant execute on function public.can_access_patient(uuid) to authenticated;

-- Authentication/profile bootstrap.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, email)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.enforce_update_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_allowed text[] := tg_argv;
begin
  if (to_jsonb(new) - v_allowed) is distinct from (to_jsonb(old) - v_allowed) then
    raise exception 'Immutable identity or ownership field cannot be changed on %', tg_table_name;
  end if;
  return new;
end;
$$;

create or replace function public.set_patient_external_ref()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.external_ref is null or btrim(new.external_ref) = '' then
    new.external_ref := 'PAT-' || upper(substr(replace(new.id::text, '-', ''), 1, 10));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_patients_external_ref on public.patients;
create trigger trg_patients_external_ref
before insert on public.patients
for each row execute function public.set_patient_external_ref();

-- Organization and case RPCs used by the application.
create or replace function public.create_my_organization(p_name text, p_org_type text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid := gen_random_uuid();
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;
  if p_org_type not in ('clinic', 'laboratory', 'courier') then
    raise exception 'Invalid organization type';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 120 then
    raise exception 'Organization name must be 2 to 120 characters';
  end if;
  if exists (select 1 from public.memberships where user_id = v_uid and status = 'active') then
    raise exception 'User already has an active organization';
  end if;

  insert into public.organizations(id, name, slug, org_type, directory_visible, created_by)
  values (
    v_org_id,
    btrim(p_name),
    lower(p_org_type) || '-' || substr(replace(v_org_id::text, '-', ''), 1, 16),
    p_org_type,
    p_org_type = 'laboratory',
    v_uid
  );

  insert into public.memberships(organization_id, user_id, role, status)
  values (v_org_id, v_uid, 'owner', 'active');

  if p_org_type = 'laboratory' then
    insert into public.lab_profiles(organization_id) values (v_org_id);
  end if;

  return v_org_id;
end;
$$;

revoke all on function public.create_my_organization(text, text) from public, anon;
grant execute on function public.create_my_organization(text, text) to authenticated;

create or replace function public.create_case_from_patient(
  p_patient_id uuid,
  p_lab_org_id uuid,
  p_title text,
  p_case_type text,
  p_tooth_codes text[],
  p_material text default null,
  p_shade text default null,
  p_due_date date default null,
  p_clinical_notes text default null,
  p_priority text default 'normal',
  p_request_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_patient public.patients%rowtype;
  v_case_id uuid;
  v_case_number text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select * into v_patient from public.patients where id = p_patient_id;
  if not found or not public.is_org_role(v_patient.owning_org_id, array['owner', 'admin', 'dentist', 'assistant']) then
    raise exception 'Patient access denied';
  end if;
  if not exists (
    select 1 from public.organizations
    where id = p_lab_org_id and org_type = 'laboratory' and directory_visible
  ) then
    raise exception 'Laboratory is unavailable';
  end if;
  if p_priority not in ('low', 'normal', 'high', 'urgent') then
    raise exception 'Invalid priority';
  end if;
  if coalesce(cardinality(p_tooth_codes), 0) not between 1 and 32 then
    raise exception 'At least one valid tooth code is required';
  end if;

  if p_request_id is not null then
    select id into v_case_id
    from public.cases
    where clinic_org_id = v_patient.owning_org_id and client_request_id = p_request_id;
    if found then return v_case_id; end if;
  end if;

  v_case_id := gen_random_uuid();
  v_case_number := 'DY-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(v_case_id::text, '-', ''), 1, 8));

  insert into public.cases(
    id, case_number, patient_id, clinic_org_id, lab_org_id, patient_reference,
    title, case_type, priority, status, due_date, tooth_codes, material, shade,
    clinical_notes, demo_mode, created_by, updated_by, client_request_id
  ) values (
    v_case_id, v_case_number, v_patient.id, v_patient.owning_org_id, p_lab_org_id,
    coalesce(v_patient.external_ref, 'PATIENT'), btrim(p_title), btrim(p_case_type),
    p_priority, 'new', p_due_date, p_tooth_codes, nullif(btrim(p_material), ''),
    nullif(btrim(p_shade), ''), nullif(btrim(p_clinical_notes), ''),
    v_patient.demo_mode, v_uid, v_uid, p_request_id
  );

  insert into public.case_events(case_id, event_type, to_status, message, created_by, actor_label, actor_org_id)
  values (v_case_id, 'case_created', 'new', 'Vaka oluşturuldu.', v_uid, 'Klinik', v_patient.owning_org_id);

  return v_case_id;
end;
$$;

revoke all on function public.create_case_from_patient(uuid, uuid, text, text, text[], text, text, date, text, text, uuid) from public, anon;
grant execute on function public.create_case_from_patient(uuid, uuid, text, text, text[], text, text, date, text, text, uuid) to authenticated;

-- Team invitation RPCs. Raw tokens are returned once and only their SHA-256
-- hashes are stored.
create or replace function public.dentaya_create_team_invite(
  p_email text,
  p_role text,
  p_expires_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
  v_org_type text;
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_invite_id uuid;
  v_expires_at timestamptz;
begin
  select m.organization_id, o.org_type into v_org_id, v_org_type
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = v_uid and m.status = 'active' and m.role in ('owner', 'admin')
  limit 1;
  if v_org_id is null then raise exception 'Administrator access required'; end if;
  if char_length(btrim(coalesce(p_email, ''))) not between 3 and 320 then raise exception 'Invalid email'; end if;
  if p_role = 'owner' or p_role not in ('admin', 'dentist', 'assistant', 'technician', 'courier', 'viewer') then
    raise exception 'Invalid invite role';
  end if;
  if (v_org_type = 'clinic' and p_role not in ('admin', 'dentist', 'assistant', 'viewer'))
    or (v_org_type = 'laboratory' and p_role not in ('admin', 'technician', 'viewer'))
    or (v_org_type = 'courier' and p_role not in ('admin', 'courier', 'viewer')) then
    raise exception 'Role is not valid for this organization';
  end if;

  update public.organization_invites
  set revoked_at = now()
  where organization_id = v_org_id
    and lower(email) = lower(btrim(p_email))
    and accepted_at is null and revoked_at is null;

  v_expires_at := now() + make_interval(days => greatest(1, least(coalesce(p_expires_days, 7), 30)));
  insert into public.organization_invites(organization_id, email, role, token_hash, expires_at, invited_by)
  values (v_org_id, lower(btrim(p_email)), p_role, encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires_at, v_uid)
  returning id into v_invite_id;

  return jsonb_build_object(
    'invite_id', v_invite_id,
    'organization_id', v_org_id,
    'email', lower(btrim(p_email)),
    'role', p_role,
    'token', v_token,
    'expires_at', v_expires_at
  );
end;
$$;

create or replace function public.dentaya_accept_team_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.organization_invites%rowtype;
  v_org_name text;
  v_existing boolean := false;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select lower(email) into v_email from auth.users where id = v_uid;
  select * into v_invite
  from public.organization_invites
  where token_hash = encode(extensions.digest(btrim(p_token), 'sha256'), 'hex')
  for update;
  if not found or v_invite.revoked_at is not null or v_invite.expires_at <= now() then
    raise exception 'Invite is invalid or expired';
  end if;
  if lower(v_invite.email) <> v_email then raise exception 'Invite email does not match signed-in user'; end if;

  select exists (
    select 1 from public.memberships
    where organization_id = v_invite.organization_id and user_id = v_uid and status = 'active'
  ) into v_existing;

  if exists (
    select 1 from public.memberships
    where user_id = v_uid and status = 'active' and organization_id <> v_invite.organization_id
  ) then
    raise exception 'User already belongs to another active organization';
  end if;

  insert into public.memberships(organization_id, user_id, role, status)
  values (v_invite.organization_id, v_uid, v_invite.role, 'active')
  on conflict (organization_id, user_id) do update
    set role = excluded.role, status = 'active', updated_at = now();

  update public.organization_invites
  set accepted_at = coalesce(accepted_at, now()), accepted_by = v_uid
  where id = v_invite.id;

  select name into v_org_name from public.organizations where id = v_invite.organization_id;
  return jsonb_build_object(
    'organization_id', v_invite.organization_id,
    'organization_name', v_org_name,
    'role', v_invite.role,
    'already_accepted', v_existing
  );
end;
$$;

create or replace function public.dentaya_revoke_team_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.organization_invites i
  set revoked_at = now()
  where i.id = p_invite_id
    and public.is_org_role(i.organization_id, array['owner', 'admin'])
    and i.accepted_at is null;
  if not found then raise exception 'Invite not found or access denied'; end if;
end;
$$;

create or replace function public.dentaya_team_members()
returns table(membership_id uuid, user_id uuid, full_name text, email text, role text, status text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.user_id, coalesce(p.full_name, 'DentAYA Kullanıcısı'), p.email, m.role, m.status, m.created_at
  from public.memberships m
  left join public.profiles p on p.id = m.user_id
  where public.is_org_role(m.organization_id, array['owner', 'admin'])
  order by case when m.role = 'owner' then 0 else 1 end, p.full_name nulls last;
$$;

create or replace function public.dentaya_set_team_member_status(p_membership_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.memberships%rowtype;
  v_actor_role text;
begin
  if p_status not in ('active', 'suspended') then raise exception 'Invalid status'; end if;
  select * into v_target from public.memberships where id = p_membership_id for update;
  select role into v_actor_role from public.memberships
  where organization_id = v_target.organization_id and user_id = auth.uid() and status = 'active';
  if v_actor_role not in ('owner', 'admin') then raise exception 'Administrator access required'; end if;
  if v_target.role = 'owner' then raise exception 'Owner cannot be suspended'; end if;
  if v_actor_role = 'admin' and v_target.role = 'admin' then raise exception 'Only owner can manage administrators'; end if;
  update public.memberships set status = p_status, updated_at = now() where id = p_membership_id;
end;
$$;

create or replace function public.dentaya_set_team_member_role(p_membership_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.memberships%rowtype;
  v_org_type text;
begin
  select * into v_target from public.memberships where id = p_membership_id for update;
  if not public.is_org_role(v_target.organization_id, array['owner']) then raise exception 'Owner access required'; end if;
  if v_target.role = 'owner' or p_role = 'owner' then raise exception 'Owner role cannot be reassigned'; end if;
  select org_type into v_org_type from public.organizations where id = v_target.organization_id;
  if (v_org_type = 'clinic' and p_role not in ('admin', 'dentist', 'assistant', 'viewer'))
    or (v_org_type = 'laboratory' and p_role not in ('admin', 'technician', 'viewer'))
    or (v_org_type = 'courier' and p_role not in ('admin', 'courier', 'viewer')) then
    raise exception 'Role is not valid for this organization';
  end if;
  update public.memberships set role = p_role, updated_at = now() where id = p_membership_id;
end;
$$;

revoke all on function public.dentaya_create_team_invite(text, text, integer) from public, anon;
revoke all on function public.dentaya_accept_team_invite(text) from public, anon;
revoke all on function public.dentaya_revoke_team_invite(uuid) from public, anon;
revoke all on function public.dentaya_team_members() from public, anon;
revoke all on function public.dentaya_set_team_member_status(uuid, text) from public, anon;
revoke all on function public.dentaya_set_team_member_role(uuid, text) from public, anon;
grant execute on function public.dentaya_create_team_invite(text, text, integer) to authenticated;
grant execute on function public.dentaya_accept_team_invite(text) to authenticated;
grant execute on function public.dentaya_revoke_team_invite(uuid) to authenticated;
grant execute on function public.dentaya_team_members() to authenticated;
grant execute on function public.dentaya_set_team_member_status(uuid, text) to authenticated;
grant execute on function public.dentaya_set_team_member_role(uuid, text) to authenticated;

-- Trusted message identity.
create or replace function public.stamp_case_message_sender()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_case public.cases%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_case from public.cases where id = new.case_id;
  if new.sender_org_id <> v_case.clinic_org_id
    and (v_case.lab_org_id is null or new.sender_org_id <> v_case.lab_org_id) then
    raise exception 'Sender organization is not a case participant';
  end if;
  select m.role, coalesce(p.full_name, 'DentAYA Kullanıcısı')
    into new.sender_role, new.sender_name
  from public.memberships m
  left join public.profiles p on p.id = m.user_id
  where m.user_id = v_uid and m.organization_id = new.sender_org_id and m.status = 'active'
    and m.role in ('owner', 'admin', 'dentist', 'assistant', 'technician')
  limit 1;
  if new.sender_role is null then raise exception 'Message write access denied'; end if;
  new.sender_id := v_uid;
  return new;
end;
$$;

revoke all on function public.stamp_case_message_sender() from public, anon, authenticated;
drop trigger if exists trg_stamp_case_message_sender on public.case_messages;
create trigger trg_stamp_case_message_sender
before insert on public.case_messages
for each row execute function public.stamp_case_message_sender();

-- Automatic conversation timestamp maintenance.
create or replace function public.touch_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.organization_conversations
  set last_message_at = new.created_at, updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

revoke all on function public.touch_conversation_after_message() from public, anon, authenticated;
drop trigger if exists trg_touch_conversation_after_message on public.organization_messages;
create trigger trg_touch_conversation_after_message
after insert on public.organization_messages
for each row execute function public.touch_conversation_after_message();

-- Row-level security.
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.patients enable row level security;
alter table public.cases enable row level security;
alter table public.appointments enable row level security;
alter table public.scan_sessions enable row level security;
alter table public.attachments enable row level security;
alter table public.case_events enable row level security;
alter table public.case_messages enable row level security;
alter table public.organization_conversations enable row level security;
alter table public.organization_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_notification_preferences enable row level security;
alter table public.lab_profiles enable row level security;
alter table public.ai_sessions enable row level security;
alter table public.design_projects enable row level security;
alter table public.design_versions enable row level security;
alter table public.case_design_reviews enable row level security;
alter table public.shipments enable row level security;
alter table public.courier_drivers enable row level security;
alter table public.courier_locations enable row level security;
alter table public.scan_annotations enable row level security;
alter table public.tooth_status enable row level security;
alter table public.dental_records enable row level security;
alter table public.organization_invites enable row level security;

create policy profiles_select_self on public.profiles for select using (id = (select auth.uid()));
create policy profiles_insert_self on public.profiles for insert with check (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy organizations_select_member_or_directory on public.organizations for select
using (public.is_org_member(id) or (directory_visible and org_type = 'laboratory'));
create policy organizations_update_admin on public.organizations for update
using (public.is_org_role(id, array['owner', 'admin']))
with check (public.is_org_role(id, array['owner', 'admin']));

create policy memberships_select_self on public.memberships for select using (user_id = (select auth.uid()));

create policy patients_select_accessible on public.patients for select using (public.can_access_patient(id));
create policy patients_insert_clinic on public.patients for insert
with check (public.is_org_role(owning_org_id, array['owner', 'admin', 'dentist', 'assistant']) and created_by = (select auth.uid()));
create policy patients_update_clinic on public.patients for update
using (public.is_org_role(owning_org_id, array['owner', 'admin', 'dentist', 'assistant']))
with check (public.is_org_role(owning_org_id, array['owner', 'admin', 'dentist', 'assistant']));

create policy cases_select_participants on public.cases for select
using (public.is_org_member(clinic_org_id) or (lab_org_id is not null and public.is_org_member(lab_org_id)));
create policy cases_insert_clinic on public.cases for insert
with check (public.is_org_role(clinic_org_id, array['owner', 'admin', 'dentist', 'assistant']) and created_by = (select auth.uid()));
create policy cases_update_participants on public.cases for update
using (
  public.is_org_role(clinic_org_id, array['owner', 'admin', 'dentist', 'assistant'])
  or (lab_org_id is not null and public.is_org_role(lab_org_id, array['owner', 'admin', 'technician']))
)
with check (
  public.is_org_role(clinic_org_id, array['owner', 'admin', 'dentist', 'assistant'])
  or (lab_org_id is not null and public.is_org_role(lab_org_id, array['owner', 'admin', 'technician']))
);

create policy appointments_clinic_all on public.appointments for all
using (public.is_org_role(organization_id, array['owner', 'admin', 'dentist', 'assistant']))
with check (
  public.is_org_role(organization_id, array['owner', 'admin', 'dentist', 'assistant'])
  and exists (select 1 from public.patients p where p.id = patient_id and p.owning_org_id = organization_id)
);

create policy scan_sessions_select_accessible on public.scan_sessions for select
using (public.can_access_patient(patient_id) or (case_id is not null and public.can_access_case(case_id)));
create policy scan_sessions_insert_member on public.scan_sessions for insert
with check (
  created_by = (select auth.uid())
  and public.is_org_role(captured_by_org_id, array['owner', 'admin', 'dentist', 'assistant', 'technician'])
  and public.can_access_patient(patient_id)
);
create policy scan_sessions_update_creator on public.scan_sessions for update
using (created_by = (select auth.uid()) and public.can_access_patient(patient_id))
with check (created_by = (select auth.uid()) and public.can_access_patient(patient_id));
create policy scan_sessions_delete_creator on public.scan_sessions for delete
using (created_by = (select auth.uid()) and public.can_access_patient(patient_id));

create policy attachments_select_accessible on public.attachments for select
using ((case_id is not null and public.can_access_case(case_id)) or (patient_id is not null and public.can_access_patient(patient_id)));
create policy attachments_insert_accessible on public.attachments for insert
with check (
  created_by = (select auth.uid())
  and ((case_id is not null and public.can_access_case(case_id)) or (patient_id is not null and public.can_access_patient(patient_id)))
);
create policy attachments_delete_creator on public.attachments for delete using (created_by = (select auth.uid()));

create policy case_events_select_participants on public.case_events for select using (public.can_access_case(case_id));
create policy case_events_insert_participants on public.case_events for insert
with check (public.can_access_case(case_id) and created_by = (select auth.uid()));

create policy case_messages_select_participants on public.case_messages for select using (public.can_access_case(case_id));
create policy case_messages_insert_participants on public.case_messages for insert
with check (public.can_access_case(case_id) and public.is_org_member(sender_org_id));

create policy org_conversations_select_participants on public.organization_conversations for select
using (public.is_org_member(clinic_org_id) or public.is_org_member(lab_org_id));
create policy org_conversations_insert_clinic on public.organization_conversations for insert
with check (
  public.is_org_role(clinic_org_id, array['owner', 'admin', 'dentist', 'assistant'])
  and exists (select 1 from public.organizations o where o.id = lab_org_id and o.org_type = 'laboratory' and o.directory_visible)
);
create policy org_conversations_update_participants on public.organization_conversations for update
using (public.is_org_member(clinic_org_id) or public.is_org_member(lab_org_id))
with check (public.is_org_member(clinic_org_id) or public.is_org_member(lab_org_id));

create policy org_messages_select_participants on public.organization_messages for select
using (exists (
  select 1 from public.organization_conversations c
  where c.id = conversation_id and (public.is_org_member(c.clinic_org_id) or public.is_org_member(c.lab_org_id))
));
create policy org_messages_participant_insert on public.organization_messages for insert
with check (public.is_org_member(sender_org_id));

create policy notifications_select_members on public.notifications for select
using (public.is_org_member(organization_id) and (recipient_user_id is null or recipient_user_id = (select auth.uid())));
create policy notifications_update_members on public.notifications for update
using (public.is_org_member(organization_id) and (recipient_user_id is null or recipient_user_id = (select auth.uid())))
with check (public.is_org_member(organization_id) and (recipient_user_id is null or recipient_user_id = (select auth.uid())));

create policy user_preferences_self on public.user_preferences for all
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy user_notification_preferences_self on public.user_notification_preferences for all
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy lab_profiles_select_directory on public.lab_profiles for select
using (public.is_org_member(organization_id) or exists (
  select 1 from public.organizations o where o.id = organization_id and o.org_type = 'laboratory' and o.directory_visible
));
create policy lab_profiles_manage_lab on public.lab_profiles for all
using (public.is_org_role(organization_id, array['owner', 'admin']))
with check (public.is_org_role(organization_id, array['owner', 'admin']));

create policy ai_sessions_select_members on public.ai_sessions for select using (public.is_org_member(organization_id));
create policy ai_sessions_insert_members on public.ai_sessions for insert
with check (public.is_org_member(organization_id) and created_by = (select auth.uid()));

create policy design_projects_select_participants on public.design_projects for select using (public.can_access_case(case_id));
create policy design_projects_manage_lab on public.design_projects for all
using (public.is_org_role(lab_org_id, array['owner', 'admin', 'technician']))
with check (
  public.is_org_role(lab_org_id, array['owner', 'admin', 'technician'])
  and exists (select 1 from public.cases c where c.id = case_id and c.lab_org_id = lab_org_id)
);

create policy design_versions_select_participants on public.design_versions for select
using (exists (select 1 from public.design_projects p where p.id = project_id and public.can_access_case(p.case_id)));
create policy design_versions_insert_lab on public.design_versions for insert
with check (exists (
  select 1 from public.design_projects p
  where p.id = project_id and public.is_org_role(p.lab_org_id, array['owner', 'admin', 'technician'])
));

create policy design_reviews_select_participants on public.case_design_reviews for select using (public.can_access_case(case_id));
create policy design_reviews_insert_lab on public.case_design_reviews for insert
with check (public.can_access_case(case_id) and submitted_by = (select auth.uid()));
create policy design_reviews_update_clinic on public.case_design_reviews for update
using (exists (
  select 1 from public.cases c
  where c.id = case_id and public.is_org_role(c.clinic_org_id, array['owner', 'admin', 'dentist'])
))
with check (exists (
  select 1 from public.cases c
  where c.id = case_id and public.is_org_role(c.clinic_org_id, array['owner', 'admin', 'dentist'])
));

create policy shipments_select_participants on public.shipments for select
using (public.is_org_member(from_org_id) or public.is_org_member(to_org_id) or (courier_org_id is not null and public.is_org_member(courier_org_id)));
create policy shipments_insert_participants on public.shipments for insert
with check (created_by = (select auth.uid()) and (public.is_org_member(from_org_id) or public.is_org_member(to_org_id)));
create policy shipments_update_courier on public.shipments for update
using (courier_org_id is not null and public.is_org_role(courier_org_id, array['owner', 'admin', 'courier']))
with check (courier_org_id is not null and public.is_org_role(courier_org_id, array['owner', 'admin', 'courier']));

create policy courier_drivers_select_courier on public.courier_drivers for select using (public.is_org_member(organization_id));
create policy courier_drivers_manage_admin on public.courier_drivers for all
using (public.is_org_role(organization_id, array['owner', 'admin']))
with check (public.is_org_role(organization_id, array['owner', 'admin']));

create policy courier_locations_select_participants on public.courier_locations for select
using (exists (select 1 from public.shipments s where s.id = shipment_id and (
  public.is_org_member(s.from_org_id) or public.is_org_member(s.to_org_id) or (s.courier_org_id is not null and public.is_org_member(s.courier_org_id))
)));
create policy courier_locations_insert_courier on public.courier_locations for insert
with check (public.is_org_role(courier_org_id, array['owner', 'admin', 'courier']) and created_by = (select auth.uid()));

create policy scan_annotations_select_accessible on public.scan_annotations for select
using (exists (select 1 from public.scan_sessions s where s.id = scan_id and public.can_access_patient(s.patient_id)));
create policy scan_annotations_insert_accessible on public.scan_annotations for insert
with check (created_by = (select auth.uid()) and exists (
  select 1 from public.scan_sessions s where s.id = scan_id and public.can_access_patient(s.patient_id)
));
create policy scan_annotations_delete_creator on public.scan_annotations for delete using (created_by = (select auth.uid()));

create policy tooth_status_select_accessible on public.tooth_status for select
using (public.can_access_patient(patient_id));
create policy tooth_status_write_clinic on public.tooth_status for all
using (exists (
  select 1 from public.patients p
  where p.id = patient_id and public.is_org_role(p.owning_org_id, array['owner', 'admin', 'dentist', 'assistant'])
))
with check (exists (
  select 1 from public.patients p
  where p.id = patient_id and public.is_org_role(p.owning_org_id, array['owner', 'admin', 'dentist', 'assistant'])
));
create policy dental_records_select_accessible on public.dental_records for select
using (public.can_access_patient(patient_id));
create policy dental_records_write_clinic on public.dental_records for all
using (exists (
  select 1 from public.patients p
  where p.id = patient_id and public.is_org_role(p.owning_org_id, array['owner', 'admin', 'dentist', 'assistant'])
))
with check (exists (
  select 1 from public.patients p
  where p.id = patient_id and public.is_org_role(p.owning_org_id, array['owner', 'admin', 'dentist', 'assistant'])
));

create policy organization_invites_select_admin on public.organization_invites for select
using (public.is_org_role(organization_id, array['owner', 'admin']));

-- Updated-at triggers.
create trigger organizations_guard_identity before update on public.organizations
for each row execute function public.enforce_update_columns('name', 'directory_visible', 'updated_at');
create trigger patients_guard_identity before update on public.patients
for each row execute function public.enforce_update_columns(
  'external_ref', 'first_name', 'last_name', 'date_of_birth', 'sex', 'phone', 'email',
  'blood_group', 'allergy_notes', 'medical_notes', 'dental_notes', 'consent_status', 'updated_at'
);
create trigger cases_guard_identity before update on public.cases
for each row execute function public.enforce_update_columns(
  'title', 'case_type', 'priority', 'status', 'due_date', 'tooth_codes', 'material',
  'shade', 'clinical_notes', 'lab_notes', 'updated_by', 'updated_at'
);
create trigger appointments_guard_identity before update on public.appointments
for each row execute function public.enforce_update_columns(
  'appointment_type', 'scheduled_at', 'duration_minutes', 'status', 'notes', 'updated_at'
);
create trigger scan_sessions_guard_identity before update on public.scan_sessions
for each row execute function public.enforce_update_columns(
  'scanner_brand', 'scanner_model', 'captured_at', 'file_name', 'storage_bucket', 'storage_path',
  'mesh_points', 'triangle_count', 'completeness_score', 'occlusion_rms_mm', 'shade_reference',
  'metrics', 'notes', 'scan_purpose', 'updated_at'
);
create trigger organization_conversations_guard_identity before update on public.organization_conversations
for each row execute function public.enforce_update_columns(
  'status', 'last_message_at', 'clinic_last_read_at', 'lab_last_read_at', 'updated_at'
);
create trigger notifications_guard_payload before update on public.notifications
for each row execute function public.enforce_update_columns('is_read', 'read_at', 'updated_at');
create trigger design_projects_guard_identity before update on public.design_projects
for each row execute function public.enforce_update_columns(
  'source_scan_id', 'title', 'restoration_type', 'tooth_codes', 'material', 'shade',
  'workflow_stage', 'status', 'settings', 'margin_points', 'measurements', 'updated_by', 'updated_at'
);
create trigger case_design_reviews_guard_identity before update on public.case_design_reviews
for each row execute function public.enforce_update_columns(
  'status', 'revision_note', 'reviewed_by', 'reviewed_at', 'updated_at'
);
create trigger shipments_guard_identity before update on public.shipments
for each row execute function public.enforce_update_columns(
  'courier_org_id', 'courier_driver_id', 'courier_name', 'tracking_code', 'status',
  'pickup_at', 'delivered_at', 'notes', 'pickup_label', 'dropoff_label',
  'pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng', 'updated_at'
);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships for each row execute function public.set_updated_at();
create trigger patients_set_updated_at before update on public.patients for each row execute function public.set_updated_at();
create trigger cases_set_updated_at before update on public.cases for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger scan_sessions_set_updated_at before update on public.scan_sessions for each row execute function public.set_updated_at();
create trigger organization_conversations_set_updated_at before update on public.organization_conversations for each row execute function public.set_updated_at();
create trigger notifications_set_updated_at before update on public.notifications for each row execute function public.set_updated_at();
create trigger lab_profiles_set_updated_at before update on public.lab_profiles for each row execute function public.set_updated_at();
create trigger design_projects_set_updated_at before update on public.design_projects for each row execute function public.set_updated_at();
create trigger case_design_reviews_set_updated_at before update on public.case_design_reviews for each row execute function public.set_updated_at();
create trigger shipments_set_updated_at before update on public.shipments for each row execute function public.set_updated_at();
create trigger courier_drivers_set_updated_at before update on public.courier_drivers for each row execute function public.set_updated_at();

-- Private storage buckets and access rules.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'dentaya-files',
  'dentaya-files',
  false,
  104857600,
  array['model/stl', 'model/mesh', 'application/sla', 'application/vnd.ms-pki.stl', 'application/octet-stream', 'application/ply', 'application/x-ply', 'text/plain', 'image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets(id, name, public, file_size_limit)
values ('public-demo', 'public-demo', true, 104857600)
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

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
  return false;
exception when invalid_text_representation then
  return false;
end;
$$;

revoke all on function public.can_access_dentaya_object(text) from public, anon;
grant execute on function public.can_access_dentaya_object(text) to authenticated;

create policy dentaya_files_select_accessible on storage.objects for select to authenticated
using (bucket_id = 'dentaya-files' and public.can_access_dentaya_object(name));
create policy dentaya_files_insert_accessible on storage.objects for insert to authenticated
with check (bucket_id = 'dentaya-files' and public.can_access_dentaya_object(name));
create policy dentaya_files_update_owner on storage.objects for update to authenticated
using (bucket_id = 'dentaya-files' and owner_id::text = (select auth.uid())::text and public.can_access_dentaya_object(name))
with check (bucket_id = 'dentaya-files' and owner_id::text = (select auth.uid())::text and public.can_access_dentaya_object(name));
create policy dentaya_files_delete_owner on storage.objects for delete to authenticated
using (bucket_id = 'dentaya-files' and owner_id::text = (select auth.uid())::text and public.can_access_dentaya_object(name));
create policy public_demo_read on storage.objects for select to anon, authenticated using (bucket_id = 'public-demo');

-- Realtime tables used by the UI. The duplicate-object guard keeps this safe
-- across hosted projects where a table may already be in the publication.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'cases', 'patients', 'shipments', 'notifications', 'case_messages',
    'organization_messages', 'courier_locations', 'scan_annotations'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    exception when duplicate_object or undefined_object then
      null;
    end;
  end loop;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_update_columns() from public, anon, authenticated;
revoke all on function public.set_patient_external_ref() from public, anon, authenticated;
