-- DentAYA members-only professional network. No patient/case joins or public buckets.
begin;
create table public.community_profiles (
 id uuid primary key default gen_random_uuid(),
 user_id uuid unique references auth.users(id) on delete cascade,
 organization_id uuid unique references public.organizations(id) on delete cascade,
 kind text not null check(kind in ('person','clinic','laboratory')),
 handle text not null unique check(handle ~ '^[a-z0-9][a-z0-9_]{2,39}$'),
 display_name text not null check(char_length(btrim(display_name)) between 2 and 100),
 bio text not null default '' check(char_length(bio)<=1200),
 city text not null default '' check(char_length(city)<=100),
 specialty text not null default '' check(char_length(specialty)<=120),
 website text not null default '' check(website='' or (website ~ '^https://[^[:space:]]+$' and char_length(website)<=500)),
 avatar_path text,
 created_at timestamptz not null default now(),
 check ((user_id is not null and organization_id is null and kind='person') or (user_id is null and organization_id is not null and kind<>'person'))
);
create table public.community_moderators(user_id uuid primary key references auth.users(id) on delete cascade);
create function public.community_is_moderator() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_moderators where user_id=auth.uid());
$$;
create function public.community_can_manage(profile uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.community_profiles p where p.id=profile and (p.user_id=auth.uid() or public.is_org_role(p.organization_id,array['owner','admin'])));
$$;
create table public.community_posts (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.community_profiles(id) on delete cascade,
 created_by uuid not null default auth.uid() references auth.users(id),
 kind text not null check(kind in ('post','discussion','article')),
 category text not null default 'general' check(category in ('general','cad','materials','clinic','laboratory','education')),
 title text not null default '' check(char_length(title)<=180),
 body text not null check(char_length(btrim(body)) between 1 and 30000),
 media_path text, media_type text check(media_type in ('image','video')),
 status text not null default 'published' check(status in ('draft','published','hidden')),
 created_at timestamptz not null default now(),
 check(kind='post' or char_length(btrim(title))>=3),
 check((media_path is null and media_type is null) or (media_path is not null and media_type is not null)),
 check(media_path is null or (media_type='image' and media_path ~ '\.(jpg|png|webp)$') or (media_type='video' and media_path ~ '\.(mp4|webm)$'))
);
create index community_posts_feed on public.community_posts(status,created_at desc,id desc);
create index community_posts_profile on public.community_posts(profile_id,created_at desc);
create table public.community_comments (
 id uuid primary key default gen_random_uuid(),post_id uuid not null references public.community_posts(id) on delete cascade,
 profile_id uuid not null references public.community_profiles(id) on delete cascade,
 created_by uuid not null default auth.uid() references auth.users(id),
 body text not null check(char_length(btrim(body)) between 1 and 4000),created_at timestamptz not null default now()
);
create index community_comments_post on public.community_comments(post_id,created_at);
create table public.community_likes(post_id uuid references public.community_posts(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(post_id,user_id));
create table public.community_follows(profile_id uuid references public.community_profiles(id) on delete cascade,user_id uuid references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(profile_id,user_id));
create table public.community_reports(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.community_posts(id) on delete cascade,user_id uuid not null default auth.uid() references auth.users(id),reason text not null check(char_length(btrim(reason)) between 5 and 1000),status text not null default 'open' check(status in ('open','reviewed')),created_at timestamptz not null default now(),unique(post_id,user_id));

create function public.community_validate_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and (new.user_id is distinct from old.user_id or new.organization_id is distinct from old.organization_id or new.kind<>old.kind or new.created_at<>old.created_at or new.id<>old.id) then raise exception 'PROFILE_IDENTITY_IMMUTABLE'; end if;
 if new.organization_id is not null and not exists(select 1 from public.organizations o where o.id=new.organization_id and o.org_type=new.kind) then raise exception 'INVALID_ORGANIZATION_KIND'; end if;
 if new.avatar_path is not null and (tg_op='INSERT' or new.avatar_path is distinct from old.avatar_path) then
  if new.avatar_path !~ ('^'||auth.uid()::text||'/[a-f0-9-]+\.(jpg|png|webp)$') or not exists(select 1 from storage.objects where bucket_id='dentaya-community' and name=new.avatar_path) then raise exception 'INVALID_AVATAR'; end if;
 end if;
 return new;
end $$;
create trigger community_profile_validate before insert or update on public.community_profiles for each row execute function public.community_validate_profile();
create function public.community_validate_content() returns trigger language plpgsql security definer set search_path='' as $$
declare recent integer;
begin
 if tg_op='INSERT' then
  new.created_by=auth.uid();new.created_at=now();
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text||tg_table_name));
  if tg_table_name='community_posts' then select count(*) into recent from public.community_posts where created_by=auth.uid() and created_at>now()-interval '1 minute';
  else select count(*) into recent from public.community_comments where created_by=auth.uid() and created_at>now()-interval '1 minute'; end if;
  if recent>=20 then raise exception 'COMMUNITY_RATE_LIMIT'; end if;
 else
  if new.created_by<>old.created_by or new.profile_id<>old.profile_id or new.created_at<>old.created_at or new.id<>old.id then raise exception 'CONTENT_IDENTITY_IMMUTABLE'; end if;
 end if;
 if tg_table_name='community_posts' then
  if new.status='hidden' and not public.community_is_moderator() then raise exception 'MODERATOR_REQUIRED'; end if;
  if tg_op='UPDATE' and old.status='hidden' and not public.community_is_moderator() then raise exception 'CONTENT_MODERATED'; end if;
  if new.media_path is not null and (tg_op='INSERT' or new.media_path is distinct from old.media_path) then
   if new.media_path !~ ('^'||auth.uid()::text||'/[a-f0-9-]+\.(jpg|png|webp|mp4|webm)$') or not exists(select 1 from storage.objects where bucket_id='dentaya-community' and name=new.media_path) then raise exception 'INVALID_MEDIA'; end if;
   if (new.media_type='image' and new.media_path !~ '\.(jpg|png|webp)$') or (new.media_type='video' and new.media_path !~ '\.(mp4|webm)$') then raise exception 'INVALID_MEDIA_TYPE'; end if;
  end if;
 end if;
 return new;
