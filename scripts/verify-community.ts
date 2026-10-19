import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";


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
  if(process.env.COMMUNITY_SETUP_MODE==='fresh'&&file.includes('community'))continue;
  if(process.env.COMMUNITY_SETUP_MODE==='upgrade'&&file.includes('community_bookmarks'))continue;
  const sql = await readFile(path.join(migrationsDirectory, file), "utf8");
  try {
    await database.exec(sql);
  } catch (error) {
    throw new Error(`Migration failed: ${file}`, { cause: error });
  }
}


const setupSql=await readFile(path.join(process.cwd(),'public/community-setup.sql'),'utf8');
await database.exec(setupSql);
await database.exec(setupSql);

const A='10000000-0000-0000-0000-000000000001',B='10000000-0000-0000-0000-000000000002',C='10000000-0000-0000-0000-000000000003';
const PA='20000000-0000-0000-0000-000000000001',PB='20000000-0000-0000-0000-000000000002',PO='20000000-0000-0000-0000-000000000003',ORG='30000000-0000-0000-0000-000000000001';
const POST='40000000-0000-0000-0000-000000000001',DRAFT='40000000-0000-0000-0000-000000000002',OP='40000000-0000-0000-0000-000000000003';
await database.exec(`
 create or replace function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public,storage to authenticated,anon;
 grant select,insert,update,delete on storage.objects to authenticated;
 insert into auth.users(id,email) values ('${A}','a@example.test'),('${B}','b@example.test'),('${C}','c@example.test');
 insert into public.organizations(id,name,slug,org_type,created_by) values('${ORG}','Test Klinik','test-klinik','clinic','${A}');
 insert into public.memberships(organization_id,user_id,role,status) values('${ORG}','${A}','owner','active');
`);
async function asUser(id:string){await database.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`);}
async function rejected(sql:string){await assert.rejects(()=>database.exec(sql));}
await asUser(A);
await database.exec(`insert into community_profiles(id,user_id,kind,handle,display_name) values('${PA}','${A}','person','test_a','Test A');insert into community_profiles(id,organization_id,kind,handle,display_name) values('${PO}','${ORG}','clinic','test_klinik','Test Klinik');`);
await rejected(`insert into community_profiles(user_id,kind,handle,display_name) values('${C}','person','spoofed_c','Fake');`);
await rejected(`update community_profiles set user_id='${C}' where id='${PA}';`);
await database.exec(`insert into community_posts(id,profile_id,created_by,kind,body,status) values('${POST}','${PA}','${B}','post','Yayımlanmış içerik','published'),('${DRAFT}','${PA}','${A}','post','Taslak makale','draft');`);
const stamped=await database.query<{created_by:string}>(`select created_by from community_posts where id='${POST}'`);assert.equal(stamped.rows[0].created_by,A);
await database.exec(`insert into community_posts(id,profile_id,kind,body) values('${OP}','${PO}','post','Kurum paylaşımı');`);
await asUser(B);
await database.exec(`insert into community_profiles(id,user_id,kind,handle,display_name) values('${PB}','${B}','person','test_b','Test B');`);
assert.equal((await database.query(`select id from community_posts where id='${DRAFT}'`)).rows.length,0);
await rejected(`insert into community_posts(profile_id,kind,body) values('${PA}','post','Kimlik taklidi');`);
await rejected(`insert into community_profiles(organization_id,kind,handle,display_name) values('${ORG}','clinic','forged_clinic','Sahte Klinik');`);
assert.equal((await database.query(`update community_posts set body='Saldırı' where id='${POST}' returning id`)).rows.length,0);
await rejected(`insert into community_comments(post_id,profile_id,body) values('${POST}','${PA}','Yetkisiz yorum');`);
await database.exec(`insert into community_comments(post_id,profile_id,body) values('${POST}','${PB}','Normal yorum');insert into community_likes(post_id,user_id) values('${POST}','${B}');insert into community_follows(profile_id,user_id) values('${PA}','${B}');`);
await database.exec(`insert into community_bookmarks(post_id,user_id) values('${POST}','${B}');`);
await rejected(`insert into community_bookmarks(post_id,user_id) values('${POST}','${C}');`);
await rejected(`insert into community_bookmarks(post_id,user_id) values('${DRAFT}','${B}');`);
await asUser(A);assert.equal((await database.query('select * from community_bookmarks')).rows.length,0);await asUser(B);
await rejected(`insert into community_likes(post_id,user_id) values('${POST}','${C}');`);
await rejected(`insert into community_comments(post_id,profile_id,body) values('${DRAFT}','${PB}','Taslağa yorum');`);
await rejected(`insert into community_moderators(user_id) values('${B}');`);
await database.exec(`insert into community_reports(post_id,user_id,reason) values('${POST}','${B}','İnceleme için test');`);
await rejected(`select community_review_report((select id from community_reports limit 1),true);`);
await database.exec(`reset role;insert into community_moderators values('${C}');`);
await asUser(C);
await database.exec(`select community_review_report((select id from community_reports limit 1),true);`);
await asUser(B);assert.equal((await database.query(`select id from community_posts where id='${POST}'`)).rows.length,0);
await asUser(A);assert.equal((await database.query(`update community_posts set status='published' where id='${POST}' returning id`)).rows.length,0);
await database.exec(`reset role;update memberships set status='revoked' where user_id='${A}';`);
await asUser(A);assert.equal((await database.query(`update community_posts set body='Revoked edit' where id='${OP}' returning id`)).rows.length,0);
await rejected(`insert into storage.objects(id,bucket_id,name) values(gen_random_uuid(),'dentaya-community','${B}/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg');`);
await database.exec(`insert into storage.objects(id,bucket_id,name) values(gen_random_uuid(),'dentaya-community','${A}/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg');`);
await asUser(B);assert.equal((await database.query(`select id from storage.objects where name='${A}/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg'`)).rows.length,0);
await rejected(`insert into community_posts(profile_id,kind,body,media_path,media_type) values('${PB}','post','Başkasının dosyası','${A}/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg','image');`);
await asUser(A);await database.exec(`insert into community_posts(profile_id,kind,body,media_path,media_type) values('${PA}','post','Kendi görselim','${A}/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg','image');`);
assert.equal((await database.query(`delete from storage.objects where name='${A}/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg' returning id`)).rows.length,0);
await asUser(B);assert.equal((await database.query(`select id from storage.objects where name='${A}/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.jpg'`)).rows.length,1);
await database.exec('reset role;set role anon;');await rejected('select * from community_posts;');
await asUser(B);
for(let i=0;i<20;i++)await database.exec(`insert into community_posts(profile_id,kind,body) values('${PB}','post','Rate limit ${i}');`);
await rejected(`insert into community_posts(profile_id,kind,body) values('${PB}','post','Rate overflow');`);
await database.exec('reset role;');
const beforeSetup=await database.query('select count(*)::int as count from community_posts');
await database.exec(setupSql);
assert.deepEqual((await database.query('select count(*)::int as count from community_posts')).rows,beforeSetup.rows);
await database.close();
console.log('PASS: community RLS, identity spoofing, organization control, private drafts, comments/likes/follows, moderation, revoked roles, private uploads, published media, immutable media, anonymous isolation.');
