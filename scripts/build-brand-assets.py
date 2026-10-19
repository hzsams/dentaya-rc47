"""Build DentAYA's premium vector identity with the Python standard library.

Letterforms stay outlined and independent of installed fonts. Each of the 18
marks has its own silhouette; depth is vector geometry, never a bitmap effect.
Run render-brand-assets.mjs afterwards to refresh PNG and Windows ICO exports.
"""
from pathlib import Path
import html
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = json.loads((ROOT / 'scripts/brand-source/letterforms.json').read_text())
LOGOS = [
    ('01', '01_dental_form', 'DENTAYA', 'Atelier', 'premium', 'emerald'),
    ('02', '02_dental_arch', 'Dental Arch', 'Arch', 'premium', 'jade'),
    ('03', '03_cad_geometry', 'CAD Geometry', 'Precision', 'sans', 'titanium'),
    ('04', '04_scan', 'Scan', 'Scan', 'sans', 'titanium'),
    ('05', '05_orbit', 'Yörünge', 'Orbit', 'premium', 'emerald'),
    ('06', '06_crown', 'Crown', 'Heritage', 'serif', 'champagne'),
    ('07', '07_prism', 'Prizma', 'Prism', 'sans', 'jade'),
    ('08', '08_wave', 'Dalga', 'Wave', 'premium', 'emerald'),
    ('09', '09_link', 'Bağ', 'Monogram', 'premium', 'champagne'),
    ('10', '10_spark', 'Işık', 'Lumen', 'premium', 'champagne'),
    ('11', '11_layer', 'Katman', 'Layer', 'sans', 'titanium'),
    ('12', '12_shield', 'Kalkan', 'Seal', 'premium', 'emerald'),
    ('13', '13_apex', 'Zirve', 'Apex', 'sans', 'titanium'),
    ('14', '14_diamond', 'Kristal', 'Crystal', 'premium', 'champagne'),
    ('15', '15_focus', 'Odak', 'Focus', 'sans', 'jade'),
    ('16', '16_flow', 'Akış', 'Flow', 'premium', 'jade'),
    ('17', '17_petal', 'Lotus', 'Lotus', 'premium', 'champagne'),
    ('18', '18_bridge', 'Köprü', 'Bridge', 'premium', 'emerald'),
]
COLORS = {'ink': '#17343A', 'green': '#166858', 'paper': '#F7F7F2', 'mint': '#B7DBCD', 'gold': '#987540'}
MATERIALS = {
    'emerald': ('#DDFBEF', '#8ED7BC', '#2E826B', '#145044', '#092E29'),
    'jade': ('#E8FFF5', '#A5E6CF', '#4B9D85', '#286853', '#174438'),
    'titanium': ('#FAFFFF', '#C4DDE0', '#6C9DA6', '#376371', '#203F4A'),
    'champagne': ('#FFF5D9', '#EDD39F', '#C29C60', '#906D37', '#59431F'),
}
MARKS = {
    '01': 'M18 14H44C68 14 82 27 82 48S68 82 44 82H18ZM34 30V66H44C58 66 66 59 66 48S58 30 44 30Z',
    '02': 'M16 78V44C16 25 28 14 48 14S80 25 80 44V78H65V44C65 34 59 29 48 29S31 34 31 44V78Z',
    '03': 'M18 14H57L82 39V57L57 82H18ZM34 30V66H51L66 51V45L51 30Z',
    '04': 'M12 35V14H33V22H20V35ZM63 14H84V35H76V22H63ZM84 61V82H63V74H76V61ZM33 82H12V61H20V74H33ZM48 26L70 48L48 70L26 48ZM48 38L38 48L48 58L58 48Z',
    '05': 'M48 12C69 12 82 28 82 48S69 84 48 84S14 68 14 48S27 12 48 12ZM48 22C33 22 24 34 24 48S33 74 48 74S72 62 72 48S63 22 48 22ZM8 44H88V52H8ZM44 8H52V88H44Z',
    '06': 'M12 27L32 42L48 17L64 42L84 27L72 72H24ZM27 43L32 61H64L69 43L61 49L48 30L35 49ZM25 79H71V86H25Z',
    '07': 'M48 10L82 30V69L48 89L14 69V30ZM24 35V63L43 74V46ZM53 46V74L72 63V35ZM48 21L29 32L48 43L67 32Z',
    '08': 'M11 61C11 37 23 18 43 18C59 18 63 43 75 43C81 43 85 38 87 30V53C84 58 79 61 72 61C53 61 52 34 40 34C30 34 26 47 26 61V79H11ZM35 78V64C35 47 43 44 48 47C52 50 52 58 48 62V78Z',
    '09': 'M9 16H29C49 16 61 28 61 48S49 80 29 80H9ZM21 28V68H28C41 68 49 61 49 48S41 28 28 28ZM44 80L64 16H77L97 80H85L81 66H60L56 80ZM63 55H78L70.5 30Z',
    '10': 'M48 8L58 34L85 24L70 48L88 68L60 64L48 88L36 64L8 68L26 48L11 24L38 34ZM48 32L38 48L48 64L58 48Z',
    '11': 'M48 9L88 29L48 49L8 29ZM27 29L48 39L69 29L48 19ZM12 44L48 62L84 44V55L48 74L12 55ZM12 64L48 82L84 64V75L48 94L12 75Z',
    '12': 'M48 9L82 22V49C82 68 67 81 48 89C29 81 14 68 14 49V22ZM48 19L24 28V49C24 61 34 72 48 79C62 72 72 61 72 49V28ZM34 31H46C60 31 65 38 65 49S60 67 46 67H34ZM43 40V58H46C53 58 56 55 56 49S53 40 46 40Z',
    '13': 'M12 82L39 14H57L84 82H68L62 66H34L28 82ZM39 52H57L48 28Z',
    '14': 'M28 14H68L90 40L48 86L6 40ZM33 24L23 36H40L44 24ZM52 24L56 36H73L63 24ZM24 46L42 66L39 46ZM49 46L48 64L47 46ZM57 46L54 66L72 46Z',
    '15': 'M48 10A38 38 0 1 1 48 86A38 38 0 1 1 48 10ZM48 20A28 28 0 1 0 48 76A28 28 0 1 0 48 20ZM48 30L66 48L48 66L30 48ZM48 42L42 48L48 54L54 48Z',
    '16': 'M12 65C12 47 26 37 46 37H68L57 26L67 16L89 39L67 62L57 52L68 41H47C33 41 25 49 25 65V80H12ZM7 57L29 34L39 44L28 55H49C63 55 71 47 71 31V16H84V31C84 49 70 59 50 59H28L39 70L29 80Z',
    '17': 'M48 8C61 23 64 33 59 43C69 36 79 35 90 37C87 61 70 76 48 86C26 76 9 61 6 37C17 35 27 36 37 43C32 33 35 23 48 8ZM48 25C41 36 40 43 48 53C56 43 55 36 48 25ZM19 48C24 59 32 65 42 70C38 58 30 52 19 48ZM77 48C66 52 58 58 54 70C64 65 72 59 77 48Z',
    '18': 'M13 20H83V35H13ZM13 40H29V76H13ZM40 40H56V76H40ZM67 40H83V76H67Z',
}


