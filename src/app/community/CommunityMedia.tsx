"use client";
import UiNode from "@/lib/i18n/UiNode";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
export default function CommunityMedia({ path, video = false, alt = 'Paylaşım görseli', avatar = false }: {
    path: string;
    video?: boolean;
    alt?: string;
    avatar?: boolean;
}) {
    const [url, setUrl] = useState(''), [failed, setFailed] = useState(false);
    useEffect(() => { let alive = true; setUrl(''); setFailed(false); const refresh = async () => { const { data, error } = await supabase.storage.from('dentaya-community').createSignedUrl(path, 300); if (alive) {
        setUrl(data?.signedUrl ?? '');
        setFailed(Boolean(error));
    } }; void refresh(); const timer = setInterval(() => void refresh(), 240000); return () => { alive = false; clearInterval(timer); }; }, [path]);
    if (failed)
        return <UiNode as="span" className="community-media-failed">Görsel yüklenemedi</UiNode>;
    if (!url)
        return <UiNode as="span" className={avatar ? 'community-avatar' : 'community-media-loading'}>…</UiNode>;
    return video ? <UiNode as="video" className="community-media" src={url} controls preload="metadata" playsInline onError={() => setFailed(true)}/> : <UiNode as="img" className={avatar ? 'community-avatar' : 'community-media'} src={url} alt={alt} loading="lazy" onError={() => setFailed(true)}/>;
}
