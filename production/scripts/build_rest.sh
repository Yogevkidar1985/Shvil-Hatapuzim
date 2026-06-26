#!/usr/bin/env bash
set -euo pipefail
cd /home/user/Shvil-Hatapuzim
C=scratch/clips
ENC="-c:v libx264 -preset fast -crf 17 -pix_fmt yuv420p -r 25 -an"
GRADE="colorbalance=rs=0.05:gs=0.0:bs=-0.05:rm=0.06:bm=-0.05:rh=0.04:bh=-0.05,eq=contrast=1.05:saturation=1.12:gamma=1.02,vignette=PI/5"
kb_in()  { local n=$1; local r; r=$(python3 -c "print(0.10/$n)"); echo "scale=1350:2400:force_original_aspect_ratio=increase,crop=1350:2400,zoompan=z='min(1.0+$r*on,1.10)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920,$GRADE,format=yuv420p"; }
kb_out() { local n=$1; local r; r=$(python3 -c "print(0.10/$n)"); echo "scale=1350:2400:force_original_aspect_ratio=increase,crop=1350:2400,zoompan=z='max(1.10-$r*on,1.0)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920,$GRADE,format=yuv420p"; }

echo "c04"; ffmpeg -y -loglevel error -loop 1 -t 4.5 -i "hf_20260624_082741_18a92b28-a5bd-4dc1-953b-f5a7f516dd13.png" -vf "$(kb_in 112)" $ENC "$C/c04.mp4"
echo "c05"; ffmpeg -y -loglevel error -loop 1 -t 5.0 -i "hf_20260624_082404_b2277f8f-08ec-461e-9874-c239cf1f0332.png" -vf "$(kb_in 125)" $ENC "$C/c05.mp4"
echo "c06"; ffmpeg -y -loglevel error -ss 3.0 -t 4.5 -i "1_hero_aerial.mp4" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,$GRADE,format=yuv420p" $ENC "$C/c06.mp4"
echo "c07"; ffmpeg -y -loglevel error -loop 1 -t 4.5 -i "IMG_7318.png" -vf "$(kb_out 112)" $ENC "$C/c07.mp4"
echo "c08"; ffmpeg -y -loglevel error -loop 1 -t 4.5 -i "IMG_7316.png" -vf "$(kb_in 112)" $ENC "$C/c08.mp4"
echo "c09"; ffmpeg -y -loglevel error -loop 1 -t 4.5 -i "IMG_7270.png" -vf "$(kb_in 112)" $ENC "$C/c09.mp4"
echo "c10"; ffmpeg -y -loglevel error -loop 1 -t 5.5 -i "IMG_7269.png" -vf "$(kb_in 137)" $ENC "$C/c10.mp4"
echo "c11"; ffmpeg -y -loglevel error -loop 1 -t 5.5 -i "scratch/assets/endcard.png" -vf "scale=1080:1920,setsar=1,fps=25,format=yuv420p" $ENC "$C/c11.mp4"
echo "ALL CLIPS DONE"
for f in $C/c*.mp4; do printf "%s  " "$f"; ffprobe -v error -select_streams v:0 -show_entries stream=width,height,nb_frames -show_entries format=duration -of csv=p=0 "$f"; done