// Optional design utility. The application build uses the committed assets.
// PNG-compressed ICO frames are rendered independently at their native sizes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require(process.env.DENTAYA_SHARP_MODULE || 'sharp');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const catalog=JSON.parse(await fs.readFile(path.join(root,'electron/brand-catalog.json'),'utf8'));
const logos=path.join(root,'public/logos');
const icoDirectory=path.join(root,'electron/logos');
await fs.mkdir(icoDirectory,{recursive:true});
const sizes=[16,24,32,48,64,128,256];
function ico(frames) {
  const directory=Buffer.alloc(6+16*frames.length);
  directory.writeUInt16LE(1,2);directory.writeUInt16LE(frames.length,4);
  let offset=directory.length;
  for(const [index,frame] of frames.entries()) {
    const entry=6+16*index,size=sizes[index];
    directory[entry]=size===256?0:size;directory[entry+1]=size===256?0:size;
    directory.writeUInt16LE(1,entry+4);directory.writeUInt16LE(32,entry+6);
    directory.writeUInt32LE(frame.length,entry+8);directory.writeUInt32LE(offset,entry+12);
    offset+=frame.length;
  }
  return Buffer.concat([directory,...frames]);
}
for(const {file} of catalog.logos) {
  const source=await fs.readFile(path.join(logos,`${file}_icon.svg`));
  const png=await sharp(source,{density:384}).resize(512,512).png({compressionLevel:9}).toBuffer();
  await fs.writeFile(path.join(logos,`${file}_icon.png`),png);
  const frames=[];
  for(const size of sizes)frames.push(await sharp(source,{density:384}).resize(size,size).png({compressionLevel:9}).toBuffer());
  await fs.writeFile(path.join(icoDirectory,`${file}_icon.ico`),ico(frames));
}
for(const size of [192,512])await sharp(path.join(root,'public/icon.svg'),{density:384}).resize(size,size).png({compressionLevel:9}).toFile(path.join(root,`public/icon-${size}.png`));
await fs.copyFile(path.join(icoDirectory,`${catalog.logos[0].file}_icon.ico`),path.join(root,'electron/dentaya.ico'));
const board=path.join(root,'public/brand/DentAYA_Premium_Logo_Koleksiyonu');
await sharp(board+'.svg',{density:72}).png({compressionLevel:9}).toFile(board+'.png');
await sharp(path.join(root,'public/brand/DentAYA_Premium_Atelier.svg')).webp({quality:90}).toFile(path.join(root,'public/brand/DentAYA_Premium_Atelier.webp'));
console.log(`DentAYA Premium: ${catalog.logos.length} PNG/ICO choices and collection artwork rendered from original SVG contours.`);
