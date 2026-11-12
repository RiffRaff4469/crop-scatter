# Crop Scatter

**Beat-synced crop boxes, fake parallax and crop-collage transitions for After Effects.**

Crop Scatter is a ScriptUI panel I built for sports and athlete edits. You give it a background clip and a roto of the athlete, and it builds a "player": random crop boxes cut from the footage pop on and off around the athlete, in front of and behind them, timed to the music. Linked players crop into each other near the cut, so one clip breaks apart into boxes of the next. Everything stays live and editable from the panel until you bake it.

## What it does

- **Players.** Precomposes a background clip and an optional athlete roto into a `CS Player` comp with crop-box layers behind and in front of the athlete. Without a roto you get one box layer over the background.
- **Timing.** Boxes change on a BPM grid, on clip or comp markers, at random intervals, or spread across the clip with a pacing curve (even, speeding up, slowing down, busy in the middle). Quiet zones, skip chance, hold length, strobe and pop-in are all adjustable.
- **Boxes.** Count range, size range, size bias (fewer boxes come out bigger), shape and shape variety, scatter area, snap-to-grid and the chance a box lands in front of the athlete.
- **Motion inside the box.** Offset, drift, zoom and flip for the footage in each box, plus tilt for the box itself.
- **Looks.** Normal, Invert, Black & white, Tint (two color sets) and Glow, each with an on/off switch, a weight and its own brightness/contrast. Looks can be weighted-random or cycle in order, and "Spread looks out" keeps boxes that touch from sharing a look.
- **Parallax.** Slow push, a punch on each beat, or both, with separate depth values for the background, boxes behind, athlete and boxes in front, plus camera drift.
- **Transitions.** Link back-to-back players. Toward the end of clip A, A's boxes start showing clip B (more of them, optionally bigger, with a rising share from B). At the start of B, its boxes show A and ramp back down.
- **Inputs per player.** Each player gets Full, Roto and Crop Source comps. Full has Time Remap switched on with room for slow motion, the roto can follow Full's timing so you only ramp once, and Crop Source can be swapped for a different shot.
- **Beat tools.** Tap tempo, apply BPM, set the downbeat to the playhead, on/off beat phase, and a "Music -> Beat Markers" button that turns the music's audio amplitude into comp markers.
- **Presets.** Five quick looks (Subtle, Hype, Chaos, Bold, Flash), three transition presets (Smooth, Build, Flicker), new seed, copy/paste settings between players, and saved presets with `.cspreset` import and export.
- **Bake.** Converts a player's expressions to keyframes and keeps a live backup in the project, so Unbake can put the expressions back.
- **Housekeeping.** Batch build every BG + roto pair in a selection, rebuild, repair a comp after renames, and tidy everything into a `Crop Scatter` folder in the Project panel.

## Install

1. Copy `CropScatter.jsx` to `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/` (on Windows: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`).
2. Restart After Effects.
3. Open it from the **Window** menu (**Window > CropScatter.jsx**).

Preset **Import** and **Export** read and write files, so for those two buttons turn on **Settings > Scripting & Expressions > Allow Scripts to Write Files and Access Network**. Everything else works without it.

## Using it

1. In your main comp, stack the athlete roto over its background clip, select both and click **Build Player**. You can also assign them with the two **Set** buttons first. For a whole edit, select every BG + roto layer and click **Batch: Build Every Pair in Selection**.
2. Select one or more players and click **Load Selected**. Pick a page from the **Page** dropdown (Timing, Boxes, Motion, Looks, Grade, Parallax) and adjust. Changes apply to every loaded player. The **Quick looks** buttons are a fast starting point.
3. On the **Beats** page, set the BPM (or tap it), park the playhead on a downbeat and click **Downbeat = Playhead**. To sync to the track instead, select the music layer and click **Music -> Beat Markers**.
4. For transitions, select back-to-back players, open the **Transition** page and click **Link Selected Players (in time order)**. Tune the lead-in and lead-out lengths and the ramp there.
5. To retime a clip, use **Open Full (retime)** and speed-ramp it there. **Roto Follows Full Timing** makes the roto use the same ramp.
6. When the edit is locked, click **Bake Selected to Keyframes**. Keep **Keep backup** checked if you want to be able to unbake.

**How to use** on the Build page shows a short version of this in After Effects.

## How it's built

- **All settings are effect controls on the player layer.** Every box, look and parallax layer reads them through expressions, so the panel is just a front end and the comp keeps working without it.
- **Box maths runs once per box per frame.** Each box writes its result into three hidden 3D point controls (on/look/tint set packed into one value, then position, crop and scale). The mask, transform and look effects only read those values instead of recomputing.
- **Repeatable randomness.** The expressions use a small seeded Park-Miller generator, so a given seed always gives the same layout and New Seed gives a fresh one.
- **Generated layers are tracked through layer comments** (IDs, roles, link tags), which is how Rebuild, Repair, Remove and Bake find what the script made and leave everything else alone. Older versions' players are upgraded in place.
- **Undo groups per player.** Batch, rebuild and link actions run each player in its own undo group, free memory between players, and report errors per player instead of stopping.
- **Baking is selective.** Opacity is baked as hold keys, and the other box properties are only sampled on frames where the box is visible. Parallax scale and position are baked as linear keys with redundant keys removed.
- **Presets live in After Effects' own settings**, split into chunks because AE limits the length of a stored value. Import and Export use plain text `.cspreset` files you can edit by hand.

Tested with After Effects 2026 (26.x) on macOS.

## License

MIT. See [LICENSE](LICENSE). Made by JMV Productions.
