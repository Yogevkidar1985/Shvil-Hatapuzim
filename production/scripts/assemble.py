#!/usr/bin/env python3
import subprocess, os, json
os.chdir("/home/user/Shvil-Hatapuzim")
C = "scratch/clips"
clips = [f"{C}/c{n:02d}.mp4" for n in range(1, 12)]

def dur(f):
    out = subprocess.check_output(
        ["ffprobe","-v","error","-select_streams","v:0",
         "-show_entries","format=duration","-of","csv=p=0",f]).decode().strip()
    return float(out)

D = [dur(c) for c in clips]
print("durations:", [round(x,3) for x in D])

# transition durations between clip i and i+1 (10 transitions)
T = [0.6,0.6,0.6,0.6,0.6,1.0,0.6,0.6,0.6,0.6]

# offsets (start time of incoming clip in final timeline) = cumulative
offsets = []
acc = D[0]
for i in range(10):
    off = acc - T[i]
    offsets.append(round(off, 3))
    acc = off + D[i+1]
total = round(acc, 3)
print("offsets:", offsets)
print("total:", total)

# ---- Pass 2: xfade chain ----
inputs = []
for c in clips:
    inputs += ["-i", c]
fc = []
prev = "0:v"
for i in range(10):
    out = f"x{i}" if i < 9 else "vbase"
    fc.append(f"[{prev}][{i+1}:v]xfade=transition=fade:duration={T[i]}:offset={offsets[i]}[{out}]")
    prev = out
fc_str = ";".join(fc)
cmd2 = ["ffmpeg","-y","-loglevel","error",*inputs,
        "-filter_complex", fc_str, "-map","[vbase]",
        "-c:v","libx264","-preset","medium","-crf","16","-pix_fmt","yuv420p",
        "-r","25","-an", f"{C}/base.mp4"]
print("== building base ==")
subprocess.check_call(cmd2)
base_dur = dur(f"{C}/base.mp4")
print("base duration:", round(base_dur,3))

# ---- caption schedule ----
# region starts (final timeline) of clip k: offsets[k-1] for k>=2, 0 for k=1
clip_start = [0.0] + offsets  # clip_start[k] = start of clip index k (0-based)
# caption windows (absolute seconds)
caps = [
    ("scratch/assets/cap_A.png", 0.6, clip_start[2]+D[2]-0.6),     # over clips 1-2 -> end mid clip3 region? keep within clips1-2
]
# Build precise windows from clip boundaries:
# A: clips 1-2 -> [0.6 , end of clip2 visible ~ clip_start[2]+... ] use clip_start[2] region
A_end = clip_start[2] + 0.0  # start of clip3 ~ end of clip2 group
B_end = clip_start[4]        # start of clip5
C_end = clip_start[6]        # start of clip7 (after the long morph)
D_end = clip_start[9]        # start of clip10
E_end = clip_start[10]       # start of clip11 (endcard)

caps = [
    ("scratch/assets/cap_A.png", 0.8,  A_end-0.5),
    ("scratch/assets/cap_B.png", clip_start[2]+0.6, B_end-0.5),
    ("scratch/assets/cap_C.png", clip_start[4]+0.6, C_end-0.6),
    ("scratch/assets/cap_D.png", clip_start[6]+0.6, D_end-0.5),
    ("scratch/assets/cap_E.png", clip_start[9]+0.6, E_end-0.2),
]
caps = [(p, round(s,3), round(e,3)) for (p,s,e) in caps]
print("caption windows:", caps)
logo_out = round(clip_start[10]-0.4, 3)   # fade logo out just before endcard
logo_enable_end = round(clip_start[10], 3)

# ---- Pass 3: overlay logo + captions ----
inp = ["-i", f"{C}/base.mp4",
       "-loop","1","-t",str(total+1),"-i","scratch/assets/logo_footage.png"]
for (p,s,e) in caps:
    inp += ["-loop","1","-t",str(total+1),"-i",p]

fc = []
fc.append(f"[1:v]format=rgba,fps=25,fade=t=in:st=0:d=0.8:alpha=1,fade=t=out:st={logo_out}:d=0.4:alpha=1[logo]")
for idx,(p,s,e) in enumerate(caps):
    inlbl = f"{idx+2}:v"
    fo = round(e-0.5,3)
    fc.append(f"[{inlbl}]format=rgba,fps=25,fade=t=in:st={s}:d=0.5:alpha=1,fade=t=out:st={fo}:d=0.5:alpha=1[cap{idx}]")
fc.append(f"[0:v][logo]overlay=70:H-h-60:enable='between(t,0,{logo_enable_end})'[v0]")
prev="v0"
for idx,(p,s,e) in enumerate(caps):
    out = f"v{idx+1}" if idx < len(caps)-1 else "vout"
    fc.append(f"[{prev}][cap{idx}]overlay=0:0:enable='between(t,{s},{e})'[{out}]")
    prev=out
fc.append("[vout]format=yuv420p[final]")
fc_str=";".join(fc)

cmd3 = ["ffmpeg","-y","-loglevel","error",*inp,
        "-filter_complex", fc_str, "-map","[final]",
        "-c:v","libx264","-preset","slow","-crf","18","-pix_fmt","yuv420p",
        "-r","25","-an","-movflags","+faststart",
        "Shvil_HaTapuzim_9x16.mp4"]
print("== building final ==")
subprocess.check_call(cmd3)
print("FINAL DONE:", round(dur("Shvil_HaTapuzim_9x16.mp4"),3),"s")
