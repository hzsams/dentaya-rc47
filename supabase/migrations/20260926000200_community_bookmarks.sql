begin;
create table public.community_bookmarks(
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),primary key(post_id,user_id)
);
alter table public.community_bookmarks enable row level security;
create policy community_bookmarks_read on public.community_bookmarks for select to authenticated using(user_id=auth.uid() and exists(select 1 from public.community_posts p where p.id=post_id and p.status='published'));
create policy community_bookmarks_insert on public.community_bookmarks for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.community_posts p where p.id=post_id and p.status='published'));
create policy community_bookmarks_delete on public.community_bookmarks for delete to authenticated using(user_id=auth.uid());
grant select,insert,delete on public.community_bookmarks to authenticated;
commit;
