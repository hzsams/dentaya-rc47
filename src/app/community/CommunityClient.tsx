"use client";
import LoadingExperience from '@/app/loading-play/LoadingExperience';
import UserText from "@/lib/i18n/UserText";
import UiNode from "@/lib/i18n/UiNode";
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from "@/lib/i18n/UiLink";
import { supabase } from '@/lib/supabase';
import { COMMUNITY_CATEGORIES, communityError, isMissingCommunitySchema, communityFile, profileKind, type CommunityPost, type CommunityProfile } from '@/lib/community';
import CommunityMedia from './CommunityMedia';
const PAGE = 12;
const SELECT = '*,author:community_profiles!profile_id(*),likes:community_likes(count),comments:community_comments(count)';
type Comment = {
    id: string;
    body: string;
    profile_id: string;
    created_at: string;
    author: CommunityProfile;
};
type Organization = {
    id: string;
    name: string;
    org_type: string;
};
type Report = {
    id: string;
    post_id: string;
    reason: string;
    status: string;
    created_at: string;
    post: {
        title: string;
        body: string;
        media_path: string | null;
        media_type: string | null;
    };
};
const blankProfile = { display_name: '', handle: '', bio: '', city: '', specialty: '', website: '' };
export default function CommunityClient({ initialHandle, initialPostId, initialTab = "feed" }: {
    initialHandle?: string;
    initialPostId?: string;
    initialTab?: string;
}) {
    const { t: uiText, intlLocale } = useTranslation();
    const [userId, setUserId] = useState(''), [ready, setReady] = useState(false), [mine, setMine] = useState<CommunityProfile[]>([]), [orgs, setOrgs] = useState<Organization[]>([]), [actor, setActor] = useState('');
    const [tab, setTab] = useState(initialTab), [category, setCategory] = useState('all'), [query, setQuery] = useState(''), [search, setSearch] = useState('');
    const [posts, setPosts] = useState<CommunityPost[]>([]), [directory, setDirectory] = useState<CommunityProfile[]>([]), [profile, setProfile] = useState<CommunityProfile | null>(null), [followers, setFollowers] = useState(0);
    const [setupRequired, setSetupRequired] = useState(false), [bookmarksReady, setBookmarksReady] = useState(true), [retry, setRetry] = useState(0);
    const [saved, setSaved] = useState<Set<string>>(new Set()), [mediaOnly, setMediaOnly] = useState(false);
    const [liked, setLiked] = useState<Set<string>>(new Set()), [following, setFollowing] = useState<Set<string>>(new Set()), [reports, setReports] = useState<Report[]>([]), [moderator, setModerator] = useState(false);
    const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [hasMore, setHasMore] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set()), [openComments, setOpenComments] = useState(''), [comments, setComments] = useState<Comment[]>([]), [commentText, setCommentText] = useState(''), [commentsMore, setCommentsMore] = useState(false);
    const [profileForm, setProfileForm] = useState(blankProfile), [profileTarget, setProfileTarget] = useState('person'), [editingProfile, setEditingProfile] = useState<CommunityProfile | null>(null), [avatar, setAvatar] = useState<File | null>(null);
    const [postKind, setPostKind] = useState<'post' | 'discussion' | 'article'>('post'), [postCategory, setPostCategory] = useState('general'), [title, setTitle] = useState(''), [body, setBody] = useState(''), [media, setMedia] = useState<File | null>(null), [consent, setConsent] = useState(false), [draft, setDraft] = useState(false), [editingPost, setEditingPost] = useState<CommunityPost | null>(null), [removeExistingMedia, setRemoveExistingMedia] = useState(false);
    const profileDialog = useRef<HTMLDialogElement>(null), postDialog = useRef<HTMLDialogElement>(null), requestId = useRef(0), lock = useRef(false), commentRequest = useRef(0);
    const canManage = (id: string) => mine.some(p => p.id === id);
    useEffect(() => {
        let alive = true;
        const boot = async () => {
            setReady(false);
            setSetupRequired(false);
            setMessage('');
            try {
                const { data } = await supabase.auth.getSession();
                const id = data.session?.user.id;
                if (!id) {
                    if (alive)
                        setReady(true);
                    return;
                }
                const memberships = await supabase.from('memberships').select('organization_id').eq('user_id', id).eq('status', 'active').in('role', ['owner', 'admin']);
                if (memberships.error)
                    throw memberships.error;
                const ids = (memberships.data ?? []).map(m => m.organization_id);
                const organizations = ids.length ? await supabase.from('organizations').select('id,name,org_type').in('id', ids).in('org_type', ['clinic', 'laboratory']) : { data: [], error: null };
                if (organizations.error)
                    throw organizations.error;
                const own = await supabase.from('community_profiles').select('*').or(`user_id.eq.${id}${ids.length ? ',organization_id.in.(' + ids.join(',') + ')' : ''}`);
                if (own.error)
                    throw own.error;
                const [follows, mod, bookmarks] = await Promise.all([supabase.from('community_follows').select('profile_id').eq('user_id', id), supabase.from('community_moderators').select('user_id').eq('user_id', id), supabase.from('community_bookmarks').select('post_id').eq('user_id', id)]);
                if (follows.error || mod.error)
                    throw follows.error || mod.error;
                if (bookmarks.error && !isMissingCommunitySchema(bookmarks.error))
                    throw bookmarks.error;
                if (alive)
                    setBookmarksReady(!bookmarks.error);
                if (alive) {
                    setSaved(new Set((bookmarks.data ?? []).map(b => b.post_id)));
                    setUserId(id);
                    setMine(own.data ?? []);
                    setActor(own.data?.[0]?.id ?? '');
                    setOrgs(organizations.data ?? []);
                    setFollowing(new Set((follows.data ?? []).map(f => f.profile_id)));
                    setModerator(Boolean(mod.data?.length));
                }
            }
            catch (error) {
                if (alive) {
                    setSetupRequired(isMissingCommunitySchema(error));
                    setMessage(communityError(error));
                }
            }
            finally {
                if (alive)
                    setReady(true);
            }
        };
        void boot();
        return () => { alive = false; };
    }, [retry]);
    const load = useCallback(async (append = false, pagePosts: CommunityPost[] = [], directoryOffset = 0) => {
        if (!userId)
            return;
        const request = ++requestId.current;
        setLoading(true);
        try {
            let selected: CommunityProfile | null = null;
            if (initialHandle) {
                const result = await supabase.from('community_profiles').select('*').eq('handle', initialHandle).maybeSingle();
                if (result.error)
                    throw result.error;
                if (!result.data) {
                    if (request === requestId.current) {
                        setProfile(null);
                        setPosts([]);
                        setMessage('Profil bulunamadı.');
                    }
                    return;
                }
                selected = result.data;
                const count = await supabase.from('community_follows').select('*', { count: 'exact', head: true }).eq('profile_id', selected!.id);
                if (count.error)
                    throw count.error;
                if (request === requestId.current) {
                    setProfile(selected);
                    setFollowers(count.count ?? 0);
                }
            }
            if (tab === 'people' && !initialHandle) {
                let q = supabase.from('community_profiles').select('*').order('created_at', { ascending: false }).order('id', { ascending: false }).range(append ? directoryOffset : 0, (append ? directoryOffset : 0) + PAGE - 1);
                if (search)
                    q = q.ilike('display_name', `%${search}%`);
                const result = await q;
                if (result.error)
                    throw result.error;
                if (request === requestId.current) {
                    setDirectory(prev => append ? [...prev, ...(result.data ?? [])] : result.data ?? []);
                    setHasMore(result.data?.length === PAGE);
                }
                return;
            }
            if (tab === 'moderation') {
                const result = await supabase.from('community_reports').select('*,post:community_posts!post_id(title,body,media_path,media_type)').eq('status', 'open').order('created_at').limit(50);
                if (result.error)
                    throw result.error;
                if (request === requestId.current) {
                    setReports(result.data ?? []);
                    setHasMore(false);
                }
                return;
            }
            let q = supabase.from('community_posts').select(SELECT).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE);
            if (tab === 'drafts')
                q = q.eq('status', 'draft').in('profile_id', mine.map(p => p.id));
            else
                q = q.eq('status', 'published');
            if (initialPostId)
                q = q.eq('id', initialPostId);
            if (mediaOnly)
                q = q.not('media_path', 'is', null);
            if (tab === 'saved') {
                if (!bookmarksReady) {
                    if (request === requestId.current) {
                        setPosts([]);
                        setHasMore(false);
                    }
                    return;
                }
                q = q.in('id', [...saved]);
            }
            if (selected)
                q = q.eq('profile_id', selected.id);
            if (tab === 'discussion' || tab === 'article')
                q = q.eq('kind', tab);
            if (tab === 'following')
                q = q.in('profile_id', [...following]);
            if (category !== 'all')
                q = q.eq('category', category);
            if (search)
                q = q.ilike('body', `%${search}%`);
            if (append && pagePosts.length) {
                const last = pagePosts[pagePosts.length - 1];
                q = q.or(`created_at.lt.${last.created_at},and(created_at.eq.${last.created_at},id.lt.${last.id})`);
            }
            const result = await q;
            if (result.error)
                throw result.error;
            const rows = (result.data ?? []) as unknown as CommunityPost[];
            const likes = rows.length ? await supabase.from('community_likes').select('post_id').eq('user_id', userId).in('post_id', rows.map(p => p.id)) : { data: [], error: null };
            if (likes.error)
                throw likes.error;
            if (request === requestId.current) {
                setPosts(prev => append ? [...prev, ...rows.filter(row => !prev.some(p => p.id === row.id))] : rows);
                setLiked(prev => new Set([...(append ? prev : []), ...(likes.data ?? []).map(l => l.post_id)]));
                setHasMore(rows.length === PAGE);
            }
        }
        catch (error) {
            if (request === requestId.current)
                setMessage(communityError(error));
        }
        finally {
            if (request === requestId.current)
                setLoading(false);
        }
    }, [userId, initialHandle, initialPostId, tab, category, search, mine, following, saved, mediaOnly, bookmarksReady]);
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
            if (event === 'SIGNED_OUT') {
                setUserId('');
                setMine([]);
                setPosts([]);
                profileDialog.current?.close();
                postDialog.current?.close();
            }
        });
        return () => subscription.unsubscribe();
    }, []);
    useEffect(() => { const request = requestId; setPosts([]); setDirectory([]); setOpenComments(''); void load(); return () => { request.current++; }; }, [load]);
    async function action(run: () => Promise<void>) {
        if (lock.current)
            return;
        lock.current = true;
        setBusy(true);
        setMessage('');
        try {
            await run();
        }
        catch (error) {
            setMessage(error instanceof Error && !('code' in error) ? error.message : communityError(error));
        }
        finally {
            lock.current = false;
            setBusy(false);
        }
    }
    async function upload(file: File, isAvatar = false) {
        const info = communityFile(file, isAvatar);
        const path = `${userId}/${crypto.randomUUID()}.${info.extension}`;
        const result = await supabase.storage.from('dentaya-community').upload(path, file, { contentType: file.type, upsert: false });
        if (result.error)
            throw result.error;
        return { path, type: info.mediaType };
    }
    function editProfile(value?: CommunityProfile) { setMessage(''); setEditingProfile(value ?? null); setAvatar(null); setProfileTarget(value?.organization_id ?? (mine.some(p => p.kind === 'person') ? orgs.find(o => !mine.some(p => p.organization_id === o.id))?.id ?? 'person' : 'person')); setProfileForm(value ? { display_name: value.display_name, handle: value.handle, bio: value.bio, city: value.city, specialty: value.specialty, website: value.website } : blankProfile); profileDialog.current?.showModal(); }
    async function saveProfile(event: FormEvent) {
        event.preventDefault();
        await action(async () => {
            let uploaded: string | undefined;
            try {
                if (avatar)
                    uploaded = (await upload(avatar, true)).path;
                const organization = orgs.find(o => o.id === profileTarget);
                const fields = { ...profileForm, display_name: profileForm.display_name.trim(), handle: profileForm.handle.trim().toLowerCase(), website: profileForm.website.trim(), ...(uploaded ? { avatar_path: uploaded } : {}) };
                const result = editingProfile ? await supabase.from('community_profiles').update(fields).eq('id', editingProfile.id).select('*').single() : await supabase.from('community_profiles').insert({ ...fields, user_id: organization ? null : userId, organization_id: organization?.id ?? null, kind: organization?.org_type ?? 'person' }).select('*').single();
                if (result.error)
                    throw result.error;
                const p = result.data as CommunityProfile;
                setMine(current => [...current.filter(v => v.id !== p.id), p]);
                setActor(p.id);
                profileDialog.current?.close();
                setMessage('Profil kaydedildi.');
                await load();
            }
            catch (error) {
                if (uploaded)
                    await supabase.storage.from('dentaya-community').remove([uploaded]);
                throw error;
            }
        });
    }
    async function publish(event: FormEvent) {
        event.preventDefault();
        if (!actor || !consent)
            return;
        await action(async () => {
            let uploaded: string | undefined;
            try {
                const asset = media ? await upload(media) : null;
                uploaded = asset?.path;
                const fields = { kind: postKind, category: postCategory, title: title.trim(), body: body.trim(), media_path: asset?.path ?? (removeExistingMedia ? null : editingPost?.media_path ?? null), media_type: asset?.type ?? (removeExistingMedia ? null : editingPost?.media_type ?? null), status: draft ? 'draft' : 'published' };
                const result = editingPost ? await supabase.from('community_posts').update(fields).eq('id', editingPost.id).select('id').single() : await supabase.from('community_posts').insert({ ...fields, profile_id: actor }).select('id').single();
                if (result.error)
                    throw result.error;
                postDialog.current?.close();
                setEditingPost(null);
                setTitle('');
                setBody('');
                setMedia(null);
                setConsent(false);
                setMessage(draft ? 'Taslak kaydedildi.' : 'Paylaşım yayımlandı.');
                await load();
            }
            catch (error) {
                if (uploaded)
                    await supabase.storage.from('dentaya-community').remove([uploaded]);
                throw error;
            }
        });
    }
    async function toggleLike(post: CommunityPost) {
        await action(async () => {
            const exists = liked.has(post.id);
            const result = exists ? await supabase.from('community_likes').delete().eq('post_id', post.id).eq('user_id', userId) : await supabase.from('community_likes').insert({ post_id: post.id, user_id: userId });
            if (result.error)
                throw result.error;
            setLiked(current => {
                const next = new Set(current);
                if (exists)
                    next.delete(post.id);
                else
                    next.add(post.id);
                return next;
            });
            setPosts(current => current.map(p => p.id === post.id ? { ...p, likes: [{ count: Math.max(0, (p.likes[0]?.count ?? 0) + (exists ? -1 : 1)) }] } : p));
        });
    }
    async function toggleFollow(p: CommunityProfile) {
        await action(async () => {
            const exists = following.has(p.id);
            const result = exists ? await supabase.from('community_follows').delete().eq('profile_id', p.id).eq('user_id', userId) : await supabase.from('community_follows').insert({ profile_id: p.id, user_id: userId });
            if (result.error)
                throw result.error;
            setFollowing(current => {
                const next = new Set(current);
                if (exists)
                    next.delete(p.id);
                else
                    next.add(p.id);
                return next;
            });
        });
    }
    async function loadComments(id: string, append = false) {
        const request = ++commentRequest.current;
        setOpenComments(id);
        if (!append)
            setComments([]);
        const offset = append ? comments.length : 0;
        const result = await supabase.from('community_comments').select('*,author:community_profiles!profile_id(*)').eq('post_id', id).order('created_at').order('id').range(offset, offset + 19);
        if (request !== commentRequest.current)
            return;
        if (result.error) {
            setMessage(communityError(result.error));
            return;
        }
        setComments(prev => append ? [...prev, ...result.data as unknown as Comment[]] : result.data as unknown as Comment[]);
        setCommentsMore(result.data.length === 20);
    }
    async function addComment(id: string) {
        await action(async () => {
            if (!actor)
                throw Error('Yorum yapmak için önce profil oluşturun.');
            const result = await supabase.from('community_comments').insert({ post_id: id, profile_id: actor, body: commentText.trim() });
            if (result.error)
                throw result.error;
            setCommentText('');
            await loadComments(id);
            setPosts(current => current.map(p => p.id === id ? { ...p, comments: [{ count: (p.comments[0]?.count ?? 0) + 1 }] } : p));
        });
    }
    const avatarView = (p: CommunityProfile) => <>{p.avatar_path ? <CommunityMedia path={p.avatar_path} avatar alt={p.display_name}/> : <UiNode as="span" className="community-avatar"><UserText>{p.display_name.slice(0, 2).toLocaleUpperCase('tr')}</UserText></UiNode>}</>;
    if (setupRequired)
        return <CommunitySetup onRetry={() => setRetry(n => n + 1)}/>;
    if (!ready)
        return <LoadingExperience title="Topluluk yükleniyor…"/>;
    if (!userId)
        return <UiNode as="div" className="community-empty"><UiNode as="h1">DentAYA Topluluk</UiNode><UiNode as="p">{message || 'Meslektaşlarınla bağlantı kurmak için giriş yap.'}</UiNode><Link href="/workspace">Çalışma alanına git →</Link></UiNode>;
    return <UiNode as="main" className="community"><UiNode as="header" className="community-hero"><UiNode as="div"><UiNode as="small">DENTAYA COMMUNITY</UiNode><UiNode as="h1">Birlikte öğren. Birlikte üret.</UiNode><UiNode as="p">Klinikler, laboratuvarlar ve meslektaşlar için ortak buluşma alanı.</UiNode></UiNode><UiNode as="button" className="community-primary" onClick={() => {
            if (!mine.length) {
                editProfile();
                return;
            }
            setMessage('');
            setEditingPost(null);
            setRemoveExistingMedia(false);
            setPostKind(tab === 'discussion' ? 'discussion' : tab === 'article' ? 'article' : 'post');
            setPostCategory(category === 'all' ? 'general' : category);
            setTitle('');
            setBody('');
            setMedia(null);
            setConsent(false);
            setDraft(false);
            postDialog.current?.showModal();
        }}>+ {mine.length ? 'Paylaşım oluştur' : 'Profil oluştur'}</UiNode></UiNode>
 <UiNode as="div" className="community-layout"><UiNode as="aside" className="community-sidebar"><UiNode as="nav" aria-label="Topluluk bölümleri">{[['feed', 'Keşfet'], ['following', 'Takip ettiklerim'], ['discussion', 'Forum'], ['article', 'Makaleler'], ['people', 'Profiller'], ['saved', 'Kaydettiklerim'], ['drafts', 'Taslaklarım'], ...(moderator ? [['moderation', 'Şikâyetler']] : [])].map(([id, label]) => (initialHandle || initialPostId) ? <Link key={id} href={`/community?tab=${id}`}>{label}</Link> : <UiNode as="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</UiNode>)}</UiNode><UiNode as="div" className="community-identity"><UiNode as="small">PAYLAŞIM KİMLİĞİ</UiNode>{mine.length ? <UiNode as="select" aria-label="Paylaşım kimliği" value={actor} onChange={e => setActor(e.target.value)}>{mine.map(p => <UiNode as="option" key={p.id} value={p.id}><UserText>{p.display_name}</UserText></UiNode>)}</UiNode> : <UiNode as="p">Önce profilini oluştur.</UiNode>}{mine.map(p => <UiNode as="div" key={p.id}><Link href={`/community/profile/${p.handle}`}>@{p.handle}</Link><UiNode as="button" aria-label={`${p.display_name} profilini düzenle`} onClick={() => editProfile(p)} uiMessages={{ "aria-label": { source: "{0} profilini d\u00FCzenle", values: [p.display_name], userValues: [0] } }}>{uiText("Düzenle")}</UiNode></UiNode>)}<UiNode as="button" onClick={() => editProfile()}>+ Profil oluştur</UiNode></UiNode></UiNode>
 <UiNode as="section" className="community-main" aria-label="Topluluk içeriği">{message && <UiNode as="p" role="status" className="community-notice">{message}</UiNode>}
 {profile && <UiNode as="section" className="community-profile"><UiNode as="div" className="community-profile-cover"/><UiNode as="div" className="community-profile-head">{avatarView(profile)}<UiNode as="span"><UiNode as="small">{profileKind(profile.kind)}</UiNode><UiNode as="h2"><UserText>{profile.display_name}</UserText></UiNode><UiNode as="p">@{profile.handle} · {followers} takipçi</UiNode></UiNode>{canManage(profile.id) ? <UiNode as="button" onClick={() => editProfile(profile)}>Profili düzenle</UiNode> : <UiNode as="button" disabled={busy} onClick={() => void toggleFollow(profile)}>{following.has(profile.id) ? uiText("Takibi bırak") : uiText("Takip et")}</UiNode>}</UiNode><UiNode as="p"><UserText>{profile.bio || uiText('Henüz bir tanıtım eklenmedi.')}</UserText></UiNode><UiNode as="p"><UserText>{[profile.city, profile.specialty].filter(Boolean).join(' · ')}</UserText></UiNode>{profile.website && <UiNode as="a" href={profile.website} target="_blank" rel="noopener noreferrer">Web sitesi ↗</UiNode>}</UiNode>}
 {!bookmarksReady && <CommunitySetup compact onRetry={() => setRetry(n => n + 1)}/>}
 <UiNode as="div" className="community-feed-tools"><UiNode as="button" type="button" onClick={() => void load()}>Akışı yenile</UiNode>{initialHandle && <UiNode as="label"><UiNode as="input" type="checkbox" checked={mediaOnly} onChange={e => setMediaOnly(e.target.checked)}/> Yalnız fotoğraf ve videolar</UiNode>}{initialPostId && <Link href="/community">← Topluluğa dön</Link>}</UiNode>
 <UiNode as="form" className="community-filters" onSubmit={e => { e.preventDefault(); setSearch(query.trim()); }}><UiNode as="input" aria-label="Toplulukta ara" placeholder={tab === 'people' ? 'Profil adı ara…' : 'Paylaşım içeriğinde ara…'} value={query} maxLength={100} onChange={e => setQuery(e.target.value)}/><UiNode as="button">{uiText("Ara")}</UiNode>{tab !== 'people' && <UiNode as="select" aria-label="Konu kategorisi" value={category} onChange={e => setCategory(e.target.value)}><UiNode as="option" value="all">Tüm konular</UiNode>{Object.entries(COMMUNITY_CATEGORIES).map(([key, label]) => <UiNode as="option" key={key} value={key}>{label}</UiNode>)}</UiNode>}</UiNode>
 {tab === 'people' && !initialHandle ? <UiNode as="div" className="community-directory">{directory.map(p => <UiNode as="article" key={p.id}>{avatarView(p)}<UiNode as="small">{profileKind(p.kind)}</UiNode><UiNode as="h2"><Link href={`/community/profile/${p.handle}`}><UserText>{p.display_name}</UserText></Link></UiNode><UiNode as="p"><UserText>{p.specialty || p.city || uiText('DentAYA üyesi')}</UserText></UiNode>{!canManage(p.id) && <UiNode as="button" disabled={busy} onClick={() => void toggleFollow(p)}>{following.has(p.id) ? uiText("Takibi bırak") : uiText("Takip et")}</UiNode>}</UiNode>)}</UiNode> : tab === 'moderation' ? reports.map(report => <UiNode as="article" key={report.id} className="community-card"><UiNode as="h3">İçerik şikâyeti</UiNode><UiNode as="p">{report.reason}</UiNode><UiNode as="details"><UiNode as="summary">Şikâyet edilen içeriği incele</UiNode><UiNode as="h4"><UserText>{report.post?.title}</UserText></UiNode><UiNode as="p" className="community-body"><UserText>{report.post?.body}</UserText></UiNode>{report.post?.media_path && <CommunityMedia path={report.post.media_path} video={report.post.media_type === 'video'}/>}</UiNode><UiNode as="button" disabled={busy} onClick={() => void action(async () => {
                const r = await supabase.rpc('community_review_report', { report: report.id, hide_content: true });
                if (r.error)
                    throw r.error;
                setMessage('İçerik gizlendi.');
                await load();
            })}>İçeriği gizle</UiNode><UiNode as="button" disabled={busy} onClick={() => void action(async () => {
                const r = await supabase.rpc('community_review_report', { report: report.id, hide_content: false });
                if (r.error)
                    throw r.error;
                await load();
            })}>Şikâyeti kapat</UiNode></UiNode>) : posts.map(post => <UiNode as="article" key={post.id} className="community-card"><UiNode as="header"><Link className="community-author" href={`/community/profile/${post.author.handle}`}>{avatarView(post.author)}<UiNode data-dy-copy-stack as="span"><UiNode as="strong"><UserText>{post.author.display_name}</UserText></UiNode><UiNode as="small">{profileKind(post.author.kind)} · {new Date(post.created_at).toLocaleDateString(intlLocale())}</UiNode></UiNode></Link><UiNode as="span" className="community-tag">{post.kind === 'article' ? uiText("Makale") : post.kind === 'discussion' ? uiText("Forum") : uiText("Paylaşım")}</UiNode></UiNode><UiNode as="small" className="community-category">{COMMUNITY_CATEGORIES[post.category as keyof typeof COMMUNITY_CATEGORIES]}</UiNode>{post.title && <UiNode as="h2"><UserText>{post.title}</UserText></UiNode>}<UiNode as="p" className="community-body"><UserText>{expanded.has(post.id) ? post.body : post.body.slice(0, 700)}</UserText><UserText>{post.body.length > 700 && !expanded.has(post.id) ? '…' : ''}</UserText></UiNode>{post.body.length > 700 && <UiNode as="button" onClick={() => setExpanded(prev => {
                    const next = new Set(prev);
                    if (next.has(post.id))
                        next.delete(post.id);
                    else
                        next.add(post.id);
                    return next;
                })}>{expanded.has(post.id) ? uiText("Daha az göster") : uiText("Devamını oku")}</UiNode>}{post.media_path && <CommunityMedia path={post.media_path} video={post.media_type === 'video'}/>}
 <UiNode as="footer"><Link className="community-post-link" href={`/community/post/${post.id}`}>Paylaşımı aç ↗</Link>{post.status === 'published' && <UiNode as="button" disabled={busy || !bookmarksReady} title={bookmarksReady ? 'Paylaşımı özel listene kaydet' : 'Kaydetme için topluluk güncellemesi gerekiyor'} aria-pressed={saved.has(post.id)} onClick={() => void action(async () => {
                    const exists = saved.has(post.id);
                    const result = exists ? await supabase.from('community_bookmarks').delete().eq('post_id', post.id).eq('user_id', userId) : await supabase.from('community_bookmarks').insert({ post_id: post.id, user_id: userId });
                    if (result.error)
                        throw result.error;
                    setSaved(current => {
                        const next = new Set(current);
                        if (exists)
                            next.delete(post.id);
                        else
                            next.add(post.id);
                        return next;
                    });
                    setMessage(exists ? 'Kayıt kaldırıldı.' : 'Kaydettiklerine eklendi.');
                })}>{saved.has(post.id) ? 'Kaydedildi' : uiText("Kaydet")}</UiNode>}{post.status === 'published' && <><UiNode as="button" disabled={busy} aria-pressed={liked.has(post.id)} onClick={() => void toggleLike(post)}>♡ {post.likes[0]?.count ?? 0} Beğeni</UiNode><UiNode as="button" onClick={() => {
                    if (openComments === post.id) {
                        commentRequest.current++;
                        setOpenComments('');
                    }
                    else
                        void loadComments(post.id);
                }}>◯ {post.comments[0]?.count ?? 0} {uiText(" Yorum")}</UiNode></>}{canManage(post.profile_id) && <><UiNode as="button" disabled={busy} onClick={() => { setEditingPost(post); setRemoveExistingMedia(false); setActor(post.profile_id); setPostKind(post.kind); setPostCategory(post.category); setTitle(post.title); setBody(post.body); setMedia(null); setConsent(false); setDraft(post.status === 'draft'); postDialog.current?.showModal(); }}>{uiText("Düzenle")}</UiNode>{post.status === 'draft' && <UiNode as="button" disabled={busy} onClick={() => void action(async () => {
                        const r = await supabase.from('community_posts').update({ status: 'published' }).eq('id', post.id).select('id').single();
                        if (r.error)
                            throw r.error;
                        await load();
                        setMessage('Taslak yayımlandı.');
                    })}>Yayımla</UiNode>}<UiNode as="button" disabled={busy} onClick={() => {
                    if (window.confirm(uiText('Bu paylaşımı ve yorumlarını silmek istiyor musun?')))
                        void action(async () => {
                            const r = await supabase.from('community_posts').delete().eq('id', post.id).select('id').single();
                            if (r.error)
                                throw r.error;
                            if (post.media_path?.startsWith(userId + '/'))
                                await supabase.storage.from('dentaya-community').remove([post.media_path]);
                            await load();
                        });
                }}>{uiText("Sil")}</UiNode></>}{post.status === 'published' && !canManage(post.profile_id) && <UiNode as="button" disabled={busy} onClick={() => {
                    const reason = window.prompt(uiText('Şikâyet nedenini yaz (en az 5 karakter):'));
                    if (reason && reason.trim().length >= 5)
                        void action(async () => {
                            const r = await supabase.from('community_reports').insert({ post_id: post.id, user_id: userId, reason: reason.trim() });
                            if (r.error)
                                throw r.error;
                            setMessage('Şikâyetin inceleme kuyruğuna alındı.');
                        });
                }}>Şikâyet et</UiNode>}</UiNode>
 {openComments === post.id && <UiNode as="section" className="community-comments" aria-label={uiText("Yorumlar")}>{comments.map(c => <UiNode as="div" key={c.id}><Link href={`/community/profile/${c.author.handle}`}><UserText>{c.author.display_name}</UserText></Link><UiNode as="p"><UserText>{c.body}</UserText></UiNode>{(canManage(c.profile_id) || moderator) && <UiNode as="button" disabled={busy} onClick={() => void action(async () => {
                            const r = await supabase.from('community_comments').delete().eq('id', c.id).select('id').single();
                            if (r.error)
                                throw r.error;
                            await loadComments(post.id);
                            setPosts(rows => rows.map(p => p.id === post.id ? { ...p, comments: [{ count: Math.max(0, (p.comments[0]?.count ?? 0) - 1) }] } : p));
                        })}>Yorumu sil</UiNode>}</UiNode>)}{commentsMore && <UiNode as="button" onClick={() => void loadComments(post.id, true)}>Diğer yorumlar</UiNode>}<UiNode as="form" onSubmit={e => { e.preventDefault(); void addComment(post.id); }}><UiNode as="textarea" aria-label="Yorumun" placeholder="Görüşünü paylaş…" value={commentText} maxLength={4000} required onChange={e => setCommentText(e.target.value)}/><UiNode as="button" disabled={busy || !actor || !commentText.trim()}>Yorum yap</UiNode></UiNode>{!actor && <UiNode as="p">Yorum için önce profil oluştur.</UiNode>}</UiNode>}
 </UiNode>)}
 {loading ? <UiNode as="p" role="status">{uiText("Yükleniyor…")}</UiNode> : !posts.length && tab !== 'people' && tab !== 'moderation' ? <UiNode as="div" className="community-empty"><UiNode as="h2">{initialPostId ? "Paylaşım bulunamadı veya görünür değil." : "Burada henüz paylaşım yok."}</UiNode><UiNode as="p">{initialPostId ? "İçerik silinmiş, taslağa alınmış veya gizlenmiş olabilir." : "İlk deneyimi, soruyu veya makaleyi sen paylaş."}</UiNode></UiNode> : null}{!loading && tab === 'people' && !directory.length && <UiNode as="p">Profil bulunamadı.</UiNode>}{!loading && tab === 'moderation' && !reports.length && <UiNode as="p">Açık şikâyet yok.</UiNode>}{hasMore && <UiNode as="button" disabled={loading} onClick={() => void load(true, posts, directory.length)}>Daha fazla göster</UiNode>}
 </UiNode><UiNode as="aside" className="community-guide"><UiNode as="small">MESLEKİ PAYLAŞIM ALANI</UiNode><UiNode as="h3">Deneyimin değerli.</UiNode><UiNode as="p">Bir teknik anlat, bir soru sor veya tamamladığın çalışmayı paylaş.</UiNode><UiNode as="h4">Hasta mahremiyeti</UiNode><UiNode as="p">Hasta kimliği, özel vaka kaydı veya izinsiz fotoğraf paylaşma. Bu alanın içeriğini diğer DentAYA üyeleri görebilir.</UiNode><UiNode as="h4">Birbirimize saygı</UiNode><UiNode as="p">Yorumları konuya odakla. Uygunsuz içerikleri şikâyet edebilirsin.</UiNode><Link href="/community">Topluluğu keşfet →</Link></UiNode></UiNode>
 <UiNode as="dialog" ref={profileDialog} className="community-dialog" onCancel={e => {
            if (busy)
                e.preventDefault();
        }}><UiNode as="form" onSubmit={e => void saveProfile(e)}><UiNode as="header"><UiNode as="h2">{editingProfile ? 'Profili düzenle' : 'Profilini oluştur'}</UiNode><UiNode as="button" type="button" disabled={busy} onClick={() => profileDialog.current?.close()}>{uiText("Kapat")}</UiNode></UiNode>{!editingProfile && <UiNode as="label">Profil türü<UiNode as="select" value={profileTarget} onChange={e => setProfileTarget(e.target.value)}><UiNode as="option" value="person" disabled={mine.some(p => p.kind === 'person')}>Kişisel profil</UiNode>{orgs.filter(o => !mine.some(p => p.organization_id === o.id)).map(o => <UiNode as="option" key={o.id} value={o.id}>{o.name} · {profileKind(o.org_type)}</UiNode>)}</UiNode></UiNode>}<UiNode as="label">Görünen ad<UiNode as="input" required minLength={2} maxLength={100} value={profileForm.display_name} onChange={e => setProfileForm(p => ({ ...p, display_name: e.target.value }))}/></UiNode><UiNode as="label">Kullanıcı adı<UiNode as="input" required pattern="[a-z0-9][a-z0-9_]{2,39}" maxLength={40} value={profileForm.handle} placeholder="klinik_adi" onChange={e => setProfileForm(p => ({ ...p, handle: e.target.value.toLowerCase() }))}/></UiNode><UiNode as="label">Hakkında<UiNode as="textarea" maxLength={1200} value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}/></UiNode><UiNode as="label">{uiText("Şehir")}<UiNode as="input" maxLength={100} value={profileForm.city} onChange={e => setProfileForm(p => ({ ...p, city: e.target.value }))}/></UiNode><UiNode as="label">Uzmanlık / çalışma alanı<UiNode as="input" maxLength={120} value={profileForm.specialty} onChange={e => setProfileForm(p => ({ ...p, specialty: e.target.value }))}/></UiNode><UiNode as="label">Web sitesi<UiNode as="input" type="url" pattern="https://.*" placeholder="https://" maxLength={500} value={profileForm.website} onChange={e => setProfileForm(p => ({ ...p, website: e.target.value }))}/></UiNode><UiNode as="label">Profil fotoğrafı · en fazla 10 MB<UiNode as="input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setAvatar(e.target.files?.[0] ?? null)}/></UiNode><UiNode as="p" role="status">{message}</UiNode><UiNode as="button" className="community-primary" disabled={busy}>{busy ? uiText("Kaydediliyor…") : 'Profili kaydet'}</UiNode></UiNode></UiNode>
 <UiNode as="dialog" ref={postDialog} className="community-dialog" onCancel={e => {
            if (busy)
                e.preventDefault();
        }}><UiNode as="form" onSubmit={e => void publish(e)}><UiNode as="header"><UiNode as="h2">{editingPost ? 'Paylaşımı düzenle' : 'Yeni paylaşım'}</UiNode><UiNode as="button" type="button" disabled={busy} onClick={() => postDialog.current?.close()}>{uiText("Kapat")}</UiNode></UiNode><UiNode as="label">Paylaşan<UiNode as="select" disabled={Boolean(editingPost)} value={actor} onChange={e => setActor(e.target.value)}>{mine.map(p => <UiNode as="option" key={p.id} value={p.id}><UserText>{p.display_name}</UserText></UiNode>)}</UiNode></UiNode><UiNode as="label">İçerik türü<UiNode as="select" value={postKind} onChange={e => setPostKind(e.target.value as typeof postKind)}><UiNode as="option" value="post">Fotoğraf / video / kısa paylaşım</UiNode><UiNode as="option" value="discussion">Forum konusu</UiNode><UiNode as="option" value="article">{uiText("Makale")}</UiNode></UiNode></UiNode><UiNode as="label">Konu<UiNode as="select" value={postCategory} onChange={e => setPostCategory(e.target.value)}>{Object.entries(COMMUNITY_CATEGORIES).map(([id, label]) => <UiNode as="option" key={id} value={id}>{label}</UiNode>)}</UiNode></UiNode><UiNode as="label">{uiText("Başlık")}{postKind === 'post' ? ' (isteğe bağlı)' : ''}<UiNode as="input" required={postKind !== 'post'} minLength={postKind === 'post' ? undefined : 3} maxLength={180} value={title} onChange={e => setTitle(e.target.value)}/></UiNode><UiNode as="label">{postKind === 'article' ? 'Makale metni' : 'İçerik'}<UiNode as="textarea" required rows={postKind === 'article' ? 12 : 5} maxLength={30000} value={body} onChange={e => setBody(e.target.value)}/></UiNode><UiNode as="label">Fotoğraf veya video<UiNode as="input" key={media?.name ?? 'empty'} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={e => setMedia(e.target.files?.[0] ?? null)}/><UiNode as="small">Tek dosya · Fotoğraf 10 MB, video 50 MB · JPG, PNG, WebP, MP4, WebM</UiNode></UiNode>{editingPost?.media_path && <UiNode as="label" className="community-check"><UiNode as="input" type="checkbox" checked={removeExistingMedia} onChange={e => setRemoveExistingMedia(e.target.checked)}/>Mevcut fotoğraf / videoyu paylaşımdan kaldır</UiNode>}{media && <UiNode as="button" type="button" onClick={() => setMedia(null)}>Yeni dosyayı kaldır: {media.name}</UiNode>}<UiNode as="label" className="community-check"><UiNode as="input" type="checkbox" checked={draft} onChange={e => setDraft(e.target.checked)}/>Taslak olarak sakla</UiNode><UiNode as="label" className="community-check"><UiNode as="input" required type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>Hasta kimliği veya izinsiz görsel içermediğini ve paylaşım hakkım olduğunu onaylıyorum.</UiNode><UiNode as="p" role="status">{message}</UiNode><UiNode as="button" className="community-primary" disabled={busy || !consent || !body.trim()}>{busy ? uiText("Yükleniyor…") : draft ? 'Taslağı kaydet' : 'Yayımla'}</UiNode></UiNode></UiNode>
 </UiNode>;
}
function CommunitySetup({ onRetry, compact = false }: {
    onRetry: () => void;
    compact?: boolean;
}) { return <UiNode as="section" className="community-setup" role="status"><UiNode as="span" className="community-setup-label">{compact ? 'GÜNCELLEME GEREKİYOR' : 'TOPLULUK KURULUMU'}</UiNode><UiNode as="h2">{compact ? 'Paylaşımlar açık; kaydetme henüz hazır değil.' : 'Topluluğu etkinleştirin'}</UiNode><UiNode as="p">{compact ? 'Kaydedilenler tablosu eksik. Diğer topluluk özelliklerini kullanmaya devam edebilirsiniz.' : 'Bu projede topluluk tabloları eksik. Kurulumu Supabase proje yöneticisi bir kez tamamlamalı.'}</UiNode><UiNode as="ol"><UiNode as="li">Aşağıdan SQL kurulum dosyasını indirin.</UiNode><UiNode as="li">DentAYA’ya bağlı Supabase projesinde SQL Editor → New query açın.</UiNode><UiNode as="li">Dosyanın tamamını yapıştırıp Run düğmesine basın. Mevcut kurulum varsa yalnız eksik yeni tablo eklenir.</UiNode><UiNode as="li">SQL başarıyla bitince bağlantıyı yeniden kontrol edin.</UiNode></UiNode><UiNode as="div"><UiNode as="a" href="/community-setup.sql" download="TOPLULUK_KUR_VE_GUNCELLE.sql">SQL dosyasını indir</UiNode><UiNode as="button" type="button" onClick={onRetry}>Bağlantıyı yeniden kontrol et</UiNode></UiNode><UiNode as="small">Uygulamayı yeniden kurmak bu tabloları oluşturmaz. SQL hata verirse hata metnini proje yöneticinizle paylaşın.</UiNode></UiNode>; }
