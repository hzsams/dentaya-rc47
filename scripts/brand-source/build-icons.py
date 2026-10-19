"""Optional ICO packaging utility; requires Pillow. No change to logo artwork."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2]
sizes = [(size, size) for size in (16, 24, 32, 48, 64, 128, 256)]
for file in sorted((root / 'public/logos').glob('*_icon.png')):
    image = Image.open(file).convert('RGBA')
    target = root / 'electron/logos' / (file.stem + '.ico')
    image.save(target, format='ICO', sizes=sizes)
Image.open(root / 'public/icon-512.png').save(root / 'electron/dentaya.ico', format='ICO', sizes=sizes)
print('RC38: 18 compatible ICO files and the installer icon; 16–256 px sizes.')
