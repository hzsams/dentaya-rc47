"""Rebuild RC38's outlined, flat-color SVG identity. Python standard library only.

DENTAYA Atelier uses independently drawn contrast-serif letters on a 100-unit grid.
Heritage uses stored DejaVu Serif outlines; no fonts or external URLs are needed.
PNG and ICO files are generated separately by render-brand-assets.mjs.
"""
from pathlib import Path
import html
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = json.loads((ROOT / 'scripts/brand-source/letterforms.json').read_text())

LOGOS = [
    ('01', '01_dental_form', 'DENTAYA', 'Atelier', 'premium'),
    ('02', '02_dental_arch', 'Dental Arch', 'Arch', 'premium'),
    ('03', '03_cad_geometry', 'CAD Geometry', 'Precision', 'sans'),
    ('06', '06_crown', 'Crown', 'Heritage', 'serif'),
    ('09', '09_link', 'Bağ', 'Monogram', 'premium'),
    ('12', '12_shield', 'Kalkan', 'Seal', 'premium'),
    ('13', '13_apex', 'Zirve', 'Apex', 'sans'),
    ('18', '18_bridge', 'Köprü', 'Bridge', 'premium'),
]
LEGACY = {
    '04_scan': '03_cad_geometry', '05_orbit': '09_link',
    '07_prism': '03_cad_geometry', '08_wave': '02_dental_arch',
    '10_spark': '01_dental_form', '11_layer': '18_bridge',
    '14_diamond': '03_cad_geometry', '15_focus': '12_shield',
    '16_flow': '09_link', '17_petal': '02_dental_arch',
}
COLORS = {'ink': '#17343A', 'green': '#166858', 'paper': '#F7F7F2', 'mint': '#B7DBCD', 'gold': '#987540'}

MARKS = {
    '01': '<path fill="{c}" fill-rule="evenodd" d="M18 14H44C68 14 82 27 82 48S68 82 44 82H18ZM34 30V66H44C58 66 66 59 66 48S58 30 44 30Z"/>',
    '02': '<path fill="{c}" d="M16 78V44C16 25 28 14 48 14S80 25 80 44V78H65V44C65 34 59 29 48 29S31 34 31 44V78Z"/>',
    '03': '<path fill="{c}" fill-rule="evenodd" d="M18 14H57L82 39V57L57 82H18ZM34 30V66H51L66 51V45L51 30Z"/>',
    '06': '<path fill="none" stroke="{c}" stroke-width="5" stroke-linejoin="round" d="M17 31L29 69H67L79 31L62 42L48 23L34 42Z"/><path fill="{c}" d="M29 77H67V82H29Z"/>',
    '09': '<path fill="{c}" fill-rule="evenodd" d="M9 16H29C49 16 61 28 61 48S49 80 29 80H9ZM21 28V68H28C41 68 49 61 49 48S41 28 28 28Z"/><path fill="{c}" fill-rule="evenodd" d="M44 80L64 16H77L97 80H85L81 66H60L56 80ZM63 55H78L70.5 30Z"/>',
    '12': '<circle cx="48" cy="48" r="36" fill="none" stroke="{c}" stroke-width="5"/><path fill="{c}" fill-rule="evenodd" d="M33 27H45C60 27 68 35 68 48S60 69 45 69H33ZM42 36V60H45C54 60 59 56 59 48S54 36 45 36Z"/>',
    '13': '<path fill="{c}" fill-rule="evenodd" d="M12 82L39 14H57L84 82H68L62 66H34L28 82ZM39 52H57L48 28Z"/>',
    '18': '<path fill="{c}" d="M13 20H83V35H13ZM13 40H29V76H13ZM40 40H56V76H40ZM67 40H83V76H67Z"/>',
}

def mark(logo_id, color):
    return MARKS[logo_id].format(c=color)

def wordmark(family, color, x=128, y=29, height=54, max_width=372):
    data = SOURCE[family]
    glyphs = data['glyphs']
    tracking = data['tracking']
    kerning = data.get('kerning', {})
    advance = sum(glyphs[c]['width'] for c in 'DENTAYA') + 6 * tracking + sum(kerning.get(a+b, 0) for a,b in zip('DENTAYA','ENTAYA'))
    sx = min(height / data['height'], max_width / advance)
    # Store glyphs as outlines: operating-system fonts never change the logo.
    sy = -sx if family == 'serif' else sx
    top = y + data['height'] * sx if family == 'serif' else y
    paths = []
    cursor = 0
    for i, c in enumerate('DENTAYA'):
        paths.append(f'<path data-letter="{c}" fill-rule="evenodd" d="{glyphs[c]["path"]}" transform="translate({cursor:g} 0)"/>')
        cursor += glyphs[c]['width'] + tracking
        if i < 6: cursor += kerning.get(c+'DENTAYA'[i+1], 0)
    return f'<g fill="{color}" transform="translate({x:g} {top:g}) scale({sx:g} {sy:g})">' + ''.join(paths) + '</g>'

def svg(body, width=512, height=112, label='DENTAYA'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(label)}"><title>{html.escape(label)}</title>{body}</svg>\n'

def lockup(logo_id, family, light=False, word_only=False, mono=False):
    text_color = COLORS['ink'] if light else COLORS['paper']
    mark_color = COLORS['green'] if light else COLORS['mint']
    if logo_id == '06':
        mark_color = COLORS['gold'] if light else '#D8C39B'
    if mono:
        text_color = mark_color = '#111111' if light else '#FFFFFF'
    if word_only:
        return svg(wordmark(family, text_color, x=10, y=12, height=68, max_width=492), height=96)
    # All full logos use the same cap height, safe area and icon-to-type spacing.
    return svg(f'<g transform="translate(8 8)">{mark(logo_id, mark_color)}</g>' + wordmark(family, text_color))

