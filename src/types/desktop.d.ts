export {};
declare global {
  interface Window {
    dentayaDesktop?: {
      languagePackGet?: (input:{locale:string}) => Promise<{ok:boolean;error?:string;hash?:string;revision?:string;entries?:Record<string,string>;completed?:number;total?:number;ready?:boolean}>;
      languagePackStart?: (input:{locale:string;model:string}) => Promise<{ok:boolean;error?:string}>;
      languagePackStatus?: () => Promise<{running:boolean;locale:string;completed:number;total:number;error:string;model:string}>;
      languagePackCancel?: () => Promise<{ok:boolean}>;
      languagePackActivate?: (input:{locale:string}) => Promise<{ok:boolean;error?:string}>;
      languagePackImport?: (input:{locale:string;hash:string;entries:Record<string,string>}) => Promise<{ok:boolean;error?:string;completed?:number;total?:number;ready?:boolean}>;
      localAyaInstall?:()=>Promise<{ok:boolean;error?:string}>;
      localAyaInstallCancel?:()=>Promise<{ok:boolean;error?:string}>;
      localAyaEngineStop?:()=>Promise<{ok:boolean;error?:string}>;
      localAyaImportModel?:()=>Promise<{ok:boolean;error?:string}>;
      onLocalAyaToken?:(callback:(value:{requestId:string;output:string})=>void)=>()=>void;
      localAyaStatus?: () => Promise<{ollama?:{online:boolean;progress:{running:boolean;status:string;completed:number;total:number}};ok:boolean;error?:string;models:{name:string;size:number;label?:string}[];managed?:{installed:boolean;running:boolean;version:string;error:string;models:{name:string;size:number;label?:string}[];progress:{running:boolean;status:string;completed:number;total:number}};progress:{running:boolean;status:string;completed:number;total:number}}>;
      localAyaGuide?: (input:{prompt:string;locale?:string}) => Promise<{ok:boolean;error?:string;output?:string;references?:{id:string;title:string;href:string}[]}>;
      localAyaChat?: (input:{agent?:boolean;task?:'memory';assistantReply?:string;workingMemory?:import('../../electron/aya/agent.cjs').AyaWorkingMemory;requestId?:string;knowledge?:import('../lib/aya-knowledge').KnowledgeItem[];useMemory?:boolean;cadContext?:import('../lib/aya-cad-assistance').AyaCadContext;prompt:string;model:string;locale:string;detail:string;options?:{role:string;style:string;creativity:number;maxTokens:number;useKnowledge:boolean;useNote:boolean;note:string};history:{role:"user"|"assistant";content:string}[]}) => Promise<{ok:boolean;error?:string;output?:string;model?:string;workingMemory?:import('../../electron/aya/agent.cjs').AyaWorkingMemory;proposals?:import('../../electron/aya/agent.cjs').AyaProposal[];references?:{id:string;title:string;href:string}[];metrics?:{milliseconds:number;tokens:number}}>;
      localAyaCancel?: () => Promise<{ok:boolean}>;
      localAyaDownload?: () => Promise<{ok:boolean;error?:string}>;
      localAyaCancelDownload?: () => Promise<{ok:boolean;error?:string}>;
      saveAyaConnection?: (input: {key:string;model:string}) => Promise<{ok:boolean;message:string}>;
      updateDesktopIcon: (logo: string) => Promise<{ok: boolean; message: string}>;
      onOpenPreferences: (callback: () => void) => () => void;
    };
  }
}