def mark(logo_id, color, stroke=None):
    edge = f' stroke="{stroke}" stroke-width="0.7" stroke-linejoin="round"' if stroke else ''
    return f'<path fill="{color}" fill-rule="evenodd"{edge} d="{MARKS[logo_id]}"/>'


def material_defs(logo_id, material, light=False, icon_mode=False):
    p = f'dy-{logo_id}-{"icon" if icon_mode else "light" if light else "dark"}'
    values = MATERIALS[material]
    if light:
        values = (values[1], values[2], values[3], values[4], values[4])
    stops = ''.join(f'<stop offset="{offset}" stop-color="{color}"/>' for offset, color in zip(['0', '.22', '.5', '.77', '1'], values))
    defs = f'<defs><linearGradient id="{p}-face" x1="0" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox">{stops}</linearGradient><linearGradient id="{p}-tile" x2=".8" y2="1"><stop stop-color="#244F48"/><stop offset=".48" stop-color="#133C35"/><stop offset="1" stop-color="#071E1C"/></linearGradient></defs>'
    return p, defs


def dimensional_mark(logo_id, material, prefix):
    pieces = [f'<g transform="translate(2 4)">{mark(logo_id, MATERIALS[material][4])}</g>', f'<g transform="translate(1 2)">{mark(logo_id, MATERIALS[material][3])}</g>', mark(logo_id, f'url(#{prefix}-face)', '#D6C39C' if logo_id == '01' else MATERIALS[material][1])]
    return '<g data-material="' + material + '" data-depth="vector">' + ''.join(pieces) + '</g>'


