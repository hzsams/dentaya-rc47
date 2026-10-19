// Optional design utility. The application build uses the committed assets.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require(process.env.DENTAYA_SHARP_MODULE || 'sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const logos=path.join(root,'public/logos');
for(const name of await fs.readdir(logos)) {
  if(!name.endsWith('_icon.svg'))continue;
  await sharp(path.join(logos,name),{density:384}).resize(512,512).png().toFile(path.join(logos,name.replace(/\.svg$/,'.png')));
}
for(const size of [192,512])await sharp(path.join(root,'public/icon.svg'),{density:384}).resize(size,size).png().toFile(path.join(root,`public/icon-${size}.png`));
const board=path.join(root,'public/brand/DentAYA_RC38_Logo_Ailesi');
await sharp(board+'.svg',{density:72}).png().toFile(board+'.png');
console.log('RC38: all PNG icons and the logo presentation rendered from the SVG outlines.');