def icon(logo_id):
    bg = COLORS['green'] if logo_id != '06' else '#254737'
    return svg(f'<rect width="112" height="112" rx="24" fill="{bg}"/><g transform="translate(8 8)">{mark(logo_id, "#FFFFFF")}</g>', width=112, height=112)

def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding='utf-8')

def inline(svg_text, x, y, width, height):
    # Nest the actual exported asset; previews and the application share outlines.
    return svg_text.replace('<svg ', f'<svg x="{x}" y="{y}" width="{width}" height="{height}" ', 1)

def text(x, y, value, size=16, color='#17343A', weight=400, tracking=0):
    return f'<text x="{x}" y="{y}" fill="{color}" font-family="DejaVu Sans,Arial,sans-serif" font-size="{size}" font-weight="{weight}" letter-spacing="{tracking}">{html.escape(value)}</text>'

def board():
    pieces = ['<rect width="1600" height="1480" fill="#F3F4EF"/>']
    pieces += [text(64, 70, 'DENTAYA  /  BRAND IDENTITY', 17, weight=600, tracking=2), text(1536, 70, 'RC38', 17, weight=600)]
    pieces.append('<path d="M64 96H1536" stroke="#CBD6D0"/>')
    pieces += [text(64, 150, '01  /  ANA LOGO', 13, weight=600, tracking=2)]
    pieces.append(inline(lockup('01', 'premium', light=True), 280, 180, 1040, 228))
    pieces += [text(64, 462, 'Premium serif tipografi. Özel harf oranları ve optik aralıklar.', 20), text(64, 500, 'Aynı tasarım; uygulama, web, masaüstü simgesi ve baskı.', 17, color='#62716A')]
    for i, (logo_id, filename, _, label, family) in enumerate(LOGOS):
        col, row = i % 4, i // 4
        x, y = 64 + col * 376, 544 + row * 192
        pieces.append(f'<rect x="{x}" y="{y}" width="344" height="164" rx="6" fill="#FFFFFF" stroke="#D9E1DA"/>')
        pieces.append(text(x+20, y+30, f'{i+1:02} / {label.upper()}', 12, color='#61716B', weight=600, tracking=1))
        pieces.append(inline(lockup(logo_id, family, light=True), x+20, y+53, 304, 68))
    pieces.append('<rect x="64" y="950" width="1472" height="258" rx="6" fill="#102725"/>')
    pieces += [text(92, 991, 'KOYU TEMA', 12, color='#B7DBCD', weight=600, tracking=2)]
    pieces.append(inline(lockup('01', 'premium'), 200, 1030, 725, 159))
    for i in range(3):
        value = [112, 56, 32][i]
        pieces.append(inline(icon('01'), 1040 + i * 164, 1050 + (112-value)/2, value, value))
        pieces.append(text(1040 + i*164, 1200-24, f'{value} px', 11, color='#B7DBCD'))
    pieces += [text(64, 1264, 'RENK SİSTEMİ', 12, weight=600, tracking=2)]
    for i, (label, color) in enumerate([('INK', COLORS['ink']), ('GREEN', COLORS['green']), ('PAPER', COLORS['paper']), ('MINT', COLORS['mint'])]):
        x = 64 + i * 376
        pieces.append(f'<rect x="{x}" y="1288" width="60" height="60" rx="5" fill="{color}" stroke="#CDD8D0"/>')
        pieces += [text(x+78, 1310, label, 13, weight=600), text(x+78, 1339, color.upper(), 16)]
    pieces.append('<path d="M64 1390H1536" stroke="#CBD6D0"/>')
    pieces += [text(64, 1432, '8 vektör tasarım  /  Açık, koyu ve tek renk sürümler  /  Font bağımlılığı yok', 14, color='#61716B')]
    return svg(''.join(pieces), 1600, 1480, 'DentAYA RC38 logo ailesi')

def main():
    directory = ROOT / 'public/logos'
    for logo_id, filename, _, _, family in LOGOS:
        for suffix, light, word_only, mono in [('', False, False, False), ('_light', True, False, False), ('_word', False, True, False), ('_word_light', True, True, False), ('_mono', True, False, True), ('_mono_white', False, False, True)]:
            save(directory / f'{filename}{suffix}.svg', lockup(logo_id, family, light, word_only, mono))
        save(directory / f'{filename}_icon.svg', icon(logo_id))
    for old, canonical in LEGACY.items():
        for suffix in ['', '_light', '_word', '_word_light', '_mono', '_mono_white', '_icon']:
            save(directory / f'{old}{suffix}.svg', (directory / f'{canonical}{suffix}.svg').read_text())
    save(ROOT / 'public/dentaya-logo.svg', lockup('01', 'premium'))
    save(ROOT / 'public/dentaya-logo-light.svg', lockup('01', 'premium', light=True))
    save(ROOT / 'public/icon.svg', icon('01'))
    save(ROOT / 'public/brand/DentAYA_RC38_Logo_Ailesi.svg', board())
    save(ROOT / 'public/brand/identity.json', json.dumps({'release': 38, 'wordmark': 'DENTAYA', 'colors': COLORS, 'logos': [{'id': row[0], 'file': row[1], 'style': row[3]} for row in LOGOS], 'legacyFiles': LEGACY}, indent=2)+'\n')
    print('RC38: 8 logo families; 18 compatible asset paths; outlined DENTAYA wordmarks.')

if __name__ == '__main__':
    main()
