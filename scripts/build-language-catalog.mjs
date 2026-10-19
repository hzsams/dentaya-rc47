import fs from 'node:fs';
const locales=['en','de','fr','es','it','pt','nl','pl','ro','ru','uk','ar','zh','ja'],catalog={};
for(const [i,line] of fs.readFileSync('src/lib/i18n/catalog.tsv','utf8').trim().split('\n').entries()){
 const [key,...values]=line.split('|');
 if(!key||values.length!==14||values.some(v=>!v.trim())||catalog[key])throw Error(`Invalid translation row ${i+1}: ${key}`);
 catalog[key]=Object.fromEntries(locales.map((locale,index)=>[locale,values[index]]));
}
const extraLocales=['sv','da','el','cs','ko'],seen=new Set();
for(const [i,line] of fs.readFileSync('src/lib/i18n/catalog-extra.tsv','utf8').trim().split('\n').entries()){
 const [key,...values]=line.split('|');
 if(!catalog[key]||values.length!==5||values.some(v=>!v.trim())||seen.has(key))throw Error(`Invalid extra translation row ${i+1}: ${key}`);
 seen.add(key);Object.assign(catalog[key],Object.fromEntries(extraLocales.map((locale,index)=>[locale,values[index]])));
}
if(seen.size!==Object.keys(catalog).length)throw Error('Missing extra-language rows');
fs.writeFileSync('src/lib/i18n/catalog.json',JSON.stringify(catalog,null,2)+'\n');
console.log(`${Object.keys(catalog).length} source messages × 19 translations`);

for (const filename of ['eu-bootstrap.json','pack-bootstrap.json']) {
 const bootstrap=JSON.parse(fs.readFileSync('src/lib/i18n/'+filename,'utf8'));
 for(const [locale,values] of Object.entries(bootstrap.values)) {
  if(values.length!==bootstrap.keys.length||values.some(v=>typeof v!=='string'||!v.trim()))throw Error('Invalid bootstrap '+locale);
  bootstrap.keys.forEach((key,i)=>{catalog[key]??={};catalog[key][locale]=values[i];});
 }
}
fs.writeFileSync('src/lib/i18n/catalog.json',JSON.stringify(catalog,null,2)+'\n');
console.log('31 locale bootstrap connected. Complete interface packs are prepared separately.');