def wordmark(family, color, x=128, y=29, height=54, max_width=372):
    data = SOURCE[family]
    glyphs, tracking, kerning = data['glyphs'], data['tracking'], data.get('kerning', {})
    advance = sum(glyphs[c]['width'] for c in 'DENTAYA') + 6 * tracking + sum(kerning.get(a+b, 0) for a, b in zip('DENTAYA', 'ENTAYA'))
    sx = min(height / data['height'], max_width / advance)
    sy = -sx if family == 'serif' else sx
    top = y + data['height'] * sx if family == 'serif' else y
    paths, cursor = [], 0
    for i, c in enumerate('DENTAYA'):
        paths.append(f'<path data-letter="{c}" fill-rule="evenodd" d="{glyphs[c]["path"]}" transform="translate({cursor:g} 0)"/>')
        cursor += glyphs[c]['width'] + tracking
        if i < 6:
            cursor += kerning.get(c+'DENTAYA'[i+1], 0)
    return f'<g fill="{color}" transform="translate({x:g} {top:g}) scale({sx:g} {sy:g})">' + ''.join(paths) + '</g>'


def svg(body, width=512, height=112, label='DENTAYA'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(label)}"><title>{html.escape(label)}</title>{body}</svg>\n'


def lockup(logo_id, family, material, light=False, word_only=False, mono=False):
    text_color = COLORS['ink'] if light else COLORS['paper']
    if mono:
        text_color = '#111111' if light else '#FFFFFF'
    if word_only:
        return svg(wordmark(family, text_color, x=10, y=12, height=68, max_width=492), height=96)
    if mono:
        body = f'<g transform="translate(8 8)">{mark(logo_id, text_color)}</g>'
    else:
        prefix, defs = material_defs(logo_id, material, light)
        body = defs + f'<g transform="translate(8 6)">{dimensional_mark(logo_id, material, prefix)}</g>'
    return svg(body + wordmark(family, text_color))


def icon(logo_id, material):
    prefix, defs = material_defs(logo_id, material, icon_mode=True)
    tile = f'<rect x="1" y="1" width="110" height="110" rx="25" fill="url(#{prefix}-tile)" stroke="#5B8071" stroke-width="1"/><rect x="4" y="4" width="104" height="104" rx="22" fill="none" stroke="#DFE8C7" stroke-opacity=".17"/><path d="M27 4H85" stroke="#F8F1D3" stroke-opacity=".35" stroke-linecap="round"/>'
    return svg(defs + tile + f'<g transform="translate(8 6)">{dimensional_mark(logo_id, material, prefix)}</g>', width=112, height=112)


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(value, encoding='utf-8')


def inline(svg_text, x, y, width, height):
    return svg_text.replace('<svg ', f'<svg x="{x}" y="{y}" width="{width}" height="{height}" ', 1)


def text(x, y, value, size=16, color='#17343A', weight=400, tracking=0):
    return f'<text x="{x}" y="{y}" fill="{color}" font-family="DejaVu Sans,Arial,sans-serif" font-size="{size}" font-weight="{weight}" letter-spacing="{tracking}">{html.escape(value)}</text>'


