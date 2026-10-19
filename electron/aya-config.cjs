const fs=require('fs'),path=require('path');
function secure(s){return s.isEncryptionAvailable()&&!(process.platform==='linux'&&s.getSelectedStorageBackend?.()==='basic_text');}
function readAyaEnvironment({directory,safeStorage}){try{const file=path.join(directory,'aya-connection.enc');if(!fs.existsSync(file)||!secure(safeStorage))return {};const d=JSON.parse(safeStorage.decryptString(fs.readFileSync(file)));if(typeof d.key!=='string'||!/^sk-[A-Za-z0-9_-]{17,509}$/.test(d.key)||typeof d.model!=='string'||!/^gpt-[a-zA-Z0-9.-]{1,70}$/.test(d.model))return {};return {OPENAI_API_KEY:d.key,DENTAYA_AI_CLOUD_ENABLED:'true',DENTAYA_AI_MODEL:d.model};}catch{return {};}}
async function saveAyaConnection({directory,safeStorage,key,model,fetchImpl=fetch}){
 if(typeof key!=='string'||!/^sk-[A-Za-z0-9_-]{17,509}$/.test(key))return {ok:false,message:'Geçerli bir OpenAI API anahtarı girin.'};
 if(typeof model!=='string'||!/^gpt-[a-zA-Z0-9.-]{1,70}$/.test(model))return {ok:false,message:'Geçerli bir model adı girin.'};
 if(!secure(safeStorage))return {ok:false,message:'Güvenli anahtar saklama kullanılamıyor. Anahtar kaydedilmedi.'};
 try{
  const r=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model,store:false,max_output_tokens:2048,...(/^gpt-5(?:[.-]|$)/.test(model)&&!model.includes('-pro')?{reasoning:{effort:'low'}}:{}),input:'Bağlantı testi. Yalnızca TAMAM yaz.'}),signal:AbortSignal.timeout(60000)});
  const data=await r.json().catch(()=>null);
  if(!r.ok)return {ok:false,message:r.status===401?'Anahtar doğrulanamadı. API anahtarınızı kontrol edin.':data?.error?.code==='insufficient_quota'?'API bakiyesi veya kullanım kotası yetersiz. Anahtar kaydedilmedi.':r.status===403?'API projesinin bu modele veya Responses API’ye erişim izni yok.':r.status===404?'Bu modele erişim bulunamadı. Model adını kontrol edin.':r.status===429?'Sağlayıcı istek sınırı bildirdi. Daha sonra deneyin.':r.status===400?'Model bu sohbet isteğini kabul etmedi. Model adını ve API erişimini kontrol edin.':'Sohbet bağlantısı doğrulanamadı.'};
  const output=Array.isArray(data?.output)?data.output.flatMap(item=>item.type==='message'&&Array.isArray(item.content)?item.content:[]).filter(item=>item.type==='output_text'&&typeof item.text==='string').map(item=>item.text).join('').trim():'';
  if(data?.status!=='completed'||!output)return {ok:false,message:'Model tamamlanmış bir metin yanıtı vermedi. Bağlantı kaydedilmedi; yeniden deneyin.'};
  fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,'aya-connection.enc');fs.writeFileSync(file+'.tmp',safeStorage.encryptString(JSON.stringify({key,model})),{mode:0o600});fs.renameSync(file+'.tmp',file);
  return {ok:true,message:'Gerçek sohbet yanıtı alındı. Bağlantı şifreli kaydedildi; DentAYA yeniden başlatılıyor.'};
 }catch(error){return {ok:false,message:error?.name==='TimeoutError'?'Model testi zaman aşımına uğradı. Bağlantı kaydedilmedi.':'Bağlantı veya güvenli kayıt tamamlanamadı. Yeniden deneyin.'};}
}
module.exports={readAyaEnvironment,saveAyaConnection};
