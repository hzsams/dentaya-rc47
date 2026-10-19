import {readFileSync,writeFileSync} from 'node:fs';
const base=readFileSync('supabase/migrations/20260926000100_community_network.sql','utf8').replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'');
const bookmarks=readFileSync('supabase/migrations/20260926000200_community_bookmarks.sql','utf8').replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'');
const tables=['community_profiles','community_moderators','community_posts','community_comments','community_likes','community_follows','community_reports'];
const sql=`-- DentAYA: Supabase SQL Editor / New query / Run. Proje yoneticisi calistirir.
-- Ilk kurulum veya eksik kaydedilenler guncellemesi. Var olan veriler silinmez.
begin;
do $setup$
declare existing_count integer;
begin
 if to_regclass('public.memberships') is null or to_regclass('public.organizations') is null then
  raise exception 'DentAYA ana veritabani eksik veya yanlis Supabase projesi secildi. Kurulum durduruldu.';
 end if;
 select count(*) into existing_count from unnest(ARRAY[${tables.map(t=>`'${t}'`).join(',')}]) t where to_regclass('public.'||t) is not null;
 if existing_count=0 then
  execute $community_base$${base}$community_base$;
 elsif existing_count<>${tables.length} then
  raise exception 'Topluluk kurulumu kismen mevcut. Veri kaybini onlemek icin durduruldu; SQL hata metnini proje yoneticisine iletin.';
 end if;
 if to_regclass('public.community_bookmarks') is null then
  execute $community_bookmarks$${bookmarks}$community_bookmarks$;
 end if;
end;
$setup$;
notify pgrst, 'reload schema';
commit;
select 'Topluluk hazir. DentAYA ekraninda baglantiyi yeniden kontrol edin.' as sonuc;
`;
writeFileSync('public/community-setup.sql',sql);
