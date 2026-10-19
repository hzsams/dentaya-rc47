import CommunityClient from './CommunityClient';
export default async function CommunityPage({searchParams}:{searchParams:Promise<{tab?:string}>}){const {tab}=await searchParams;const allowed=['feed','saved','following','discussion','article','people','drafts','moderation'];return <CommunityClient initialTab={allowed.includes(tab??'')?tab:'feed'}/>;}
