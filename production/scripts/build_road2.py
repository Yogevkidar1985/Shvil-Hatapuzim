#!/usr/bin/env python3
import subprocess, os
os.chdir("/home/user/Shvil-Hatapuzim")

M = "(r(X,Y)-max(g(X,Y),b(X,Y))-38)*6"
P = "clip((T-4.8)/0.6,0,1)*(0.62+0.38*sin(2*PI*T*1.0))"
geq = (f"geq=r='clip({M},0,255)*0.45*({P})':"
       f"g='clip({M},0,255)*({P})':"
       f"b='clip({M},0,255)*({P})'")

fc = (
 "[0:v]hqdn3d=2:1.5:3:3,format=gbrp,split=2[b1][b2];"
 f"[b2]{geq}[gc];"
 "[gc]split=2[gca][gcb];"
 "[gca]gblur=sigma=2[gs];"
 "[gcb]gblur=sigma=16[gl];"
 "[gs][gl]blend=all_mode=addition[gall];"
 "[b1][gall]blend=all_mode=screen[wg];"
 "[wg]format=yuv420p,delogo=x=1095:y=575:w=78:h=78,"
 "scale=1920:1080:flags=lanczos,unsharp=5:5:0.5:5:5:0.0,"
 "eq=contrast=1.05:saturation=1.12:gamma=1.02,"
 "colorbalance=rs=0.04:bs=-0.04:rm=0.05:bm=-0.04:rh=0.03:bh=-0.04[v];"
 "[v][1:v]overlay=0:0:eof_action=pass:format=auto[out]"
)
cmd = ["ffmpeg","-y","-loglevel","error",
       "-framerate","24","-i","scratch/clean/%03d.png",
       "-framerate","24","-i","scratch/ov/%03d.png",
       "-filter_complex", fc, "-map","[out]",
       "-r","24","-an","-t","10.0",
       "-c:v","libx264","-preset","slow","-crf","18","-pix_fmt","yuv420p",
       "-movflags","+faststart","Shvil_HaTapuzim_road.mp4"]
print("running...")
subprocess.check_call(cmd)
d = subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration",
     "-of","csv=p=0","Shvil_HaTapuzim_road.mp4"]).decode().strip()
print("DONE:", d)
