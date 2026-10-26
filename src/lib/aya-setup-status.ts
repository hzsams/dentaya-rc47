const messages={
 disk:['Yerel model için disk alanı yetersiz. Yer açıp kurulumu yeniden deneyin.','There is not enough disk space for the local model. Free up space and retry setup.'],
 file:['Bu dosya desteklenen bir GGUF modeli değil. Geçerli bir GGUF v2/v3 dosyası seçin.','This file is not a supported GGUF model. Select a valid GGUF v2/v3 file.'],
 platform:['Otomatik motor kurulumu Windows içindir. Bu bilgisayarda kurulu yerel Ollama modelini seçebilirsiniz.','Automatic engine setup requires Windows. You can select a local Ollama model installed on this computer.'],
 integrity:['İndirilen dosyanın bütünlüğü doğrulanamadı. Kurulumu yeniden deneyin; dosya doğrulanmadan kullanılmaz.','The downloaded file could not be verified. Retry setup; unverified files are not used.'],
 network:['Model indirilemedi. İnternet bağlantısını ve indirme erişimini kontrol edip yeniden deneyin. Kurulu yerel modelleri kullanabilirsiniz.','The model could not be downloaded. Check the connection and download access, then retry. Installed local models remain available.'],
 engine:['Model dosyası mevcut, ancak yerel motor eksik. Motoru kurun veya kurulu bir Ollama modeli seçin.','The model file is present, but its local engine is missing. Install the engine or select an installed Ollama model.'],
 memory:['Yerel motor modeli yüklerken bellek ayıramadı. Diğer uygulamaları kapatın veya daha küçük bir yerel model seçip yeniden deneyin.','The local engine could not allocate memory while loading the model. Close other applications or select a smaller local model and retry.'],
 modelLoad:['Yerel motor bu modeli yükleyemedi. Model dosyasını doğrulayın veya uyumlu bir GGUF modeli seçin.','The local engine could not load this model. Verify the model file or select a compatible GGUF model.'],
 library:['Yerel motorun çalışması için gereken dosyalar yüklenemedi. Motor kurulumunu yenileyin veya kurulu bir Ollama modeli seçin.','Files required by the local engine could not be loaded. Reinstall the engine or select an installed Ollama model.'],
 permission:['Yerel motorun çalıştırılmasına izin verilmedi. Motor klasörünün erişim izinlerini ve güvenlik yazılımının engellerini kontrol edin.','The local engine was not allowed to run. Check access to the engine folder and any security software blocks.'],
 port:['Yerel motor bağlantı noktasını açamadı. Motoru durdurup yeniden deneyin; sorun sürerse uygulamayı yeniden başlatın.','The local engine could not open its port. Stop the engine and retry; restart the app if the problem continues.'],
 startup:['Yerel motor başlatılamadı. Motor kurulumunu kontrol edip yeniden deneyin veya kurulu başka bir yerel model seçin.','The local engine could not start. Check the engine installation and retry, or select another installed local model.'],
 busy:['Yerel motor başka bir işlemde. İşlemin bitmesini bekleyin veya mevcut yanıtı durdurun.','The local engine is busy. Wait for the operation to finish or stop the current reply.'],
 missing:['Model dosyası bulunamadı. Listeyi yenileyin veya geçerli bir yerel model ekleyin.','The model file was not found. Refresh the list or add a valid local model.'],
 generic:['Yerel motor işlemi tamamlanamadı. Motoru ve modelleri yenileyip yeniden deneyin.','The local engine operation could not finish. Refresh the engine and models, then retry.'],
} as const;
/** Never render raw native errors, local paths or transport URLs as user guidance. */
export function ayaSetupError(error:unknown,locale:string) {
 const code=typeof error==='string'?error:'';
 const engineErrors={AYA_ENGINE_MEMORY:'memory',AYA_ENGINE_MODEL_LOAD:'modelLoad',AYA_ENGINE_LIBRARY:'library',AYA_ENGINE_PERMISSION:'permission',AYA_ENGINE_PORT:'port',AYA_ENGINE_START_FAILED:'startup'} as const;
 const key=Object.hasOwn(engineErrors,code)?engineErrors[code as keyof typeof engineErrors]:code==='AYA_DISK_FULL'?'disk':code==='AYA_GGUF_INVALID'?'file':code==='AYA_WINDOWS_REQUIRED'?'platform':code==='AYA_ENGINE_MISSING'?'engine':code==='LOCAL_BUSY'?'busy':code==='MODEL_MISSING'?'missing':['AYA_DOWNLOAD_CHECKSUM','AYA_DOWNLOAD_SIZE','AYA_ENGINE_ARCHIVE'].includes(code)?'integrity':/^AYA_DOWNLOAD_|^(?:fetch failed|EAI_AGAIN|ENOTFOUND|ECONNREFUSED|AYA_INSTALL_FAILED)$/.test(code)?'network':'generic';
 return messages[key][locale==='tr'?0:1];
}
