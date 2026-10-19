import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

type Row<T extends Record<string, unknown>> = T;

const ids = {
  clinicUser: "00000000-0000-4000-8000-000000000101",
  labUser: "00000000-0000-4000-8000-000000000102",
  courierUser: "00000000-0000-4000-8000-000000000103",
  clinicOrg: "00000000-0000-4000-8000-000000000201",
  labOrg: "00000000-0000-4000-8000-000000000202",
  courierOrg: "00000000-0000-4000-8000-000000000203",
  patient: "00000000-0000-4000-8000-000000000301",
  caseId: "00000000-0000-4000-8000-000000000401",
  project: "00000000-0000-4000-8000-000000000501",
  design1: "00000000-0000-4000-8000-000000000601",
  design2: "00000000-0000-4000-8000-000000000602",
  driver: "00000000-0000-4000-8000-000000000701",
  shipmentRequest1: "00000000-0000-4000-8000-000000000801",
  shipmentRequest2: "00000000-0000-4000-8000-000000000802",
};

const database = new PGlite({ extensions: { pgcrypto } });

await database.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema extensions;
  create schema auth;
  create function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );

  create schema storage;
  create table storage.buckets (
    id text primary key,
    name text not null unique,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key,
    bucket_id text not null references storage.buckets(id),
    name text not null,
    owner_id uuid
  );
  alter table storage.objects enable row level security;
`);

const migrationsDirectory = path.join(process.cwd(), "supabase", "migrations");
const migrationFiles = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of migrationFiles) {
  const sql = await readFile(path.join(migrationsDirectory, file), "utf8");
  try {
    await database.exec(sql);
  } catch (error) {
    throw new Error(`Migration failed before E2E workflow test: ${file}`, { cause: error });
  }
}

async function asUser(userId: string) {
  await database.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId]);
}

async function expectFailure(label: string, action: () => Promise<unknown>, pattern?: RegExp) {
  let error: unknown = null;
  try {
    await action();
  } catch (caught) {
    error = caught;
  }

  assert.ok(error, `${label}: expected the database to reject the operation.`);
  if (pattern) {
    const message = error instanceof Error ? error.message : String(error);
    assert.match(message, pattern, `${label}: rejection did not match the expected guard.`);
  }
}

async function caseStatus() {
  const result = await database.query<Row<{ status: string }>>(
    `select status from public.cases where id = $1`,
    [ids.caseId],
  );
  return result.rows[0]?.status;
}

await database.exec(`
  insert into auth.users(id, email) values
    ('${ids.clinicUser}', 'clinic@dentaya.test'),
    ('${ids.labUser}', 'lab@dentaya.test'),
    ('${ids.courierUser}', 'courier@dentaya.test');

  insert into public.profiles(id, full_name, email) values
    ('${ids.clinicUser}', 'DentAYA Klinik', 'clinic@dentaya.test'),
    ('${ids.labUser}', 'DentAYA Lab', 'lab@dentaya.test'),
    ('${ids.courierUser}', 'DentAYA Kurye', 'courier@dentaya.test')
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;

  insert into public.organizations(
    id, name, slug, org_type, directory_visible, created_by,
    address_line1, address_district, address_city, address_country_code,
    address_formatted, address_lat, address_lng, address_place_id, address_verified_at
  ) values
    (
      '${ids.clinicOrg}', 'DentAYA Pilot Klinik', 'dentaya-pilot-klinik', 'clinic', false, '${ids.clinicUser}',
      'Bağdat Caddesi No: 100', 'Kadıköy', 'İstanbul', 'TR',
      'Bağdat Caddesi No: 100, Kadıköy, İstanbul, Türkiye', 40.970900, 29.064800, 'clinic-place', now()
    ),
    (
      '${ids.labOrg}', 'DentAYA Pilot Lab', 'dentaya-pilot-lab', 'laboratory', true, '${ids.labUser}',
      'Atatürk Caddesi No: 25', 'Konak', 'İzmir', 'TR',
      'Atatürk Caddesi No: 25, Konak, İzmir, Türkiye', 38.423700, 27.142800, 'lab-place', now()
    ),
    ('${ids.courierOrg}', 'DentAYA Pilot Kurye', 'dentaya-pilot-kurye', 'courier', true, '${ids.courierUser}', null, null, null, 'TR', null, null, null, null, null);

  insert into public.memberships(organization_id, user_id, role, status) values
    ('${ids.clinicOrg}', '${ids.clinicUser}', 'dentist', 'active'),
    ('${ids.labOrg}', '${ids.labUser}', 'technician', 'active'),
    ('${ids.courierOrg}', '${ids.courierUser}', 'courier', 'active');

  insert into public.patients(id, owning_org_id, first_name, last_name, consent_status, created_by) values
    ('${ids.patient}', '${ids.clinicOrg}', 'Pilot', 'Hasta', 'granted', '${ids.clinicUser}');

  insert into public.cases(
    id, case_number, patient_id, clinic_org_id, lab_org_id, patient_reference,
    title, case_type, status, tooth_codes, created_by, updated_by
  ) values (
    '${ids.caseId}', 'DYA-RC11-001', '${ids.patient}', '${ids.clinicOrg}', '${ids.labOrg}',
    'Pilot Hasta', 'RC11 Uçtan Uca Pilot Ops Test', 'crown', 'new', array['11'],
    '${ids.clinicUser}', '${ids.clinicUser}'
  );

  insert into public.courier_drivers(
    id, organization_id, user_id, full_name, vehicle_type, plate, status
  ) values (
    '${ids.driver}', '${ids.courierOrg}', '${ids.courierUser}', 'Pilot Sürücü',
    'motorcycle', '35 DYA 006', 'available'
  );
