"""Build DentAYA's premium vector identity with the Python standard library.

Letterforms stay outlined and independent of installed fonts. Each catalogue
mark has its own silhouette; depth is vector geometry, never a bitmap effect.
Run render-brand-assets.mjs afterwards to refresh PNG and Windows ICO exports.
"""
from pathlib import Path
import html
import json
import argparse
import math

ROOT = Path(__file__).resolve().parents[1]
SOURCE = json.loads((ROOT / 'scripts/brand-source/letterforms.json').read_text())
CATALOG = json.loads((ROOT / 'electron/brand-catalog.json').read_text())
LOGOS = [(logo['id'], logo['file'], logo['name']['tr'], logo['style'], logo['family'], logo['material']) for logo in CATALOG['logos']]
MARKS = {logo['id']: logo['path'] for logo in CATALOG['logos']}
COLORS = {'ink': '#17343A', 'green': '#166858', 'paper': '#F7F7F2', 'mint': '#B7DBCD', 'gold': '#987540'}
MATERIALS = {
    'emerald': ('#DDFBEF', '#8ED7BC', '#2E826B', '#145044', '#092E29'),
    'jade': ('#E8FFF5', '#A5E6CF', '#4B9D85', '#286853', '#174438'),
    'titanium': ('#FAFFFF', '#C4DDE0', '#6C9DA6', '#376371', '#203F4A'),
    'champagne': ('#FFF5D9', '#EDD39F', '#C29C60', '#906D37', '#59431F'),
}


def mark(logo_id, color, stroke=None):
    edge = f' stroke="{stroke}" stroke-width="1.3" stroke-linejoin="round"' if stroke else ''
    return f'<path fill="{color}" fill-rule="evenodd"{edge} d="{MARKS[logo_id]}"/>'


def material_defs(logo_id, material, light=False, icon_mode=False):
    p = f'dy-{logo_id}-{"icon" if icon_mode else "light" if light else "dark"}'
    values = MATERIALS[material]
    stops = ''.join(f'<stop offset="{offset}" stop-color="{color}"/>' for offset, color in zip(['0', '.19', '.42', '.72', '1'], values))
    defs = f'<defs><linearGradient id="{p}-face" x1="0" y1="0" x2=".75" y2="1">{stops}</linearGradient><linearGradient id="{p}-bevel" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#FFFFFF"/><stop offset=".28" stop-color="{values[1]}"/><stop offset=".53" stop-color="{values[3]}"/><stop offset=".8" stop-color="{values[1]}"/><stop offset="1" stop-color="{values[4]}"/></linearGradient><linearGradient id="{p}-tile" x2=".8" y2="1"><stop stop-color="#294C50"/><stop offset=".48" stop-color="#193439"/><stop offset="1" stop-color="#0A1C22"/></linearGradient><radialGradient id="{p}-shadow"><stop stop-color="#061A20" stop-opacity=".36"/><stop offset="1" stop-color="#061A20" stop-opacity="0"/></radialGradient><linearGradient id="{p}-shine" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFFFFF" stop-opacity=".8"/><stop offset=".46" stop-color="#FFFFFF" stop-opacity=".05"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient><clipPath id="{p}-clip">{mark(logo_id, '#FFFFFF')}</clipPath></defs>'
    return p, defs


def dimensional_mark(logo_id, material, prefix):
    values = MATERIALS[material]
    pieces = [f'<ellipse cx="51" cy="88" rx="42" ry="10" fill="url(#{prefix}-shadow)"/>']
    # Physical contour offsets create visible sidewalls without bitmap filters.
    for x, y, color in [(3.6, 5.4, values[4]), (2.8, 4.2, values[4]), (2, 3, values[3]), (1.2, 1.8, values[3])]:
        pieces.append(f'<g transform="translate({x:g} {y:g})">{mark(logo_id, color)}</g>')
    pieces.append(mark(logo_id, f'url(#{prefix}-face)', f'url(#{prefix}-bevel)'))
    pieces.append(f'<g clip-path="url(#{prefix}-clip)"><g transform="translate(-.7 -.9)"><path d="{MARKS[logo_id]}" fill="none" fill-rule="evenodd" stroke="url(#{prefix}-shine)" stroke-width="2.2" stroke-linejoin="round"/></g></g>')
    return '<g data-material="' + material + '" data-depth="vector" data-bevel="machined">' + ''.join(pieces) + '</g>'


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
    width, height = 1600, 250 + math.ceil(len(LOGOS) / 5) * 100 + 60
    pieces = [f'<rect width="{width}" height="{height}" fill="#F3F4EF"/>', text(48, 58, f'DENTAYA  /  ATELIER {len(LOGOS)}', 24, weight=600, tracking=2), text(48, 94, f'{len(LOGOS)} özgün dental, CAD ve monogram silueti · Kabartmalı vektör yüzeyler', 17, color='#62716A')]
    pieces.append(inline(lockup('01', 'premium', 'emerald', light=True), 548, 114, 504, 110))
    for i, (logo_id, _, _, label, family, material) in enumerate(LOGOS):
        col, row = i % 5, i // 5
        x, y = 48 + col * 304, 250 + row * 100
        pieces.append(f'<rect x="{x}" y="{y}" width="288" height="88" rx="8" fill="#FFFFFF" stroke="#D9E1DA"/>')
        pieces.append(text(x+10, y+19, f'{logo_id} / {label.upper()}', 9, color='#61716B', weight=600, tracking=.3))
        pieces.append(inline(lockup(logo_id, family, material, light=True), x+10, y+28, 266, 58))
    pieces.append(text(48, height-26, f'{len(LOGOS)} farklı kontur  /  ZÜMRÜT · YEŞİM · TİTANYUM · ŞAMPANYA  /  DENTAYA', 13, color='#61716B'))
    return svg(''.join(pieces), width, height, f'DentAYA {len(LOGOS)} özgün kabartmalı vektör logo koleksiyonu')


