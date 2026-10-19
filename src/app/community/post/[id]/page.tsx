import CommunityClient from '../../CommunityClient';
export default async function PostPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CommunityClient initialPostId={id}/>;}
