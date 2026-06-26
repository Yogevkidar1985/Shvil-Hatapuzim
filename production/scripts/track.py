#!/usr/bin/env python3
import os, json, glob
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

os.chdir("/home/user/Shvil-Hatapuzim")
frames = sorted(glob.glob("scratch/fr/*.png"))
# ROI in 720-space where the label roams
RX0,RX1,RY0,RY1 = 300,1000,110,500

centers = []  # (frame_index1based, cx, cy, found)
for i,fp in enumerate(frames):
    im = Image.open(fp).convert("RGB")
    arr = np.asarray(im).astype(np.int16)
    R,G,B = arr[:,:,0],arr[:,:,1],arr[:,:,2]
    mx = np.maximum(np.maximum(R,G),B); mn = np.minimum(np.minimum(R,G),B)
    white = (R>200)&(G>200)&(B>195)&((mx-mn)<30)
    dark  = (R<95)&(G<95)&(B<95)
    # dilate dark (text) to mark bubble interior
    darkimg = Image.fromarray((dark*255).astype(np.uint8))
    darkd = np.asarray(darkimg.filter(ImageFilter.MaxFilter(21)))>0
    bubble = white & darkd
    # restrict to ROI
    roi = np.zeros_like(bubble); roi[RY0:RY1,RX0:RX1]=True
    bubble = bubble & roi
    ys,xs = np.where(bubble)
    if len(xs) > 120:
        cx = float(xs.mean()); cy = float(ys.mean())
        centers.append([i+1, cx, cy, 1])
    else:
        centers.append([i+1, -1, -1, 0])

# temporal fill + smooth
found = [c for c in centers if c[3]==1]
# fill gaps using nearest found
for k,c in enumerate(centers):
    if c[3]==0:
        # find nearest found neighbor
        best=None;bd=1e9
        for f in found:
            d=abs(f[0]-c[0])
            if d<bd: bd=d;best=f
        if best: c[1],c[2]=best[1],best[2]
# moving average smooth (window 5) over x,y
xs=np.array([c[1] for c in centers]); ys=np.array([c[2] for c in centers])
def smooth(a,w=5):
    k=np.ones(w)/w
    return np.convolve(a,k,mode='same')
xss=smooth(xs); yss=smooth(ys)
for k,c in enumerate(centers):
    c[1]=float(xss[k]); c[2]=float(yss[k])

json.dump(centers, open("scratch/centers.json","w"))
# onset: first found frame
onset = next((c[0] for c in centers if c[3]==1), 1)
print("onset frame:", onset, "  found frames:", sum(c[3] for c in centers))
print("sample:", centers[60][:3], centers[90][:3], centers[130][:3], centers[195][:3], centers[235][:3])

# debug overlays
for fi in [70,90,130,170,210,235]:
    c=centers[fi-1]
    im=Image.open(frames[fi-1]).convert("RGB"); d=ImageDraw.Draw(im)
    x,y=c[1],c[2]
    d.line([(x-25,y),(x+25,y)],fill=(0,255,0),width=3)
    d.line([(x,y-25),(x,y+25)],fill=(0,255,0),width=3)
    d.rectangle([x-120,y-35,x+120,y+35],outline=(0,255,0),width=2)
    im.save(f"scratch/dbg_{fi}.png")
print("debug saved")
