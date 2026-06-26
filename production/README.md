# Shvil HaTapuzim — Campaign Video Production

Final deliverable: **`../Shvil_HaTapuzim_9x16.mp4`** (1080×1920, 9:16, 25fps, ~48s, **silent**, H.264).

Built for a Meta lead-generation campaign, following `Shvil HaTapuzim Master Brief.md`.

## Creative
- **Arc:** drone over Hod Hasharon → approach / location of Shvil HaTapuzim → the real land (today) → transition → future lifestyle → family walking the new boulevard (climax) → branded CTA.
- **Fully animated** end-to-end: Ken Burns moves on stills + soft cross-dissolves between every shot.
- **Golden-hour warm grade** applied uniformly to all footage.
- **Brand logo** persistent bottom-left over all footage; full-color centered on the endcard.
- **Hebrew RTL captions** (the campaign copy) in the lower third with a readability scrim.
- **No audio** at all (silent feed-ready cut).

## Cleanups applied
- WhatsApp clip: burned-in subtitle removed (crop) and bottom-right ✦ AI watermark removed (`delogo`).
- All source audio stripped.

## Reproduce
```bash
python3 scripts/make_assets.py      # logo, captions, endcard PNGs -> scratch/assets
bash   scripts/build_clips.sh       # normalize/animate clips c01..c11 -> scratch/clips
bash   scripts/build_rest.sh        # (Ken Burns clips, d=1 fix)
python3 scripts/assemble.py         # xfade + logo + captions -> Shvil_HaTapuzim_9x16.mp4
```
Requires `ffmpeg` (with libfreetype/fribidi/harfbuzz) and `python3` + `Pillow` (raqm).

## Scene → asset map (corrected from actual footage content)
| # | Asset | Role |
|---|-------|------|
| 1 | `1_hero_aerial.mp4` | drone reveal of the land + city |
| 2 | `WhatsApp ... .mp4` | established Hod Hasharon neighborhood |
| 3 | `higgsfield-...mp4` | animated location map |
| 4 | `hf_...082741.png` | labeled location map |
| 5 | `hf_...082404.png` | the real land, aerial |
| 6 | `1_hero_aerial.mp4` | parcel / the asset |
| 7–9 | `IMG_7318/7316/7270.png` | future lifestyle (street, cycling, promenade) |
| 10 | `IMG_7269.png` | family walking the boulevard (climax) |
| 11 | endcard | CTA: "השאירו פרטים עכשיו" / "קבלו מידע" |

> Note: `E3729...png` is the brand **logo** (orange "שביל התפוזים"), not an ending frame as the original manifest guessed.