`);

await asUser(ids.clinicUser);
await expectFailure(
  "clinic cannot accept a laboratory case",
  () => database.query(`select public.dentaya_transition_case($1, 'accepted')`, [ids.caseId]),
  /Only the assigned laboratory can accept/i,
);

await asUser(ids.labUser);
await database.query(`select public.dentaya_transition_case($1, 'accepted')`, [ids.caseId]);
assert.equal(await caseStatus(), "accepted", "Lab acceptance must move the case to accepted.");

await expectFailure(
  "illegal accepted → qc transition",
  () => database.query(`update public.cases set status = 'qc' where id = $1`, [ids.caseId]),
  /Invalid DentAYA case transition/i,
);

await database.exec(`
  insert into public.attachments(
    id, patient_id, case_id, storage_bucket, storage_path, file_name, category, created_by
  ) values (
    '${ids.design1}', '${ids.patient}', '${ids.caseId}', 'dentaya-files',
    'cases/${ids.caseId}/design-v1.stl', 'design-v1.stl', 'design', '${ids.labUser}'
  );

  insert into public.design_projects(
    id, case_id, lab_org_id, title, restoration_type, tooth_codes, status, workflow_stage,
    created_by, updated_by
  ) values (
    '${ids.project}', '${ids.caseId}', '${ids.labOrg}', 'Pilot Crown', 'crown', array['11'],
    'working', 'design', '${ids.labUser}', '${ids.labUser}'
  );
`);

const v1 = await database.query<Row<{ id: string }>>(
  `select public.dentaya_submit_design_version($1, $2, null, 1, '{}'::jsonb, 'RC8 v1') as id`,
  [ids.project, ids.design1],
);
assert.ok(v1.rows[0]?.id, "Design v1 must be submitted transactionally.");
assert.equal(await caseStatus(), "approval", "Submitting v1 must move the case to approval.");

const review1Result = await database.query<Row<{ id: string }>>(
  `select id from public.case_design_reviews where case_id = $1 and version_number = 1`,
  [ids.caseId],
);
const review1 = review1Result.rows[0]?.id;
assert.ok(review1, "Design v1 must create exactly one review row.");

await asUser(ids.clinicUser);
await database.query(
  `select public.dentaya_review_design($1, 'revision_requested', 'Kontakt bölgesini düzelt.')`,
  [review1],
);
assert.equal(await caseStatus(), "design", "A revision request must return the case to design.");

await expectFailure(
  "second decision on the same design review",
  () => database.query(`select public.dentaya_review_design($1, 'approved', null)`, [review1]),
  /already been decided|final/i,
);

await asUser(ids.labUser);
await database.exec(`
  insert into public.attachments(
    id, patient_id, case_id, storage_bucket, storage_path, file_name, category, created_by
  ) values (
    '${ids.design2}', '${ids.patient}', '${ids.caseId}', 'dentaya-files',
    'cases/${ids.caseId}/design-v2.stl', 'design-v2.stl', 'design', '${ids.labUser}'
  );
