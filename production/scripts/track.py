#!/usr/bin/env python3
import os, json, glob
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage

os.chdir("/home/user/Shvil-Hatapuzim")
frames = sorted(glob.glob("scratch/fr/*.png"))
RX0,RX1,RY0,RY1 = 300,1000,110,500

rows = []  # [frame, cx, cy, found, width]
for i,fp in enumerate(frames):
    im = Image.open(fp).convert("RGB")
    arr = np.asarray(im).astype(np.int16)
    R,G,B = arr[:,:,0],arr[:,:,1],arr[:,:,2]
    mx = np.maximum(np.maximum(R,G),B); mn = np.minimum(np.minimum(R,G),B)
    white = (R>200)&(G>200)&(B>195)&((mx-mn)<30)
    dark  = (R<95)&(G<95)&(B<95)
    darkd = np.asarray(Image.fromarray((dark*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(21)))>0
    bubble = white & darkd
    roi = np.zeros_like(bubble); roi[RY0:RY1,RX0:RX1]=True
    bubble = bubble & roi
    # largest connected component = the label pill (ignores scattered city pixels)
    lab,n = ndimage.label(bubble)
    if n>=1:
        sizes = ndimage.sum(np.ones_like(lab),lab,range(1,n+1))
        big = int(np.argmax(sizes))+1
        if sizes[big-1] > 120:
            ys,xs = np.where(lab==big)
            rows.append([i+1, float(xs.mean()), float(ys.mean()), 1, float(xs.max()-xs.min())])
            continue
    rows.append([i+1, -1.0,-1.0,0,-1.0])

found=[r for r in rows if r[3]==1]
for r in rows:
    if r[3]==0:
        best=min(found,key=lambda f:abs(f[0]-r[0])); r[1],r[2],r[4]=best[1],best[2],best[4]

def smooth(a,w=5):
    a=np.asarray(a,float); pad=w//2
    return np.convolve(np.pad(a,pad,mode='edge'),np.ones(w)/w,mode='valid')

xs=smooth([r[1] for r in rows]); ys=smooth([r[2] for r in rows]); ws=smooth([r[4] for r in rows],7)
for k,r in enumerate(rows): r[1],r[2],r[4]=float(xs[k]),float(ys[k]),float(ws[k])

json.dump(rows,open("scratch/centers.json","w"))
print("onset:",next((r[0] for r in rows if r[3]==1),1),"found:",sum(r[3] for r in rows))
for fi in [70,130,200,225,235,240]:
    r=rows[fi-1]; print(fi,round(r[1]),round(r[2]),"w=",round(r[4]))

for fi in [90,200,235]:
    r=rows[fi-1]; im=Image.open(frames[fi-1]).convert("RGB"); d=ImageDraw.Draw(im)
    x,y,w=r[1],r[2],r[4]
    d.line([(x-30,y),(x+30,y)],fill=(0,255,0),width=3); d.line([(x,y-30),(x,y+30)],fill=(0,255,0),width=3)
    d.rectangle([x-w/2-10,y-40,x+w/2+10,y+40],outline=(0,255,0),width=2)
    im.save(f"scratch/dbg2_{fi}.png")
