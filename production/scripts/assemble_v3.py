#!/usr/bin/env python3
# v3: drop duplicate beats (c04 map-still dup of c03, c06 hero reuse).
# Sequence: city -> neighborhood -> location map -> the land -> future x3 -> family.
# No captions. Logo only. Stronger motion on the closing family shot.
import subprocess, os
os.chdir("/home/user/Shvil-Hatapuzim")
C = "scratch/clips"
clips = [f"{C}/{n}.mp4" for n in ["c01","c02","c03","c05","c07","c08","c09","c10"]]
T = [0.6,0.6,0.6,1.0,0.6,0.6,0.6]   # land->future (index3) = longer morph

def dur(f):
    return float(subprocess.check_output(
        ["ffprobe","-v","error","-select_streams","v:0",
         "-show_entries","format=duration","-of","csv=p=0",f]).decode().strip())

D=[dur(c) for c in clips]
offsets=[]; acc=D[0]
for i in range(len(T)):
    off=acc-T[i]; offsets.append(round(off,3)); acc=off+D[i+1]
total=round(acc,3)
print("clips:", [os.path.basename(c) for c in clips]); print("offsets:", offsets); print("total:", total)

inputs=[]
for c in clips: inputs+=["-i",c]
fc=[]; prev="0:v"
for i in range(len(T)):
    out=f"x{i}" if i<len(T)-1 else "vbase"
    fc.append(f"[{prev}][{i+1}:v]xfade=transition=fade:duration={T[i]}:offset={offsets[i]}[{out}]")
    prev=out
subprocess.check_call(["ffmpeg","-y","-loglevel","error",*inputs,
    "-filter_complex",";".join(fc),"-map","[vbase]",
    "-c:v","libx264","-preset","medium","-crf","16","-pix_fmt","yuv420p","-r","25","-an",
    f"{C}/base_v3.mp4"])

inp=["-i",f"{C}/base_v3.mp4","-loop","1","-t",str(total+1),"-i","scratch/assets/logo_footage.png"]
fc=["[1:v]format=rgba,fps=25,fade=t=in:st=0:d=0.8:alpha=1[logo]",
    "[0:v][logo]overlay=70:H-h-60[v0]","[v0]format=yuv420p[final]"]
subprocess.check_call(["ffmpeg","-y","-loglevel","error",*inp,
    "-filter_complex",";".join(fc),"-map","[final]","-t",str(total),
    "-c:v","libx264","-preset","slow","-crf","18","-pix_fmt","yuv420p","-r","25","-an",
    "-movflags","+faststart","Shvil_HaTapuzim_9x16.mp4"])
print("FINAL DONE:", round(dur("Shvil_HaTapuzim_9x16.mp4"),3),"s")
