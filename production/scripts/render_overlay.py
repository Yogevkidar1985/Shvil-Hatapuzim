#!/usr/bin/env python3
import os, json
from PIL import Image
os.chdir("/home/user/Shvil-Hatapuzim")
centers = json.load(open("scratch/centers.json"))
basepill = Image.open("scratch/assets/label_tapuz.png").convert("RGBA")  # 460x210
BODYW, BCX, BCY = 380.0, 230.0, 76.0
START, FADE = 60, 4
W,H,S = 1920,1080,1.5
def clamp(v,a,b): return max(a,min(b,v))
os.makedirs("scratch/ov", exist_ok=True)

for r in centers:
    fi,cx,cy,found,w = r
    canvas = Image.new("RGBA",(W,H),(0,0,0,0))
    if fi >= START:
        cx=clamp(cx,430,880); cy=clamp(cy,200,430)
        targetbody=(w*1.12+24)*S
        scale=clamp(targetbody/BODYW, 0.30, 0.95)
        pill=basepill.resize((max(1,int(basepill.width*scale)),
                              max(1,int(basepill.height*scale))),Image.LANCZOS)
        px=int(round(cx*S-BCX*scale)); py=int(round(cy*S-BCY*scale))
        if fi<START+FADE:
            a=(fi-START+1)/FADE
            rr,gg,bb,al=pill.split(); al=al.point(lambda v:int(v*a))
            pill=Image.merge("RGBA",(rr,gg,bb,al))
        canvas.alpha_composite(pill,(px,py))
    canvas.save(f"scratch/ov/{fi:03d}.png")
print("overlay rendered (scaled).")
