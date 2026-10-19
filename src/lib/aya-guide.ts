import docs from '../../electron/aya/knowledge.json';
import {localSetupGuide} from '../../electron/aya/assistant.cjs';
import {DENTAYA_RELEASE} from './release';

const segmenter=new Intl.Segmenter(undefined,{granularity:'word'});
const stop=new Set('ve veya bir bu için ile nasıl ne yap bana kanka ben the and of to is in how what'.split(' '));
const tokens=(s:string)=>[...segmenter.segment(s.toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i'))].filter(w=>w.isWordLike&&w.segment.length>=2&&!stop.has(w.segment)).map(w=>w.segment);
/** The bundled document guide runs in the browser and desktop without a model service. */
export function ayaDocumentGuide(prompt:string,t:(source:string)=>string=s=>s,history:{role:string;content:string}[]=[]){
 if(!prompt.trim()||prompt.length>8000)return {ok:false,error:'INVALID_PROMPT'};
 const words=tokens(prompt);const continuation=/^(devam|continue|more|peki|sonra|next|bun[uı]|it\b)/i.test(prompt.trim());
 const query=continuation?prompt+' '+(history.filter(m=>m.role==='user').at(-1)?.content.slice(0,2000)??''):prompt;
 const terms=[...new Set(continuation?tokens(query):words)];
 const content=(d:typeof docs[number])=>d.id==='desktop-install'?t(d.content).replace(/\bRC\s*29\b|\b29\b/gi,DENTAYA_RELEASE.version.replace(/^.*-rc\./,'RC')):d.id==='local-aya'?localSetupGuide(t):t(d.content);
 const ranked=docs.map(d=>{const hay=tokens(d.title+' '+d.keywords+' '+d.content+' '+t(d.title)+' '+content(d));const head=tokens(d.title+' '+d.keywords+' '+t(d.title));let score=0;for(const q of terms){const n=hay.filter(w=>w===q||(q.length>=4&&w.startsWith(q))||(w.length>=4&&q.startsWith(w))).length;if(n)score+=n/(n+1.2*(.25+.75*hay.length/150))+(head.includes(q)?1:0);}return {doc:d,score};}).filter(r=>r.score>=1.2).sort((a,b)=>b.score-a.score);
 const found=ranked.filter(r=>r.score>=ranked[0]?.score*.45).slice(0,3).map(r=>r.doc);
 return {ok:true,output:found.length?found.map(d=>t(d.title)+'\n'+content(d)).join('\n\n'):t('Bu konuda uygulama belgesi bulunamadı. Yerel model sohbetini kullanın.'),references:found.map(d=>({id:d.id,title:t(d.title),href:d.href}))};
}
