#!/usr/bin/env python3
# Generates: trimmed logo (footage + endcard), 5 RTL Hebrew caption overlays, CTA endcard.
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = "/home/user/Shvil-Hatapuzim"
OUT = os.path.join(ROOT, "scratch", "assets")
os.makedirs(OUT, exist_ok=True)

W, H = 1080, 1920
# FreeSans covers Hebrew + Latin digits/punctuation (Noto Sans Hebrew lacks them -> tofu)
FB = "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
FR = "/usr/share/fonts/truetype/freefont/FreeSans.ttf"
ORANGE = (255, 118, 7)

# ---------- logo prep ----------
logo_src = Image.open(os.path.join(ROOT, "E3729B9D-D82B-4A75-B97A-54F43295853A.png")).convert("RGBA")
# clean premultiplied fringe: where alpha low, zero it
px = logo_src.getdata()
clean = [(r, g, b, a if a > 12 else 0) for (r, g, b, a) in px]
logo_src.putdata(clean)
bbox = logo_src.getbbox()
logo = logo_src.crop(bbox)
logo.save(os.path.join(OUT, "logo_trim.png"))

def logo_with_shadow(target_w, shadow_alpha=150, blur=10, pad=28):
    lw, lh = logo.size
    scale = target_w / lw
    lg = logo.resize((target_w, max(1, int(lh * scale))), Image.LANCZOS)
    gw, gh = lg.size
    canvas = Image.new("RGBA", (gw + pad * 2, gh + pad * 2), (0, 0, 0, 0))
    # build shadow from alpha
    alpha = lg.split()[3]
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sh_alpha = Image.new("L", canvas.size, 0)
    sh_alpha.paste(alpha, (pad, pad))
    sh_alpha = sh_alpha.filter(ImageFilter.GaussianBlur(blur))
    sh_alpha = sh_alpha.point(lambda v: int(v * shadow_alpha / 255))
    black = Image.new("RGBA", canvas.size, (0, 0, 0, 255))
    canvas = Image.composite(black, canvas, sh_alpha)
    canvas.alpha_composite(lg, (pad, pad))
    return canvas

# footage logo (bottom-left), ~330px wide brand mark with soft shadow for any background
logo_with_shadow(330).save(os.path.join(OUT, "logo_footage.png"))
# endcard logo, larger
logo_with_shadow(560, shadow_alpha=90, blur=18).save(os.path.join(OUT, "logo_endcard.png"))

# ---------- caption rendering ----------
def wrap_rtl(draw, text, font, max_w):
    words = text.split()
    lines, cur = [], ""
    for w_ in words:
        trial = (cur + " " + w_).strip()
        if draw.textlength(trial, font=font, direction="rtl", language="he") <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines

def render_caption(name, lines_spec, bottom_y=1560):
    """lines_spec: list of (text, font, fill, size). Renders centered RTL block with
    a soft bottom gradient scrim. bottom_y = baseline-ish bottom of block."""
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # bottom gradient scrim for readability
    grad = Image.new("L", (1, H), 0)
    gtop, gbot = 1120, H
    for y in range(H):
        if y < gtop:
            v = 0
        else:
            v = int(175 * (y - gtop) / (gbot - gtop))
        grad.putpixel((0, y), min(175, v))
    grad = grad.resize((W, H))
    scrim = Image.new("RGBA", (W, H), (8, 6, 4, 0))
    scrim.putalpha(grad)
    img.alpha_composite(scrim)

    d = ImageDraw.Draw(img)
    max_w = W - 200
    # build all rendered lines top-down
    rendered = []  # (text, font, fill, line_h)
    for (text, font, fill, size) in lines_spec:
        for ln in wrap_rtl(d, text, font, max_w):
            asc, desc = font.getmetrics()
            rendered.append((ln, font, fill, asc + desc))
    gap = 18
    total_h = sum(lh for _, _, _, lh in rendered) + gap * (len(rendered) - 1)
    y = bottom_y - total_h
    for (ln, font, fill, lh) in rendered:
        # shadow
        d.text((W // 2 + 2, y + 3), ln, font=font, fill=(0, 0, 0, 170),
               anchor="ma", direction="rtl", language="he")
        d.text((W // 2, y), ln, font=font, fill=fill,
               anchor="ma", direction="rtl", language="he")
        y += lh + gap
    img.save(os.path.join(OUT, name))

f_body = ImageFont.truetype(FB, 54)
f_big = ImageFont.truetype(FB, 70)
f_sub = ImageFont.truetype(FR, 42)

render_caption("cap_A.png", [
    ("במזרח הוד השרון, באזור שנהנה מתנופת פיתוח וצמיחה מתמשכת, נמצאת הזדמנות השקעה שכדאי להכיר.", f_body, (255, 255, 255, 255), 54),
])
render_caption("cap_B.png", [
    ("מתחם שביל התפוזים ממוקם בסמיכות לשכונות מגורים מבוקשות, ליציאות מרכזיות מהעיר ולכבישים המחברים במהירות לכל אזור השרון והמרכז.", f_body, (255, 255, 255, 255), 54),
])
render_caption("cap_C.png", [
    ("הקרקע כלולה בתוכנית הר/2050, ומהווה חלק מהחזון העתידי של התפתחות העיר בשנים הקרובות.", f_body, (255, 255, 255, 255), 54),
])
render_caption("cap_D.png", [
    ("עבור משקיעים שמבינים את הערך של מיקום ותכנון ארוך טווח, זו הזדמנות להיכנס בשלב מוקדם ובעלות נגישה יחסית.", f_body, (255, 255, 255, 255), 54),
])
render_caption("cap_E.png", [
    ("שביל התפוזים · הוד השרון", f_big, (255, 255, 255, 255), 70),
    ("המיקום של היום · הפוטנציאל של המחר", f_sub, (255, 210, 170, 255), 42),
], bottom_y=1580)

# ---------- endcard ----------
def make_endcard():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    # vertical warm-dark gradient
    top = (38, 24, 12)
    bot = (12, 9, 7)
    base = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    for y in range(H):
        t = y / H
        r = int(top[0] * (1 - t) + bot[0] * t)
        g = int(top[1] * (1 - t) + bot[1] * t)
        b = int(top[2] * (1 - t) + bot[2] * t)
        for_row = Image.new("RGBA", (W, 1), (r, g, b, 255))
        base.paste(for_row, (0, y))
    img = base
    # soft orange radial glow behind logo
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = W // 2, 760
    gd.ellipse([cx - 420, cy - 300, cx + 420, cy + 300], fill=(255, 118, 7, 60))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img.alpha_composite(glow)

    # logo centered
    lg = Image.open(os.path.join(OUT, "logo_endcard.png")).convert("RGBA")
    img.alpha_composite(lg, ((W - lg.width) // 2, 560 - lg.height // 2))

    d = ImageDraw.Draw(img)
    f_head = ImageFont.truetype(FB, 78)
    f_s = ImageFont.truetype(FR, 44)
    d.text((W // 2, 1040), "השאירו פרטים עכשיו", font=f_head, fill=(255, 255, 255, 255),
           anchor="ma", direction="rtl", language="he")
    d.text((W // 2, 1170), "לקבלת מידע על מתחם שביל התפוזים", font=f_s, fill=(226, 210, 196, 255),
           anchor="ma", direction="rtl", language="he")

    # button
    bw, bh = 470, 124
    bx, by = (W - bw) // 2, 1320
    btn = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(btn)
    bd.rounded_rectangle([bx, by, bx + bw, by + bh], radius=62, fill=(255, 118, 7, 255))
    img.alpha_composite(btn)
    f_btn = ImageFont.truetype(FB, 52)
    d = ImageDraw.Draw(img)
    d.text((W // 2, by + bh // 2), "קבלו מידע", font=f_btn, fill=(20, 14, 8, 255),
           anchor="mm", direction="rtl", language="he")

    img.convert("RGB").save(os.path.join(OUT, "endcard.png"))

make_endcard()
print("assets done:", sorted(os.listdir(OUT)))