`);

const v2 = await database.query<Row<{ id: string }>>(
  `select public.dentaya_submit_design_version($1, $2, null, 2, '{}'::jsonb, 'RC8 v2') as id`,
  [ids.project, ids.design2],
);
assert.ok(v2.rows[0]?.id, "Design v2 must be submitted after revision.");
assert.equal(await caseStatus(), "approval", "Submitting v2 must move the case back to approval.");

await expectFailure(
  "stale concurrent design version",
  () => database.query(
    `select public.dentaya_submit_design_version($1, $2, null, 2, '{}'::jsonb, 'stale')`,
    [ids.project, ids.design2],
  ),
  /review is already pending|version changed concurrently|Case is not ready for a design submission/i,
);

const review2Result = await database.query<Row<{ id: string }>>(
  `select id from public.case_design_reviews where case_id = $1 and version_number = 2`,
  [ids.caseId],
);
const review2 = review2Result.rows[0]?.id;
assert.ok(review2, "Design v2 must create a second review row.");

await asUser(ids.clinicUser);
await database.query(`select public.dentaya_review_design($1, 'approved', null)`, [review2]);
assert.equal(await caseStatus(), "production", "Approval must move the case to production.");

await asUser(ids.labUser);
await database.query(`select public.dentaya_transition_case($1, 'qc')`, [ids.caseId]);
await database.query(`select public.dentaya_transition_case($1, 'ready')`, [ids.caseId]);
assert.equal(await caseStatus(), "ready", "Lab must be able to move production → qc → ready atomically.");

await asUser(ids.clinicUser);
const shipment1 = await database.query<Row<{ id: string }>>(
  `select public.dentaya_create_case_shipment($1, null, $2) as id`,
  [ids.caseId, ids.shipmentRequest1],
);
const shipmentId = shipment1.rows[0]?.id;
assert.ok(shipmentId, "Ready case must create a shipment.");

const routeSnapshot = await database.query<Row<{
  pickup_address_text: string | null;
  dropoff_address_text: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
}>>(
  `select pickup_address_text, dropoff_address_text, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng
   from public.shipments where id = $1`,
  [shipmentId],
);
assert.equal(
  routeSnapshot.rows[0]?.pickup_address_text,
  "Atatürk Caddesi No: 25, Konak, İzmir, Türkiye",
  "Shipment must snapshot the laboratory pickup address.",
);
assert.equal(
  routeSnapshot.rows[0]?.dropoff_address_text,
  "Bağdat Caddesi No: 100, Kadıköy, İstanbul, Türkiye",
  "Shipment must snapshot the clinic delivery address.",
);
assert.equal(routeSnapshot.rows[0]?.pickup_lat, 38.4237, "Shipment must copy laboratory latitude.");
assert.equal(routeSnapshot.rows[0]?.dropoff_lng, 29.0648, "Shipment must copy clinic longitude.");

const shipment2 = await database.query<Row<{ id: string }>>(
  `select public.dentaya_create_case_shipment($1, null, $2) as id`,
  [ids.caseId, ids.shipmentRequest2],
);
assert.equal(
  shipment2.rows[0]?.id,
  shipmentId,
  "Creating another shipment while one is active must be idempotent.",
);

await expectFailure(
  "second active shipment unique index",
  () => database.query(
    `insert into public.shipments(
      case_id, from_org_id, to_org_id, tracking_code, status, created_by, client_request_id
    ) values ($1, $2, $3, 'DYA-RC11-DUP', 'created', $4, gen_random_uuid())`,
    [ids.caseId, ids.labOrg, ids.clinicOrg, ids.clinicUser],
  ),
  /shipments_one_active_per_case_idx|duplicate key/i,
);

await database.query(`select public.dentaya_assign_courier($1, $2)`, [shipmentId, ids.courierOrg]);

await asUser(ids.courierUser);
await expectFailure(
  "pickup without driver",
  () => database.query(`update public.shipments set status = 'picked_up' where id = $1`, [shipmentId]),
  /Select a courier driver before pickup/i,
);

await database.query(
  `update public.shipments set courier_driver_id = $2, courier_name = 'Pilot Sürücü' where id = $1`,
  [shipmentId, ids.driver],
);

await expectFailure(
  "courier cannot publish location for another organization",
  () => database.query(
    `insert into public.courier_locations(
      shipment_id, courier_org_id, courier_driver_id, latitude, longitude, accuracy_m, recorded_at, created_by
    ) values ($1, $2, $3, 38.4237, 27.1428, 8, now(), $4)`,
    [shipmentId, ids.clinicOrg, ids.driver, ids.courierUser],
  ),
  /organization does not match/i,
);

await database.query(
  `insert into public.courier_locations(
    shipment_id, courier_org_id, courier_driver_id, latitude, longitude, accuracy_m, recorded_at, created_by
  ) values ($1, $2, $3, 38.4237, 27.1428, 8, now() - interval '2 minutes', $4)`,
  [shipmentId, ids.courierOrg, ids.driver, ids.courierUser],
);

await database.query(`update public.shipments set status = 'picked_up' where id = $1`, [shipmentId]);
assert.equal(await caseStatus(), "shipped", "Pickup must synchronize the case to shipped.");

await database.query(`update public.shipments set status = 'in_transit' where id = $1`, [shipmentId]);
await database.query(
  `insert into public.courier_locations(
    shipment_id, courier_org_id, courier_driver_id, latitude, longitude, accuracy_m, recorded_at, created_by
  ) values ($1, $2, $3, 38.4300, 27.1550, 7, now(), $4)`,
  [shipmentId, ids.courierOrg, ids.driver, ids.courierUser],
);

await database.query(
  `select public.dentaya_record_route_snapshot($1, 470000, 18000, 455000, 17400, now() + interval '4 hours 50 minutes', 'encoded-polyline')`,
  [shipmentId],
);

const routeMetrics = await database.query<Row<{
  planned_distance_meters: number | null;
  planned_duration_seconds: number | null;
  remaining_distance_meters: number | null;
  remaining_duration_seconds: number | null;
}>>(
  `select planned_distance_meters, planned_duration_seconds, remaining_distance_meters, remaining_duration_seconds
   from public.shipments where id = $1`,
  [shipmentId],
);
assert.equal(routeMetrics.rows[0]?.planned_distance_meters, 470000, "Planned route distance must be persisted.");
assert.equal(routeMetrics.rows[0]?.remaining_duration_seconds, 17400, "Remaining ETA duration must be persisted.");

await database.query(
  `select public.dentaya_record_route_snapshot($1, 470000, 18000, 12000, 600, now() + interval '10 minutes', 'encoded-polyline-near')`,
  [shipmentId],
);

const etaNotification = await database.query<Row<{ count: number }>>(
  `select count(*)::int as count
   from public.notifications
   where organization_id = $1
     and entity_id = $2
     and title = 'Kurye yaklaşıyor'`,
  [ids.clinicOrg, shipmentId],
);
assert.equal(etaNotification.rows[0]?.count, 1, "Crossing the 15-minute dropoff window must notify the clinic exactly once.");

await database.query(
  `select public.dentaya_record_route_snapshot($1, 470000, 18000, 6000, 300, now() + interval '5 minutes', 'encoded-polyline-nearer')`,
  [shipmentId],
);
const etaNotificationDedupe = await database.query<Row<{ count: number }>>(
  `select count(*)::int as count
   from public.notifications
   where organization_id = $1
     and entity_id = $2
     and title = 'Kurye yaklaşıyor'`,
  [ids.clinicOrg, shipmentId],
);
assert.equal(etaNotificationDedupe.rows[0]?.count, 1, "ETA refreshes inside the threshold must not duplicate the arrival notification.");

await expectFailure(
  "delivery without proof",
  () => database.query(`update public.shipments set status = 'delivered' where id = $1`, [shipmentId]),
  /Delivery proof is required/i,
);

await database.query(
  `select public.dentaya_complete_delivery($1, 'Pilot Klinik Resepsiyon', '4821', 'Hasarsız teslim edildi.', null)`,
  [shipmentId],
);
assert.equal(await caseStatus(), "delivered", "Delivery proof completion must synchronize the case to delivered.");

const delivered = await database.query<Row<{
  pickup_at: string | null;
  delivered_at: string | null;
  actual_distance_meters: number | null;
  actual_duration_seconds: number | null;
  remaining_distance_meters: number | null;
}>>(
  `select pickup_at::text, delivered_at::text, actual_distance_meters, actual_duration_seconds, remaining_distance_meters
   from public.shipments where id = $1`,
  [shipmentId],
);
assert.ok(delivered.rows[0]?.pickup_at, "pickup_at must be stamped by the database.");
assert.ok(delivered.rows[0]?.delivered_at, "delivered_at must be stamped by the database.");
assert.ok((delivered.rows[0]?.actual_distance_meters ?? 0) > 0, "Actual courier distance must be derived from live locations.");
assert.equal(delivered.rows[0]?.remaining_distance_meters, 0, "Delivered shipment must have zero remaining distance.");

const deliveryProof = await database.query<Row<{
  recipient_name: string;
  confirmation_code_last4: string | null;
  delivery_note: string | null;
}>>(
  `select recipient_name, confirmation_code_last4, delivery_note
   from public.shipment_delivery_proofs where shipment_id = $1`,
  [shipmentId],
);
assert.equal(deliveryProof.rows[0]?.recipient_name, "Pilot Klinik Resepsiyon", "Delivery proof recipient must be stored.");
assert.equal(deliveryProof.rows[0]?.confirmation_code_last4, "4821", "Only the masked confirmation suffix must remain readable.");

await expectFailure(
  "delivered shipment regression",
  () => database.query(`update public.shipments set status = 'in_transit' where id = $1`, [shipmentId]),
  /Invalid DentAYA shipment transition/i,
);

await expectFailure(
  "delivered case regression",
  () => database.query(`update public.cases set status = 'qc' where id = $1`, [ids.caseId]),
  /Invalid DentAYA case transition/i,
);

const summary = await database.query<Row<{
  case_status: string;
  shipment_status: string;
  versions: number;
  reviews: number;
  events: number;
}>>(`
  select
    c.status as case_status,
    s.status as shipment_status,
    (select count(*)::int from public.design_versions v where v.project_id = '${ids.project}') as versions,
    (select count(*)::int from public.case_design_reviews r where r.case_id = '${ids.caseId}') as reviews,
    (select count(*)::int from public.case_events e where e.case_id = '${ids.caseId}') as events
  from public.cases c
  join public.shipments s on s.case_id = c.id
  where c.id = '${ids.caseId}'