def board():
    pieces = ['<rect width="1600" height="2340" fill="#F3F4EF"/>', text(64, 70, 'DENTAYA  /  PREMIUM IDENTITY', 17, weight=600, tracking=2), text(1336, 70, 'COLLECTION 02', 17, weight=600), '<path d="M64 96H1536" stroke="#CBD6D0"/>']
    pieces.append(inline(lockup('01', 'premium', 'emerald', light=True), 280, 140, 1040, 228))
    pieces += [text(64, 422, '18 özgün amblem. İşlenmiş yüzeyler. DENTAYA imzası.', 24), text(64, 460, 'Dört malzeme ailesi · Vektör derinlik · Açık, koyu ve tek renk sürümler', 17, color='#62716A')]
    for i, (logo_id, _, _, label, family, material) in enumerate(LOGOS):
        col, row = i % 3, i // 3
        x, y = 64 + col * 500, 510 + row * 224
        pieces.append(f'<rect x="{x}" y="{y}" width="472" height="196" rx="12" fill="#FFFFFF" stroke="#D9E1DA"/>')
        pieces.append(text(x+20, y+29, f'{logo_id} / {label.upper()}', 12, color='#61716B', weight=600, tracking=1))
        pieces.append(inline(lockup(logo_id, family, material, light=True), x+20, y+57, 432, 95))
        pieces.append(text(x+20, y+177, material.upper(), 10, color='#61716B', tracking=1))
    pieces.append('<rect x="64" y="1882" width="1472" height="260" rx="12" fill="#102725"/>')
    pieces.append(text(92, 1925, 'KOYU TEMA  /  MASAÜSTÜ SİMGELERİ', 12, color='#B7DBCD', weight=600, tracking=2))
    pieces.append(inline(lockup('01', 'premium', 'emerald'), 112, 1960, 820, 179))
    for i, value in enumerate([112, 64, 32]):
        pieces.append(inline(icon('01', 'emerald'), 1030+i*164, 1978+(112-value)/2, value, value))
        pieces.append(text(1030+i*164, 2120, f'{value} px', 11, color='#B7DBCD'))
    pieces += [text(64, 2215, 'EMERALD  /  JADE  /  TITANIUM  /  CHAMPAGNE', 14, weight=600, tracking=2), '<path d="M64 2250H1536" stroke="#CBD6D0"/>', text(64, 2295, '18 vektör tasarım  /  7 dışa aktarım biçimi  /  Yazı tipinden bağımsız harf konturları', 14, color='#61716B')]
    return svg(''.join(pieces), 1600, 2340, 'DentAYA premium logo koleksiyonu')


def main():
    directory = ROOT / 'public/logos'
    for logo_id, filename, _, _, family, material in LOGOS:
        for suffix, light, word_only, mono in [('', False, False, False), ('_light', True, False, False), ('_word', False, True, False), ('_word_light', True, True, False), ('_mono', True, False, True), ('_mono_white', False, False, True)]:
            save(directory / f'{filename}{suffix}.svg', lockup(logo_id, family, material, light, word_only, mono))
        save(directory / f'{filename}_icon.svg', icon(logo_id, material))
    save(ROOT / 'public/dentaya-logo.svg', lockup('01', 'premium', 'emerald'))
    save(ROOT / 'public/dentaya-logo-light.svg', lockup('01', 'premium', 'emerald', light=True))
    save(ROOT / 'public/icon.svg', icon('01', 'emerald'))
    save(ROOT / 'public/brand/DentAYA_Premium_Logo_Koleksiyonu.svg', board())
    save(ROOT / 'public/brand/identity.json', json.dumps({'version': 'premium-2', 'wordmark': 'DENTAYA', 'colors': COLORS, 'materials': MATERIALS, 'logos': [{'id': row[0], 'file': row[1], 'style': row[3], 'material': row[5]} for row in LOGOS]}, indent=2)+'\n')
    print('DentAYA Premium: 18 unique dimensional vector marks; outlined DENTAYA wordmarks.')


if __name__ == '__main__':
    main()
