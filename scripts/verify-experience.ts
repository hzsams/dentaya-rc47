import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_CAD_WORKSPACE,normalizeCadWorkspace} from '../src/lib/cad-workspace-preferences';
import {createCameraMotion,sampleCameraMotion} from '../src/lib/cad-camera-motion';
import {normalizeExperience,DEFAULT_EXPERIENCE,isQuietTime,SOUND_EVENTS,SOUND_TEXTURES} from '../src/lib/experience-preferences';
const start=new THREE.Vector3(0,0,20),end=new THREE.Vector3(0,0,-20),center=new THREE.Vector3();
const motion=createCameraMotion(start,center,end,center,420,100);
for(let t=100;t<=520;t+=7){const p=sampleCameraMotion(motion,t);assert.ok(Math.abs(p.position.distanceTo(p.target)-20)<1e-8,'Opposite view must orbit, not cross the model');assert.ok(p.position.toArray().every(Number.isFinite));}
assert.ok(sampleCameraMotion(motion,520).position.distanceTo(end)<1e-8);assert.equal(sampleCameraMotion(motion,520).done,true);
const instant=sampleCameraMotion(createCameraMotion(start,center,end,center,0,10),10);assert.ok(instant.position.distanceTo(end)<1e-8);
assert.deepEqual(normalizeExperience({pace:'invalid',volume:NaN,texture:'bad'}),DEFAULT_EXPERIENCE);
assert.equal(normalizeExperience({volume:150}).volume,100);assert.equal(normalizeExperience({volume:-100}).volume,0);
assert.equal(SOUND_TEXTURES.length,8);assert.equal(SOUND_EVENTS.length,7);
const bounded=normalizeExperience({pitch:10,eventLevels:{tap:-1,brush:200} as typeof DEFAULT_EXPERIENCE.eventLevels,quietStart:'25:90',quietEnd:'invalid'});
assert.equal(bounded.pitch,1.25);assert.equal(bounded.eventLevels.tap,0);assert.equal(bounded.eventLevels.brush,100);assert.equal(bounded.quietStart,'22:00');assert.equal(bounded.quietEnd,'08:00');
const at=(hours:number,minutes=0)=>new Date(2026,9,4,hours,minutes);
const quiet=normalizeExperience({quietHours:true,quietStart:'22:00',quietEnd:'08:00'});
assert.equal(isQuietTime(quiet,at(22)),true);assert.equal(isQuietTime(quiet,at(7,59)),true);assert.equal(isQuietTime(quiet,at(8)),false);assert.equal(isQuietTime(quiet,at(21,59)),false);
assert.equal(isQuietTime({...quiet,quietEnd:'22:00'},at(12)),true);assert.equal(isQuietTime({...quiet,quietHours:false},at(23)),false);
const daytime={...quiet,quietStart:'09:00',quietEnd:'17:00'};assert.equal(isQuietTime(daytime,at(9)),true);assert.equal(isQuietTime(daytime,at(17)),false);
console.log('PASS: camera presets orbit outside model, exact endpoints, instant mode; 8 textures / 7 events, bounded levels/pitch, valid clock fallback, overnight/daytime/all-day quiet-hour boundaries.');

assert.equal(DEFAULT_CAD_WORKSPACE.background,'studio');assert.equal(DEFAULT_CAD_WORKSPACE.grid,false);assert.equal(DEFAULT_CAD_WORKSPACE.axes,false);
for(const background of ['graphite','slate','paper','theme','studio'] as const)assert.equal(normalizeCadWorkspace({background}).background,background,'Existing explicit scene choices survive the new default');
assert.equal(normalizeCadWorkspace({background:'unknown'}).background,'studio');
console.log('PASS: plain Studio canvas by default; existing explicit CAD backgrounds remain unchanged.');