`);

assert.deepEqual(
  {
    case_status: summary.rows[0]?.case_status,
    shipment_status: summary.rows[0]?.shipment_status,
    versions: summary.rows[0]?.versions,
    reviews: summary.rows[0]?.reviews,
  },
  { case_status: "delivered", shipment_status: "delivered", versions: 2, reviews: 2 },
);

// Real SQL/RLS checks for versioned pilot evidence.
await asUser(ids.clinicUser);
const validationArgs: unknown[] = [ids.clinicOrg,"D-04","PILOT-01/r1","1.0.0-rc.33","synthetic","passed","Reloaded mesh equals the source mesh","Mesh coordinates and FDI remain unchanged","report://CAD-001/SHA256-test","",12,"none","",ids.caseId,null];
const recordValidation = (args:unknown[]) => database.query<{id:string}>(`select public.dentaya_record_validation_run(${args.map((_,i)=>"$"+(i+1)).join(",")}) as id`,args);
const validation1=(await recordValidation(validationArgs)).rows[0].id;
assert.ok(validation1);
await expectFailure("empty acceptance criteria",()=>recordValidation(validationArgs.map((v,i)=>i===6?"":v)));
await expectFailure("clinical evidence without authorization reference",()=>recordValidation(validationArgs.map((v,i)=>i===4?"prospective":v)));
await expectFailure("critical finding cannot pass",()=>recordValidation(validationArgs.map((v,i)=>i===11?"critical":v)));
await expectFailure("failed result needs a correction plan",()=>recordValidation(validationArgs.map((v,i)=>i===5?"failed":v)));
await asUser(ids.labUser);
await expectFailure("other organization cannot add evidence",()=>recordValidation(validationArgs),/permission denied/i);
await expectFailure("cross organization correction",()=>recordValidation(validationArgs.map((v,i)=>i===0?ids.labOrg:i===14?validation1:v)),/does not match/i);
await asUser(ids.courierUser);
await expectFailure("courier cannot add clinical evidence",()=>recordValidation(validationArgs),/permission denied/i);
await asUser(ids.clinicUser);
await expectFailure("wrong release correction",()=>recordValidation(validationArgs.map((v,i)=>i===3?"1.0.0-rc.32":i===14?validation1:v)),/does not match/i);
const correctionArgs=validationArgs.map((v,i)=>i===5?"blocked":i===12?"Repeat after the calibration report is reviewed":i===14?validation1:v);
const validation2=(await recordValidation(correctionArgs)).rows[0].id;
await expectFailure("duplicate correction branch",()=>recordValidation(correctionArgs),/unique|duplicate/i);
await expectFailure("immutable evidence update",()=>database.query("update public.validation_runs set observed_result='Altered evidence' where id=$1",[validation1]),/append-only/i);
await expectFailure("immutable evidence delete",()=>database.query("delete from public.validation_runs where id=$1",[validation1]),/append-only/i);
await database.exec("set role authenticated");
await expectFailure("direct insert cannot forge evidence",()=>database.query("insert into public.validation_runs select * from public.validation_runs where id=$1",[validation1]),/permission denied/i);
const evidenceRows=await database.query<{id:string;created_by:string;supersedes:string|null}>("select id,created_by,supersedes from public.validation_runs order by created_at,id");
assert.equal(evidenceRows.rows.length,2);assert.ok(evidenceRows.rows.every(r=>r.created_by===ids.clinicUser));assert.equal(evidenceRows.rows.find(r=>r.id===validation2)?.supersedes,validation1);
await asUser(ids.labUser);
assert.equal((await database.query("select id from public.validation_runs")).rows.length,0,"RLS must isolate clinic evidence");
await database.exec("reset role");
await database.query("update public.memberships set role='assistant' where organization_id=$1 and user_id=$2",[ids.clinicOrg,ids.clinicUser]);
await asUser(ids.clinicUser);
await expectFailure("assistant has no write permission",()=>recordValidation(validationArgs),/permission denied/i);
await database.query("update public.memberships set role='dentist' where organization_id=$1 and user_id=$2",[ids.clinicOrg,ids.clinicUser]);

console.log(
  JSON.stringify(
    {
      status: "pass",
      scenario: "clinic → lab → CAD → ready → route → live courier → ETA alert → delivery proof → delivered",
      migrations: migrationFiles.length,
      finalCaseStatus: summary.rows[0]?.case_status,
      finalShipmentStatus: summary.rows[0]?.shipment_status,
      designVersions: summary.rows[0]?.versions,
      designReviews: summary.rows[0]?.reviews,
      caseEvents: summary.rows[0]?.events,
      validationEvidence: { records:2, immutable:true, organizationIsolation:true, actorFromSession:true, crossVersionCorrectionsRejected:true, criticalCannotPass:true, clinicalReferencesRequired:true },
      guardsVerified: [
        "clinic cannot accept lab case",
        "illegal case transition rejected",
        "review decision is final",
        "stale design submission rejected",
        "organization route address snapshotted",
        "second active shipment rejected",
        "pickup without driver rejected",
        "cross-organization courier location rejected",
        "route metrics persisted",
        "15-minute ETA notification emitted once",
        "delivery without proof rejected",
        "delivery proof recorded",
        "shipment regression rejected",
        "delivered case regression rejected",
      ],
    },
    null,
    2,
  ),
);

await database.close();
