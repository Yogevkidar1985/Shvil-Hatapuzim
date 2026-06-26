#!/usr/bin/env bash
set -euo pipefail
cd /home/user/Shvil-Hatapuzim
mkdir -p scratch/clips
C=scratch/clips
ENC="-c:v libx264 -preset fast -crf 17 -pix_fmt yuv420p -r 25 -an"
GRADE="colorbalance=rs=0.05:gs=0.0:bs=-0.05:rm=0.06:bm=-0.05:rh=0.04:bh=-0.05,eq=contrast=1.05:saturation=1.12:gamma=1.02,vignette=PI/5"

# prescale modestly; d=1 (one output frame per looped input frame); $1=total frames -> zoom rate
# zoom reaches ~1.10 over $1 frames: rate = 0.10/$1
kb_in()  { local n=$1; local r; r=$(python3 -c "print(0.10/$n)"); echo "scale=1350:2400:force_original_aspect_ratio=increase,crop=1350:2400,zoompan=z='min(1.0+$r*on,1.10)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920,$GRADE,format=yuv420p"; }
kb_out() { local n=$1; local r; r=$(python3 -c "print(0.10/$n)"); echo "scale=1350:2400:force_original_aspect_ratio=increase,crop=1350:2400,zoompan=z='max(1.10-$r*on,1.0)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920,$GRADE,format=yuv420p"; }

echo "== c01 hero open =="
ffmpeg -y -loglevel error -ss 0 -t 5.5 -i "1_hero_aerial.mp4" \
 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,$GRADE,format=yuv420p" $ENC "$C/c01.mp4"

echo "== c02 whatsapp neighborhood (subtitle+sparkle removed) =="
ffmpeg -y -loglevel error -ss 1.0 -t 5.0 -i "WhatsApp Video 2026-06-23 at 13.14.08 (1).mp4" \
 -filter_complex "[0:v]delogo=x=1138:y=560:w=80:h=80,crop=1280:585:0:0,setsar=1,split=2[a][b];\
[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:1,eq=brightness=-0.12:saturation=0.85[bg];\
[b]scale=1080:-2[fg];\
[bg][fg]overlay=(W-w)/2:(H-h)/2,$GRADE,format=yuv420p[v]" -map "[v]" $ENC "$C/c02.mp4"

echo "== c03 higgs location map =="
ffmpeg -y -loglevel error -ss 0.4 -t 5.0 -i "higgsfield-9eade893-bc59-42dc-9369-1be188041e28.mp4" \
 -filter_complex "[0:v]setsar=1,split=2[a][b];\
[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:1,eq=brightness=-0.12:saturation=0.85[bg];\
[b]scale=1080:-2[fg];\
[bg][fg]overlay=(W-w)/2:(H-h)/2,$GRADE,format=yuv420p[v]" -map "[v]" $ENC "$C/c03.mp4"

echo "== c04 hf_082741 location map still (KB) =="
ffmpeg -y -loglevel error -loop 1 -t 4.5 -i "hf_20260624_082741_18a92b28-a5bd-4dc1-953b-f5a7f516dd13.png" \
 -vf "$(kb_in 113)" $ENC "$C/c04.mp4"

echo "== c05 hf_082404 the land aerial (KB) =="
ffmpeg -y -loglevel error -loop 1 -t 5.0 -i "hf_20260624_082404_b2277f8f-08ec-461e-9874-c239cf1f0332.png" \
 -vf "$(kb_in 125)" $ENC "$C/c05.mp4"

echo "== c06 hero parcel (asset) =="
ffmpeg -y -loglevel error -ss 3.0 -t 4.5 -i "1_hero_aerial.mp4" \
 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,$GRADE,format=yuv420p" $ENC "$C/c06.mp4"

echo "== c07 IMG_7318 future street (KB out reveal) =="
ffmpeg -y -loglevel error -loop 1 -t 4.5 -i "IMG_7318.png" -vf "$(kb_out 113)" $ENC "$C/c07.mp4"

echo "== c08 IMG_7316 future cycling (KB) =="
ffmpeg -y -loglevel error -loop 1 -t 4.5 -i "IMG_7316.png" -vf "$(kb_in 113)" $ENC "$C/c08.mp4"

echo "== c09 IMG_7270 future promenade (KB) =="
ffmpeg -y -loglevel error -loop 1 -t 4.5 -i "IMG_7270.png" -vf "$(kb_in 113)" $ENC "$C/c09.mp4"

echo "== c10 IMG_7269 family walking (slow push climax) =="
ffmpeg -y -loglevel error -loop 1 -t 5.5 -i "IMG_7269.png" -vf "$(kb_in 138)" $ENC "$C/c10.mp4"

echo "== c11 endcard CTA =="
ffmpeg -y -loglevel error -loop 1 -t 5.5 -i "scratch/assets/endcard.png" \
 -vf "scale=1080:1920,setsar=1,fps=25,format=yuv420p" $ENC "$C/c11.mp4"

echo "ALL CLIPS DONE"
for f in $C/c*.mp4; do printf "%s  " "$f"; ffprobe -v error -select_streams v:0 -show_entries stream=width,height,nb_frames -show_entries format=duration -of csv=p=0 "$f"; done