"""Seal the current explicit Git source set after verification; no dependency/build files."""
from pathlib import Path
import subprocess,json,hashlib,datetime,sys
root=Path('/workspace/dentaya-rc47').resolve()
metadata=json.loads(Path(sys.argv[1]).read_text())
package=json.loads((root/'package.json').read_text())
assert metadata['release']==package['version']
listed=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=root).decode().split('\0')
files=[]
for relative in sorted(set(filter(None,listed))):
 if relative=='PAKET_BUTUNLUK.json':continue
 path=root/relative
 assert path.is_file(),f'Missing/non-file source: {relative}'
 assert path.resolve().is_relative_to(root),f'Source escapes root: {relative}'
 parts=Path(relative).parts
 assert not any(part in {'.git','node_modules','.next','dist-desktop','out','build'} for part in parts),relative
 assert not any(part.startswith('.env') and part not in {'.env.example','.env.release.example'} for part in parts),relative
 assert path.suffix.lower() not in {'.gguf','.exe','.dll','.zip','.safetensors','.ckpt','.pt','.pth','.onnx'},relative
 data=path.read_bytes()
 files.append({'path':relative,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()})
assert len(files)>2600
metadata['files']=files
(root/'PAKET_BUTUNLUK.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files),'bytes':sum(f['size'] for f in files),'release':metadata['release']}))
