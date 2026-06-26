#!/usr/bin/env python3
import os, json, glob
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from scipy import ndimage

os.chdir("/home/user/Shvil-Hatapuzim")
centers = json.load(open("scratch/centers.json"))
frames = sorted(glob.glob("scratch/fr/*.png"))
os.makedirs("scratch/clean", exist_ok=True)
START = 60

def detect_ring(arr, lx, ly):
    """find the target ring (white blob with a dark hole) below the label."""
    sx0,sx1=max(0,lx-80),min(1280,lx+80)
    sy0,sy1=max(0,ly-8),min(720,ly+150)
    sub=arr[sy0:sy1,sx0:sx1].astype(int)
    R,G,B=sub[:,:,0],sub[:,:,1],sub[:,:,2]
    mx=np.maximum(np.maximum(R,G),B);mn=np.minimum(np.minimum(R,G),B)
    wm=(R>178)&(G>178)&(B>172)&((mx-mn)<45)
    lab,n=ndimage.label(wm)
    best=None;bscore=1e18
    for j in range(1,n+1):
        ys,xs=np.where(lab==j)
        bw=xs.max()-xs.min()+1; bh=ys.max()-ys.min()+1
        area=len(xs)
        if bw<8 or bh<8 or bw>52 or bh>52: continue
        if not (0.45<bw/bh<2.2): continue
        # ring test: bbox center should be non-white (hole)
        ccx=int(xs.mean()); ccy=int(ys.mean())
        c=wm[max(0,ccy-3):ccy+4, max(0,ccx-3):ccx+4]
        holeness = 1.0 - (c.mean() if c.size else 1.0)   # high if center empty
        if holeness < 0.30: continue   # solid blob (tail) -> skip
        gx=sx0+ccx; gy=sy0+ccy
        score=abs(gx-lx)*1.0 - holeness*8   # near label-x, prefer strong ring
        if score<bscore: bscore=score; best=(gx,gy,max(bw,bh))
    return best

def white_frac(a):
    R,G,B=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int)
    mx=np.maximum(np.maximum(R,G),B);mn=np.minimum(np.minimum(R,G),B)
    return ((R>178)&(G>178)&(B>172)&((mx-mn)<45)).mean()

def stamp(arr,cx,cy,sz):
    half=int(max(22,sz*0.9))+14
    x0,y0=max(0,int(cx-half)),max(0,int(cy-half))
    x1,y1=min(1280,int(cx+half)),min(720,int(cy+half))
    w,h=x1-x0,y1-y0
    if w<6 or h<6: return arr
    # clone strictly horizontally from adjacent dirt (avoids horizon/city)
    cands=[(w+10,0),(-(w+10),0),(int(1.4*w),0),(-int(1.4*w),0),(0,h+10)]
    best=None;bw=1e9
    for dx,dy in cands:
        sx0,sy0=x0+dx,y0+dy
        if sx0<0 or sy0<0 or sx0+w>1280 or sy0+h>720: continue
        wf=white_frac(arr[sy0:sy0+h,sx0:sx0+w])
        if wf<bw: bw=wf; best=(sx0,sy0)
    if best is None or bw>0.06: return arr   # bail if no clean dirt source
    sx0,sy0=best
    patch=arr[sy0:sy0+h,sx0:sx0+w].astype(float)
    mask=Image.new("L",(w,h),0); ImageDraw.Draw(mask).ellipse([2,2,w-2,h-2],fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(4))
    m=np.asarray(mask).astype(float)[:,:,None]/255.0
    dst=arr[y0:y1,x0:x1].astype(float)
    arr[y0:y1,x0:x1]=(patch*m+dst*(1-m)).astype(np.uint8)
    return arr

# pass 1: detect ring anchors
anc={}
for r in centers:
    fi,lx,ly,found,w=r
    if fi<START: continue
    arr=np.asarray(Image.open(frames[fi-1]).convert("RGB"))
    d=detect_ring(arr,int(lx),int(ly))
    if d: anc[fi]=d
print("ring anchors:",len(anc))

# circle position = label + smoothly interpolated OFFSET (stable; always lands on ring/dirt)
lbl={r[0]:(r[1],r[2]) for r in centers}
af=sorted(anc.keys())
offx_a=[anc[k][0]-lbl[k][0] for k in af]
offy_a=[anc[k][1]-lbl[k][1] for k in af]
sz_a  =[anc[k][2] for k in af]
fis=list(range(START,len(frames)+1))
offx=np.interp(fis,af,offx_a); offy=np.interp(fis,af,offy_a); szi=np.interp(fis,af,sz_a)
def sm(a,w=9):
    a=np.asarray(a,float);p=w//2
    return np.convolve(np.pad(a,p,mode='edge'),np.ones(w)/w,mode='valid')
offx=sm(offx);offy=sm(offy);szi=sm(szi)

for r in centers:
    fi,lx,ly=r[0],r[1],r[2]
    arr=np.asarray(Image.open(frames[fi-1]).convert("RGB")).copy()
    if fi>=START:
        k=fi-START
        arr=stamp(arr, lx+offx[k], ly+offy[k], szi[k])
    Image.fromarray(arr).save(f"scratch/clean/{fi:03d}.png")
print("done: label-relative stamp over all frames")
