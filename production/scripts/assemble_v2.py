#!/usr/bin/env python3
# v2: no captions, logo only, end on the animated future images (no static endcard).
import subprocess, os
os.chdir("/home/user/Shvil-Hatapuzim")
C = "scratch/clips"
clips = [f"{C}/c{n:02d}.mp4" for n in range(1, 11)]  # c01..c10 (drop static endcard)

def dur(f):
    return float(subprocess.check_output(
        ["ffprobe","-v","error","-select_streams","v:0",
         "-show_entries","format=duration","-of","csv=p=0",f]).decode().strip())

D = [dur(c) for c in clips]
T = [0.6,0.6,0.6,0.6,0.6,1.0,0.6,0.6,0.6]   # 9 transitions
offsets = []
acc = D[0]
for i in range(len(T)):
    off = acc - T[i]; offsets.append(round(off,3)); acc = off + D[i+1]
total = round(acc,3)
print("durations:", [round(x,2) for x in D]); print("offsets:", offsets); print("total:", total)

# ---- xfade chain -> base ----
inputs = []
for c in clips: inputs += ["-i", c]
fc=[]; prev="0:v"
for i in range(len(T)):
    out = f"x{i}" if i < len(T)-1 else "vbase"
    fc.append(f"[{prev}][{i+1}:v]xfade=transition=fade:duration={T[i]}:offset={offsets[i]}[{out}]")
    prev=out
subprocess.check_call(["ffmpeg","-y","-loglevel","error",*inputs,
    "-filter_complex",";".join(fc),"-map","[vbase]",
    "-c:v","libx264","-preset","medium","-crf","16","-pix_fmt","yuv420p","-r","25","-an",
    f"{C}/base_v2.mp4"])
print("base_v2:", round(dur(f'{C}/base_v2.mp4'),3))

# ---- overlay logo only (persistent bottom-left, fade in, stays to end) ----
inp = ["-i", f"{C}/base_v2.mp4",
       "-loop","1","-t",str(total+1),"-i","scratch/assets/logo_footage.png"]
fc = [
  "[1:v]format=rgba,fps=25,fade=t=in:st=0:d=0.8:alpha=1[logo]",
  "[0:v][logo]overlay=70:H-h-60[v0]",
  "[v0]format=yuv420p[final]",
]
subprocess.check_call(["ffmpeg","-y","-loglevel","error",*inp,
    "-filter_complex",";".join(fc),"-map","[final]","-t",str(total),
    "-c:v","libx264","-preset","slow","-crf","18","-pix_fmt","yuv420p","-r","25","-an",
    "-movflags","+faststart","Shvil_HaTapuzim_9x16.mp4"])
print("FINAL DONE:", round(dur("Shvil_HaTapuzim_9x16.mp4"),3),"s")
