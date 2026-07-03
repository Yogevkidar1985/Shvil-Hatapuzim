#!/usr/bin/env python3
import base64, os

SCR = '/tmp/claude-0/-home-user-Shvil-Hatapuzim/4cf78e87-46e3-5829-9868-5a4102b17f5b/scratchpad'
ASSET = '/home/user/Shvil-Hatapuzim/zerubavel15/assets'
OUT = '/home/user/Shvil-Hatapuzim/zerubavel15/index.html'

def durl(path, mime):
    with open(path, 'rb') as f:
        return f'data:{mime};base64,' + base64.b64encode(f.read()).decode()

def img(path):
    ext = path.rsplit('.', 1)[-1].lower()
    mime = 'image/png' if ext == 'png' else 'image/jpeg'
    return durl(path, mime)

UR_HEB = 'U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F'
UR_LAT = ('U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, '
          'U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD')

repl = {
    '__FONT_HEB__': durl(f'{SCR}/assistant_hebrew.woff2', 'font/woff2'),
    '__FONT_LAT__': durl(f'{SCR}/assistant_latin.woff2', 'font/woff2'),
    '__UR_HEB__': UR_HEB,
    '__UR_LAT__': UR_LAT,
    '__LOGO__':   img(f'{ASSET}/logo_transparent.png'),
    '__PH1__':    img(f'{ASSET}/render.jpg'),
    '__PH2__':    img(f'{ASSET}/int_living.jpg'),
    '__PH3__':    img(f'{ASSET}/int_terrace.jpg'),
    '__PH4__':    img(f'{ASSET}/ph_beach.jpg'),
    '__PH5__':    img(f'{ASSET}/ph_street.jpg'),
    '__PLAN_G__':  img(f'{ASSET}/pl_ground.jpg'),
    '__PLAN_T__':  img(f'{ASSET}/pl_typical.jpg'),
    '__PLAN_F5__': img(f'{ASSET}/pl_floor6.jpg'),
    '__PLAN_R__':  img(f'{ASSET}/pl_roof.jpg'),
}

with open(f'{SCR}/template.html', encoding='utf-8') as f:
    html = f.read()

for k, v in repl.items():
    html = html.replace(k, v)

# sanity: no leftover placeholders
import re
left = sorted(set(re.findall(r'__[A-Z0-9_]+__', html)))
if left:
    raise SystemExit('LEFTOVER PLACEHOLDERS: ' + ', '.join(left))

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)

print('built', OUT, round(os.path.getsize(OUT)/1024), 'KB')
