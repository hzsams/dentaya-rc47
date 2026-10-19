-- Supabase SQL Editor: yetki vereceginiz mevcut kullanicinin UUID degerini yazin.
-- UUID, Authentication > Users bolumundeki kullanici kimligidir. Parola/anahtar degildir.
-- Bu kisi topluluk sikayetlerini gorebilir ve icerikleri gizleyebilir.
insert into public.community_moderators(user_id)
values ('MODERATOR_KULLANICI_UUID_BURAYA'::uuid)
on conflict (user_id) do nothing;