end $$;
create trigger community_post_validate before insert or update on public.community_posts for each row execute function public.community_validate_content();
create trigger community_comment_validate before insert on public.community_comments for each row execute function public.community_validate_content();

alter table public.community_profiles enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_follows enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_moderators enable row level security;
create policy community_profiles_read on public.community_profiles for select to authenticated using(true);
create policy community_profiles_insert on public.community_profiles for insert to authenticated with check(user_id=auth.uid() or public.is_org_role(organization_id,array['owner','admin']));
create policy community_profiles_update on public.community_profiles for update to authenticated using(public.community_can_manage(id)) with check(public.community_can_manage(id));
create policy community_profiles_delete on public.community_profiles for delete to authenticated using(public.community_can_manage(id));
create policy community_posts_read on public.community_posts for select to authenticated using(status='published' or public.community_can_manage(profile_id) or public.community_is_moderator());
create policy community_posts_insert on public.community_posts for insert to authenticated with check(public.community_can_manage(profile_id) and status in ('draft','published'));
create policy community_posts_update on public.community_posts for update to authenticated using(public.community_can_manage(profile_id) and status<>'hidden') with check(public.community_can_manage(profile_id) and status in ('draft','published'));
create policy community_posts_delete on public.community_posts for delete to authenticated using(public.community_can_manage(profile_id) or public.community_is_moderator());
create policy community_comments_read on public.community_comments for select to authenticated using(exists(select 1 from public.community_posts p where p.id=post_id and p.status='published'));
create policy community_comments_insert on public.community_comments for insert to authenticated with check(public.community_can_manage(profile_id) and exists(select 1 from public.community_posts p where p.id=post_id and p.status='published'));
create policy community_comments_delete on public.community_comments for delete to authenticated using(public.community_can_manage(profile_id) or public.community_is_moderator());
create policy community_likes_read on public.community_likes for select to authenticated using(exists(select 1 from public.community_posts p where p.id=post_id and p.status='published'));
create policy community_likes_insert on public.community_likes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.community_posts p where p.id=post_id and p.status='published'));
create policy community_likes_delete on public.community_likes for delete to authenticated using(user_id=auth.uid());
create policy community_follows_read on public.community_follows for select to authenticated using(true);
create policy community_follows_insert on public.community_follows for insert to authenticated with check(user_id=auth.uid() and not public.community_can_manage(profile_id));
create policy community_follows_delete on public.community_follows for delete to authenticated using(user_id=auth.uid());
create policy community_reports_read on public.community_reports for select to authenticated using(user_id=auth.uid() or public.community_is_moderator());
create policy community_reports_insert on public.community_reports for insert to authenticated with check(user_id=auth.uid() and status='open' and exists(select 1 from public.community_posts p where p.id=post_id and p.status='published'));
create policy community_moderators_read on public.community_moderators for select to authenticated using(user_id=auth.uid());
create function public.community_review_report(report uuid, hide_content boolean) returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if not public.community_is_moderator() then raise exception 'MODERATOR_REQUIRED'; end if;
 select post_id into target from public.community_reports where id=report for update;
 if target is null then raise exception 'REPORT_NOT_FOUND'; end if;
 if hide_content then update public.community_posts set status='hidden' where id=target; end if;
 update public.community_reports set status='reviewed' where id=report;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('dentaya-community','dentaya-community',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']);
create policy community_media_insert on storage.objects for insert to authenticated with check(bucket_id='dentaya-community' and split_part(name,'/',1)=auth.uid()::text and name ~ '^[a-f0-9-]+/[a-f0-9-]+\.(jpg|png|webp|mp4|webm)$');
create policy community_media_read on storage.objects for select to authenticated using(bucket_id='dentaya-community' and (split_part(name,'/',1)=auth.uid()::text or exists(select 1 from public.community_posts p where p.media_path=name) or exists(select 1 from public.community_profiles p where p.avatar_path=name)));
-- No update policy: published object keys are immutable. Only unreferenced own uploads can be removed.
create function public.community_media_referenced(object_name text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.community_posts where media_path=object_name) or exists(select 1 from public.community_profiles where avatar_path=object_name);$$;
create policy community_media_delete on storage.objects for delete to authenticated using(bucket_id='dentaya-community' and split_part(name,'/',1)=auth.uid()::text and not public.community_media_referenced(name));
grant select,insert,update,delete on public.community_profiles,public.community_posts to authenticated;
grant select,insert,delete on public.community_comments,public.community_likes,public.community_follows to authenticated;
grant select,insert on public.community_reports to authenticated;
grant select on public.community_moderators to authenticated;
revoke all on function public.community_is_moderator(),public.community_can_manage(uuid),public.community_review_report(uuid,boolean),public.community_media_referenced(text),public.community_validate_profile(),public.community_validate_content() from public,anon;
grant execute on function public.community_is_moderator(),public.community_can_manage(uuid),public.community_review_report(uuid,boolean),public.community_media_referenced(text) to authenticated;
commit;
