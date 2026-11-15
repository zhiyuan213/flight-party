# Billiard ball recording
billiard ball clack — Za-Games, 2020-10-16.
https://freesound.org/people/Za-Games/sounds/539854/
CC0 1.0 https://creativecommons.org/publicdomain/zero/1.0/
Downloaded official high-quality MP3 preview, 2026-11-05:
https://cdn.freesound.org/previews/539/539854_12029332-hq.mp3
Runtime trims leading silence/tail and creates three subtly filtered playback variants.
These are variants of one real recording, not three independently recorded impacts.

## 2026-11-13 · production source is the CC0 MP3 again

At the user's request the game was returned to the pre-11-12 ball voice:
`dist/table/pool-audio.js` loads `ball-clack.mp3` (the Za-Games CC0 recording
documented at the top of this file), trims its leading silence to a 110 ms
window and plays three rate variants through a strength-dependent low-pass.
The A-series WAVs below are NOT loaded by the game; they remain on disk for the
audition/preview pages and for historical comparison. Keep both credits: the
CC0 line above for production, and the CC BY 4.0 line below if any A
derivative or mixed preview is distributed.

## Archived A series — 2026-11-12 (not loaded by the game)

`ball-clack-a.wav` preserves the user-selected A before the later body EQ.
The 11-12 build loaded `ball-clack-a-solid.wav`, derived from that same sample.
Source: [Billiard balls single hit-dry.wav by juskiddink](https://freesound.org/people/juskiddink/sounds/108615/),
licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
Official source preview: https://cdn.freesound.org/previews/108/108615_649468-hq.mp3

Edited: selected principal collision, stereo-to-mono, level matched with a 0.7
peak ceiling, 0.2 ms fade-in and 15 ms fade-out, padded to 90 ms / 44100 Hz PCM16.
This is candidate A as explicitly selected by the user. The subsequent user
request was to make it less brittle and more solid. `ball-clack-a-solid.wav`
applies two peaking EQ stages: 2020 Hz / Q 1.3 / -11 dB, then 800 Hz / Q .85 /
+9 dB. Gain targets the original energy with a .78 peak ceiling; a final 4 ms
fade avoids a boundary click. No pitch shift, synthetic oscillator, or reverb
was added. Rebuild with `node scripts/build-pool-solid-hit.mjs`. Playback retains
the original rate. Dense rack contacts overlap multiple copies into
one PCM sound; timing and strength come from the presentation schedule, not a
new physics result. Preserve this author/source/license credit when distributing
the derivative or mixed sounds. Since 2026-11-13 the Za-Games MP3 is the
production source again; these A WAVs remain for historical audition
comparisons. All four candidate sources: audition/LICENSE.md.
