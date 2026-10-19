import {readExperience,isQuietTime,type SoundTexture} from './experience-preferences';
export type ExperienceCue='tap'|'tool'|'view'|'brush'|'complete'|'error'|'message';
type Voice={sources:AudioScheduledSourceNode[];gain:GainNode;tail:AudioScheduledSourceNode};
// Original procedural sound design: filtered noise, soft transients and muted resonances.
// No microphone, audio downloads, persistent loops or external sound assets.
export function synthesizeCue(context:BaseAudioContext,destination:AudioNode,cue:ExperienceCue,texture:SoundTexture,volume:number,at=context.currentTime,pitch=1):Voice{
 const gain=context.createGain(),sources:AudioScheduledSourceNode[]=[];gain.gain.value=Math.max(0,Math.min(1,volume))*(cue==='brush'?.30:.70);gain.connect(destination);
 const profile={ceramic:[1450,560,1,1],wood:[650,235,.85,.8],silk:[1000,420,1.25,1.1],glass:[2400,900,1.4,.3],paper:[1900,310,.65,1.5],felt:[380,180,.7,.45],water:[850,680,1.1,.2],studio:[2100,740,.65,.1]}[texture];const duration=(cue==='brush'?.17:cue==='view'?.24:cue==='complete'||cue==='message'?.42:cue==='error'?.23:.11)*profile[2];
 const noise=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=noise.getChannelData(0);let seed=7919;
 for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=(seed/2147483647*2-1)*.45;}
 const source=context.createBufferSource(),filter=context.createBiquadFilter(),envelope=context.createGain();source.buffer=noise;filter.type=cue==='brush'||texture==='silk'||texture==='felt'?'lowpass':'bandpass';filter.frequency.value=profile[0]*pitch;filter.Q.value=.55;
 envelope.gain.setValueAtTime(.0001,at);envelope.gain.exponentialRampToValueAtTime((cue==='brush'?.5:.32)*profile[3],at+(cue==='brush'?.035:.007));envelope.gain.exponentialRampToValueAtTime(.0001,at+duration);source.connect(filter);filter.connect(envelope);envelope.connect(gain);source.start(at);source.stop(at+duration+.01);sources.push(source);let tail:AudioScheduledSourceNode=source,latestEnd=duration+.01;
 const tone=(delay:number,frequency:number,level:number,length:number)=>{const oscillator=context.createOscillator(),env=context.createGain();oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,at+delay);oscillator.frequency.exponentialRampToValueAtTime(frequency*.86,at+delay+length);env.gain.setValueAtTime(.0001,at+delay);env.gain.exponentialRampToValueAtTime(level,at+delay+.008);env.gain.exponentialRampToValueAtTime(.0001,at+delay+length);oscillator.connect(env);env.connect(gain);oscillator.start(at+delay);oscillator.stop(at+delay+length+.015);sources.push(oscillator);oscillator.onended=()=>{oscillator.disconnect();env.disconnect();};if(delay+length+.015>latestEnd){latestEnd=delay+length+.015;tail=oscillator;}};
 const base=profile[1]*pitch;
 if(cue==='complete'){tone(0,base,.35,.17);tone(.13,base*1.5,.26,.24);}
 else if(cue==='message'){tone(0,base*1.25,.25,.14);tone(.11,base,.20,.2);}
 else if(cue==='error'){tone(0,base*.6,.18,.19);}
 else if(cue==='tool'){tone(0,base,.23,.095);tone(.045,base*.8,.10,.10);}
 else if(cue!=='brush')tone(0,cue==='view'?base*.8:base,.22,duration);
 source.onended=()=>{source.disconnect();filter.disconnect();envelope.disconnect();};
 return {sources,gain,tail};
}
let context:AudioContext|null=null,master:GainNode|null=null,unlocked=false,lastCue=-Infinity;
const voices=new Set<Voice>();
export function unlockExperienceAudio(){unlocked=true;if(!readExperience().soundEnabled||readExperience().volume===0)return;try{context??=new AudioContext();if(!master){master=context.createGain();master.gain.value=1;master.connect(context.destination);}if(context.state==='suspended')void context.resume().catch(()=>{});}catch{/* Unsupported audio must never block CAD. */}}
export function stopExperienceAudio(){for(const voice of voices){for(const source of voice.sources){try{source.stop();}catch{}}voice.gain.disconnect();}voices.clear();}
export function suspendExperienceAudio(){stopExperienceAudio();if(context?.state==='running')void context.suspend().catch(()=>{});}
export function closeExperienceAudio(){stopExperienceAudio();if(context)void context.close().catch(()=>{});context=null;master=null;unlocked=false;lastCue=-Infinity;}
export function playExperienceCue(cue:ExperienceCue,scope:'cad'|'ui'='cad',preview=false){
 const p=readExperience();if(!p.soundEnabled||p.volume<=0||p.eventLevels[cue]<=0||(!preview&&isQuietTime(p))||!unlocked||document.hidden||!document.hasFocus()||(!preview&&p.scope==='cad'&&scope!=='cad')||(cue==='brush'&&!p.brushSound))return false;
 const now=performance.now();if(now-lastCue<(cue==='brush'?150:65))return false;
 if(!context||!master||context.state!=='running')return false;
 if(voices.size>=5){const oldest=voices.values().next().value as Voice|undefined;if(oldest){oldest.sources.forEach(s=>{try{s.stop();}catch{}});oldest.gain.disconnect();voices.delete(oldest);}}
 const voice=synthesizeCue(context,master,cue,p.texture,p.volume/100*p.eventLevels[cue]/100,context.currentTime,p.pitch*(p.variation?1+(Math.random()-.5)*.06:1));voices.add(voice);lastCue=now;const tail=voice.tail;const ended=tail.onended;tail.onended=e=>{if(ended)ended.call(tail,e);voice.gain.disconnect();voices.delete(voice);};return true;
}
