/* Shared, offline catalogue. Questions, not spelling variants, are counted.
   No network, model training, patient inference or automatic CAD actions here. */
'use strict';
const groups=[
 ['aya','AYA ve sohbet'],['workflow','CAD günlük iş akışı'],
 ['geometry','Geometri ve anatomi'],['display','Görünüm ve renkler'],
 ['files','Tarama ve dosyalar'],['desktop','Masaüstü ve veri'],
 ['dental','Temel diş bilgisi'],['production','Üretim kontrol notları'],
 ['fdi','FDI diş numaraları']
];
const sources={
 project:{name:'DentAYA RC46 · kaynak kodu ve kullanım akışı',url:null,kind:'application'},
 technical:{name:'AYA · bağımsız yazılmış genel geometri ve süreç notları',url:null,kind:'technical'},
 anatomy:{name:'ADA · Tooth anatomy',url:'https://www.mouthhealthy.org/all-topics-a-z/tooth',kind:'education'},
 glossary:{name:'ADA · Dental glossary',url:'https://www.mouthhealthy.org/glossary',kind:'education'},
 hygiene:{name:'NIDCR · Oral hygiene',url:'https://www.nidcr.nih.gov/health-info/oral-hygiene',kind:'education'},
 decay:{name:'NIDCR · Tooth decay',url:'https://www.nidcr.nih.gov/health-info/tooth-decay',kind:'education'},
 gum:{name:'NIDCR · Gum disease',url:'https://www.nidcr.nih.gov/health-info/gum-disease',kind:'education'},
 dry:{name:'NIDCR · Dry mouth',url:'https://www.nidcr.nih.gov/health-info/dry-mouth',kind:'education'},
 bruxism:{name:'NIDCR · Bruxism',url:'https://www.nidcr.nih.gov/health-info/bruxism',kind:'education'},
 implant:{name:'FDA · Dental implants',url:'https://www.fda.gov/medical-devices/dental-devices/dental-implants-what-you-should-know',kind:'education'},
 crown:{name:'ADA · Crowns',url:'https://www.mouthhealthy.org/all-topics-a-z/crowns',kind:'education'},
 endo:{name:'AAE · Root canal treatment',url:'https://www.aae.org/patients/root-canal-treatment/what-is-a-root-canal/',kind:'education'},
 emergency:{name:'NHS · Dental abscess',url:'https://www.nhs.uk/conditions/dental-abscess/',kind:'education'},
 fdi:{name:'ISO 3950 · diş tanımlama sistemi',url:'https://www.iso.org/standard/68292.html',kind:'notation'}
};
const dentalSources=['anatomy','anatomy','anatomy','anatomy','anatomy','anatomy','hygiene','hygiene','decay','decay','hygiene','hygiene','gum','gum','dry','bruxism','implant','implant','implant','crown','endo','emergency','emergency','glossary','fdi'];
const rows=[...require('./catalog/workspace.cjs'),...require('./catalog/geometry.cjs'),...require('./catalog/files.cjs'),...require('./catalog/dental.cjs')];
const facets=['definition','steps','check','mistake'];
const labels=['nedir?','için nasıl ilerlerim?','konusunda neyi kontrol etmeliyim?','ile ilgili sık yapılan hata nedir?'];
const topics=rows.map(([id,title,aliases,...answers],i)=>({id,title,aliases:aliases.split(','),category:groups[Math.floor(i/25)][0],answers,sourceIds:[i>=150&&i<175?dentalSources[i-150]:i<50||i>=75&&i<100||i>=125&&i<150?'project':'technical']}));
const entries=topics.flatMap(topic=>facets.map((facet,i)=>({id:topic.id+'-'+facet,topicId:topic.id,category:topic.category,question:topic.title+' '+labels[i],answer:topic.answers[i],facet,sourceIds:topic.sourceIds})));
const quadrant=['','üst sağ','üst sol','alt sol','alt sağ','üst sağ','üst sol','alt sol','alt sağ'];
const names=['','santral kesici','lateral kesici','kanin','birinci küçük azı','ikinci küçük azı','birinci büyük azı','ikinci büyük azı','üçüncü büyük azı'];
for(let region=1;region<=8;region++)for(let position=1;position<=(region<=4?8:5);position++){
 const code=String(region)+position,primary=region>=5,kind=primary?'süt':'daimi',name=primary&&position>=4?(position===4?'birinci süt azı':'ikinci süt azı'):names[position];
 const title=code+' numaralı diş',group=position<=2?'kesici':position===3?'kanin':!primary&&position<=5?'küçük azı':'büyük azı';
 const answers=[
  `FDI ${code}, hastanın ${quadrant[region]} bölgesindeki ${primary&&position>=4?'':kind+' '}${name} dişini belirtir. Bu kod hastada dişin mevcut olduğunu tek başına göstermez.`,
  `FDI ${code}, hastanın ${quadrant[region]} bölgesindedir. Sağ ve sol, ekrana göre değil hastaya göre tanımlanır.`,
  `FDI ${code}, ${kind} dişlenmedeki ${group} grubundadır; aynı pozisyondaki süt ve daimi dişlerin kodları farklıdır.`,
  `${code} kodunda ${region} rakamı ${kind} ${quadrant[region]} bölgesini, ${position} rakamı orta hattan ${position}. sırayı belirtir. Kod, iki rakam ayrı okunarak ifade edilebilir.`
 ];
 const questions=[`${code} hangi diştir?`,`${code} numaralı diş hangi bölgededir?`,`${code} süt dişi mi daimi mi ve hangi gruptadır?`,`${code} FDI kodundaki rakamlar ne anlama gelir?`];
 const topic={id:'fdi-'+code,title,aliases:[`fdi ${code}`,`${code} diş`],category:'fdi',answers,sourceIds:['fdi']};
 topics.push(topic);
 facets.forEach((facet,i)=>entries.push({id:topic.id+'-'+facet,topicId:topic.id,category:'fdi',question:questions[i],answer:answers[i],facet,sourceIds:['fdi']}));
}
const CATALOG_VERSION='1.0.0';
const stats=Object.freeze({version:CATALOG_VERSION,questions:entries.length,topics:topics.length,language:'tr',categories:groups.map(([id,title])=>({id,title,questions:entries.filter(e=>e.category===id).length}))});
module.exports={CATALOG_VERSION,entries,topics,facets,stats,sources};
