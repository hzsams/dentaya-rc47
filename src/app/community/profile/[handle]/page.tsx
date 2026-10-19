import CommunityClient from '../../CommunityClient';
export default async function ProfilePage({params}:{params:Promise<{handle:string}>}){const {handle}=await params;return <CommunityClient initialHandle={handle}/>;}
