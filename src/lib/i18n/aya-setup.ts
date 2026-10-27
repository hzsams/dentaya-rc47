// Setup copy uses explicit TR/EN fallback without changing the selected language.
export function ayaSetupText(locale:string){
 const tr=locale==='tr';
 return {title:tr?'4B yerel model seçeneği':'4B local model option',hint:tr?'16 GB RAM için Qwen3 4B seçeneği. Önce Ollama’nın bu bilgisayarda kurulu ve açık olması gerekir. İndirme tamamlanınca modeli listeden seçip yanıtını test edin. Hız işlemciye bağlıdır.':'Qwen3 4B is an option for 16 GB RAM. Ollama must be installed and running on this computer first. After downloading, select the model and test its reply. Speed depends on the processor.',download:tr?'Ollama ile 4B modeli indir':'Download 4B model with Ollama',cancel:tr?'4B indirmeyi durdur':'Stop 4B download',getOllama:tr?'Ollama’yı indir':'Download Ollama',offline:tr?'Ollama bağlantısı yok. Ollama’yı kurup açtıktan sonra modelleri yenileyin.':'Ollama is unavailable. Install and start Ollama, then refresh models.'};
}
