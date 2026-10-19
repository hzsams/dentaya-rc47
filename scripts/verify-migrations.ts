import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

type CountRow = { count: number };
type NameRow = { name: string };

const database = new PGlite({
  extensions: { pgcrypto },
});

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
  as $$ select null::uuid $$;
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

assert.ok(migrationFiles.length > 0, "No Supabase migrations were found.");

for (const file of migrationFiles) {
  const sql = await readFile(path.join(migrationsDirectory, file), "utf8");
  try {
    await database.exec(sql);
  } catch (error) {
    throw new Error(`Migration failed: ${file}`, { cause: error });
  }
}

const tableCount = await database.query<CountRow>(`
  select count(*)::int as count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
`);

const rlsMissing = await database.query<NameRow>(`
  select c.relname as name
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity
  order by c.relname
`);

const insecureDefiners = await database.query<NameRow>(`
  select p.proname as name
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig, array[]::text[])) setting
      where setting like 'search_path=%'
    )
  order by p.proname
`);

const privateBucket = await database.query<CountRow>(`
  select count(*)::int as count
  from storage.buckets
  where id = 'dentaya-files'
    and public = false
    and file_size_limit = 104857600
`);

const workflowFunctions = await database.query<NameRow>(`
  select p.proname as name
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in (
      'dentaya_create_case_shipment',
      'dentaya_assign_courier',
      'dentaya_review_design',
      'dentaya_submit_design_version',
      'dentaya_transition_case',
      'guard_case_status_transition',
      'guard_shipment_transition',
      'guard_design_review_decision',
      'organization_route_address',
      'sync_open_shipments_from_org_address',
      'guard_courier_location_insert',
      'dentaya_record_route_snapshot',
      'dentaya_shipment_actual_distance_meters',
      'require_delivery_proof_before_delivered',
      'dentaya_complete_delivery',
      'notify_shipment_eta_threshold',
      'dentaya_log_operational_event'
    )
  order by p.proname
`);

const workflowTriggers = await database.query<NameRow>(`
  select t.tgname as name
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and not t.tgisinternal
    and t.tgname in (
      'cases_guard_status_transition',
      'shipments_guard_transition',
      'case_design_reviews_guard_decision',
      'trg_sync_case_status_from_shipment',
      'trg_sync_open_shipments_from_org_address',
      'courier_locations_guard_insert',
      'shipments_require_delivery_proof',
      'trg_notify_shipment_eta_threshold'
    )
  order by t.tgname
`);

const activeShipmentUniqueIndex = await database.query<CountRow>(`
  select count(*)::int as count
  from pg_catalog.pg_indexes
  where schemaname = 'public'
    and indexname = 'shipments_one_active_per_case_idx'
    and indexdef ilike '%unique index%'
    and indexdef ilike '%pickup_requested%'
    and indexdef ilike '%in_transit%'
`);

const routeAddressColumns = await database.query<NameRow>(`
  select column_name as name
  from information_schema.columns
  where table_schema = 'public'
    and (
      (table_name = 'organizations' and column_name in (
        'address_line1','address_city','address_formatted','address_lat','address_lng','address_place_id','address_verified_at'
      ))
      or
      (table_name = 'shipments' and column_name in ('pickup_address_text','dropoff_address_text'))
    )
  order by table_name, column_name
`);

const courierOpsColumns = await database.query<NameRow>(`
  select column_name as name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'shipments'
    and column_name in (
      'planned_distance_meters','planned_duration_seconds',
      'remaining_distance_meters','remaining_duration_seconds',
      'route_polyline','route_calculated_at','eta_at',
      'actual_distance_meters','actual_duration_seconds'
    )
  order by column_name
`);

const operationalEventsTable = await database.query<CountRow>(`
  select count(*)::int as count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'operational_events'
    and c.relkind = 'r'
    and c.relrowsecurity
`);

const operationalEventsAdminPolicy = await database.query<CountRow>(`
  select count(*)::int as count
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'operational_events'
    and p.polname = 'operational_events_select_admins'
`);


const operationsSettingsTable = await database.query<CountRow>(`
  select count(*)::int as count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'organization_operations_settings'
    and c.relkind = 'r'
    and c.relrowsecurity
`);

const operationsSettingsPolicies = await database.query<CountRow>(`
  select count(*)::int as count
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'organization_operations_settings'
    and p.polname in (
      'organization_operations_settings_select_members',
      'organization_operations_settings_insert_admin',
      'organization_operations_settings_update_admin'
    )
`);

const operationsSettingsTrigger = await database.query<CountRow>(`
  select count(*)::int as count
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'organization_operations_settings'
    and not t.tgisinternal
    and t.tgname = 'organization_operations_settings_set_updated_at'
`);

const deliveryProofTable = await database.query<CountRow>(`
  select count(*)::int as count
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'shipment_delivery_proofs'
    and c.relkind = 'r'
    and c.relrowsecurity
`);

assert.ok((tableCount.rows[0]?.count ?? 0) >= 28);
assert.deepEqual(rlsMissing.rows, []);
assert.deepEqual(insecureDefiners.rows, []);
assert.equal(privateBucket.rows[0]?.count, 1);
assert.equal(workflowFunctions.rows.length, 17);
assert.equal(workflowTriggers.rows.length, 8);
assert.equal(activeShipmentUniqueIndex.rows[0]?.count, 1);
assert.equal(routeAddressColumns.rows.length, 9);
assert.equal(courierOpsColumns.rows.length, 9);
assert.equal(deliveryProofTable.rows[0]?.count, 1);
assert.equal(operationalEventsTable.rows[0]?.count, 1);
assert.equal(operationalEventsAdminPolicy.rows[0]?.count, 1);
assert.equal(operationsSettingsTable.rows[0]?.count, 1);
assert.equal(operationsSettingsPolicies.rows[0]?.count, 3);
assert.equal(operationsSettingsTrigger.rows[0]?.count, 1);

console.log(
  JSON.stringify(
    {
      status: "pass",
      migrations: migrationFiles.length,
      publicTables: tableCount.rows[0]?.count ?? 0,
      tablesWithoutRls: rlsMissing.rows,
      insecureSecurityDefiners: insecureDefiners.rows,
      privateStorageBucket: true,
      workflowFunctions: workflowFunctions.rows.map((row) => row.name),
      workflowTriggers: workflowTriggers.rows.map((row) => row.name),
      activeShipmentUniqueIndex: true,
      routeAddressColumns: routeAddressColumns.rows.map((row) => row.name),
      courierOpsColumns: courierOpsColumns.rows.map((row) => row.name),
      deliveryProofTableWithRls: true,
      operationalEventsTableWithRls: true,
      operationalEventsAdminPolicy: true,
      operationsSettingsTableWithRls: true,
      operationsSettingsPolicies: 3,
      operationsSettingsUpdatedAtTrigger: true,
    },
    null,
    2,
  ),
);

await database.close();
