#!/usr/bin/env python3
import os, json
from PIL import Image
os.chdir("/home/user/Shvil-Hatapuzim")
centers = json.load(open("scratch/centers.json"))
pill = Image.open("scratch/assets/label_tapuz.png").convert("RGBA")
BCX, BCY = 230, 76   # body-center alignment point inside pill canvas

os.makedirs("scratch/ov", exist_ok=True)
START = 60            # real label onset
FADE = 4             # quick fade so opaque pill hides old text immediately
W,H = 1920,1080
S = 1.5              # 720 -> 1080 scale

def clamp(v,a,b): return max(a,min(b,v))

for c in centers:
    fi,cx,cy,found = c
    canvas = Image.new("RGBA",(W,H),(0,0,0,0))
    if fi >= START:
        # clamp tracked center to a sane region (720-space) to reject outliers
        cx = clamp(cx, 430, 880); cy = clamp(cy, 200, 430)
        px = int(round(cx*S - BCX)); py = int(round(cy*S - BCY))
        layer = pill
        if fi < START+FADE:
            a = (fi-START+1)/FADE
            r,g,b,al = pill.split()
            al = al.point(lambda v: int(v*a))
            layer = Image.merge("RGBA",(r,g,b,al))
        canvas.alpha_composite(layer,(px,py))
    canvas.save(f"scratch/ov/{fi:03d}.png")
print("overlay frames rendered:", len(centers))