def atelier():
    width, height = 1672, 941
    rows = math.ceil(len(LOGOS)/10)
    pitch = min(79, 790/rows)
    tile_height, icon_size = pitch-6, min(46,pitch-23)
    pieces = [f'<rect width="{width}" height="{height}" fill="#F3F4EF"/>', text(40, 47, 'DENTAYA ATELIER', 23, weight=600, tracking=3), text(40, 77, f'{len(LOGOS)} ORIGINAL DIMENSIONAL MARKS', 12, color='#62716A', tracking=2), '<path d="M40 96H1632" stroke="#CBD6D0"/>']
    for i, (logo_id, _, _, label, _, material) in enumerate(LOGOS):
        col, row = i % 10, i // 10
        x, y = 40 + col * 160, 113 + row * pitch
        pieces.append(f'<rect x="{x}" y="{y:g}" width="150" height="{tile_height:g}" rx="6" fill="#FFFFFF" stroke="#D9E1DA"/>')
        pieces.append(inline(icon(logo_id, material), x+(150-icon_size)/2, y+3, icon_size, icon_size))
        pieces.append(text(x+75, y+tile_height-7, logo_id+' / '+label[:18].upper(), 7.6, color='#47615B', weight=600).replace('<text ', '<text text-anchor="middle" ', 1))
    pieces.append(text(40, 928, 'EMERALD  /  JADE  /  TITANIUM  /  CHAMPAGNE', 10, color='#62716A', tracking=2))
    return svg(''.join(pieces), width, height, f'DENTAYA {len(LOGOS)} özgün kabartmalı logo')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--from-id', type=int, default=1, help='Export individual marks at or above this ID; refresh catalogue boards as well')
    args = parser.parse_args()
    if not 1 <= args.from_id <= len(LOGOS):
        parser.error('--from-id must refer to a catalogue ID')
    directory = ROOT / 'public/logos'
    for logo_id, filename, _, _, family, material in LOGOS:
        if int(logo_id) < args.from_id:
            continue
        for suffix, light, word_only, mono in [('', False, False, False), ('_light', True, False, False), ('_word', False, True, False), ('_word_light', True, True, False), ('_mono', True, False, True), ('_mono_white', False, False, True)]:
            save(directory / f'{filename}{suffix}.svg', lockup(logo_id, family, material, light, word_only, mono))
        save(directory / f'{filename}_icon.svg', icon(logo_id, material))
    if args.from_id == 1:
        save(ROOT / 'public/dentaya-logo.svg', lockup('01', 'premium', 'emerald'))
        save(ROOT / 'public/dentaya-logo-light.svg', lockup('01', 'premium', 'emerald', light=True))
        save(ROOT / 'public/icon.svg', icon('01', 'emerald'))
    save(ROOT / 'public/brand/DentAYA_Premium_Logo_Koleksiyonu.svg', board())
    save(ROOT / 'public/brand/DentAYA_Premium_Atelier.svg', atelier())
    save(ROOT / 'public/brand/identity.json', json.dumps({'version': CATALOG['version'], 'wordmark': 'DENTAYA', 'colors': COLORS, 'materials': MATERIALS, 'logos': [{'id': row[0], 'file': row[1], 'style': row[3], 'material': row[5]} for row in LOGOS]}, indent=2)+'\n')
    print(f'DentAYA Premium: {len(LOGOS)} unique dimensional vector marks; outlined DENTAYA wordmarks.')


if __name__ == '__main__':
    main()
