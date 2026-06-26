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
    sx0,sx1=max(0,lx-80),min(1280,lx+80)
    sy0,sy1=max(0,ly+2),min(720,ly+150)
    sub=arr[sy0:sy1,sx0:sx1].astype(int)
    R,G,B=sub[:,:,0],sub[:,:,1],sub[:,:,2]
    mx=np.maximum(np.maximum(R,G),B);mn=np.minimum(np.minimum(R,G),B)
    wm=(R>178)&(G>178)&(B>172)&((mx-mn)<45)
    lab,n=ndimage.label(wm)
    best=None;bsc=1e18
    for j in range(1,n+1):
        ys,xs=np.where(lab==j)
        bw=xs.max()-xs.min()+1; bh=ys.max()-ys.min()+1
        if bw<8 or bh<8 or bw>54 or bh>54 or not(0.45<bw/bh<2.2): continue
        ccx=int(xs.mean()); ccy=int(ys.mean())
        gx=sx0+ccx; gy=sy0+ccy
        if abs(gx-lx)>45: continue              # ring sits under the label
        c=wm[max(0,ccy-3):ccy+4,max(0,ccx-3):ccx+4]
        hole=1-(c.mean() if c.size else 1)
        if hole<0.36: continue                  # must be a ring (hole), not solid tail
        sc=abs(gx-lx)-hole*10
        if sc<bsc: bsc=sc; best=(gx,gy,max(bw,bh))
    return best

def white_frac(a):
    R,G,B=a[:,:,0].astype(int),a[:,:,1].astype(int),a[:,:,2].astype(int)
    mx=np.maximum(np.maximum(R,G),B);mn=np.minimum(np.minimum(R,G),B)
    return ((R>178)&(G>178)&(B>172)&((mx-mn)<45)).mean()

def stamp(arr,cx,cy,sz):
    half=int(min(34,max(17,sz*0.95)))+8
    x0,y0=max(0,int(cx-half)),max(0,int(cy-half))
    x1,y1=min(1280,int(cx+half)),min(720,int(cy+half))
    w,h=x1-x0,y1-y0
    if w<6 or h<6: return arr
    # horizontal clone only (same row band = field, never the horizon above)
    for dx in (w+12, -(w+12), int(1.5*w), -int(1.5*w)):
        sx0=x0+dx
        if sx0<0 or sx0+w>1280: continue
        if white_frac(arr[y0:y1,sx0:sx0+w])<0.05:
            patch=arr[y0:y1,sx0:sx0+w].astype(float); break
    else:
        return arr
    mask=Image.new("L",(w,h),0); ImageDraw.Draw(mask).ellipse([2,2,w-2,h-2],fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(5))
    m=np.asarray(mask).astype(float)[:,:,None]/255.0
    dst=arr[y0:y1,x0:x1].astype(float)
    arr[y0:y1,x0:x1]=(patch*m+dst*(1-m)).astype(np.uint8)
    return arr

def detect_small(arr,lx,ly):
    """fallback for tiny end ring: lowest small white blob under the label."""
    sx0,sx1=max(0,lx-55),min(1280,lx+55); sy0,sy1=ly+10,min(720,ly+70)
    sub=arr[sy0:sy1,sx0:sx1].astype(int);R,G,B=sub[:,:,0],sub[:,:,1],sub[:,:,2]
    mx=np.maximum(np.maximum(R,G),B);mn=np.minimum(np.minimum(R,G),B)
    wm=(R>168)&(G>168)&(B>163)&((mx-mn)<50)
    lab,n=ndimage.label(wm); best=None;blow=-1
    for j in range(1,n+1):
        ys,xs=np.where(lab==j); a=len(xs)
        bw=xs.max()-xs.min()+1; bh=ys.max()-ys.min()+1
        if a<10 or a>500 or bw>34 or bh>34: continue
        gx=sx0+int(xs.mean()); gy=sy0+int(ys.mean())
        if abs(gx-lx)>34: continue
        if gy>blow: blow=gy; best=(gx,gy,max(bw,bh))
    return best

# pass 1: precise ring anchors (hole test), with small-blob fallback for the end
anc={}
for r in centers:
    fi,lx,ly=r[0],int(r[1]),int(r[2])
    if fi<START: continue
    arr=np.asarray(Image.open(frames[fi-1]).convert("RGB"))
    d=detect_ring(arr,lx,ly)
    if not d and fi>=190:
        d=detect_small(arr,lx,ly)
    if d: anc[fi]=d
print("anchors:",len(anc),"last:",max(anc))

# absolute ring path interpolated from precise anchors, lightly smoothed
af=sorted(anc.keys())
fis=list(range(START,len(frames)+1))
cx=np.interp(fis,af,[anc[k][0] for k in af])
cy=np.interp(fis,af,[anc[k][1] for k in af])
sz=np.interp(fis,af,[anc[k][2] for k in af])
def sm(a,w=5):
    a=np.asarray(a,float);p=w//2
    return np.convolve(np.pad(a,p,mode='edge'),np.ones(w)/w,mode='valid')
cx=sm(cx);cy=sm(cy);sz=sm(sz)

# pass 2: stamp every frame at the precise interpolated ring position
for r in centers:
    fi=r[0]
    arr=np.asarray(Image.open(frames[fi-1]).convert("RGB")).copy()
    if fi>=START:
        k=fi-START
        arr=stamp(arr,cx[k],cy[k],sz[k])
    Image.fromarray(arr).save(f"scratch/clean/{fi:03d}.png")
print("done.")
