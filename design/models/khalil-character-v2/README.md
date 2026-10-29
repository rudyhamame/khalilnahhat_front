# Khalil character v2 — measured photo fit (head)

Not a 100% likeness: a head fitted to the two reference photos with measured numbers, then photo-textured.

## Pipeline (all local; scripts in `work/`)
1. `prep_a.py` / `prep_b.py` — neutral MPFB head rendered in Blender; MediaPipe landmarks detected on that render are mapped to mesh triangles (barycentric), so photo and model landmarks share semantics.
2. `landmarks.py` — 478 landmarks on `refs/khalil-front.png`. The profile photo is not detectable (true side view), so 6 profile points were read by hand from a zoomed grid.
3. `fit.py` — bounded least squares over 184 MPFB face targets (head, nose, mouth, chin, cheek, ears, eyes, brows, forehead, neck). Terms: front landmarks (2D), hand-read profile depths (relative to the midline subnasale, because the profile photo is yawed), ear size/position, skull height, and the head/neck silhouette (hair and beard thickness removed).
4. `build_fit.py` — rebuilds the MPFB human with the fitted weights (`work/fit_weights.json`).
5. `align_profile.py` — profile camera (yaw/pitch/scale/shift) from silhouette matching (6.8 mm RMS, hair/beard included).
6. `bake.py` + `finish_tex.py` — front and profile photos projected into a 2048 UV skin texture (`out/khalil-skin-v2.png`); unseen areas are filled with hair/skin colour sampled from the photos.
7. `apply_tex.py`, `export_glb.py` — textured scene and GLB.

## Measured result
- Front landmarks: mean 2.3 mm, 90th percentile 4.1 mm after similarity alignment (neutral base head: about 11 mm before the nose/mouth/eye mapping fix).
- Profile (nose tip, nasion, lips, chin, glabella vs. subnasale): within 0.5 mm of the hand-read values.
- These are fit residuals against the same two photos, not an independent likeness test.

## Known gaps
- No hair geometry: the hair is texture only (bald-shaped silhouette). Beard is texture, not geometry.
- Left side, back and top of the head are inferred (profile photo mirrored; crown/back filled with sampled colour).
- Ears use the photo texture on stock ear geometry.
- Profile points are hand-read; the profile photo is ~yawed, so profile depths use midline points only.
- Body, rig and outfit are not part of this pass (head/neck only fitted; stock body remains in the `.blend`/`.glb`).
- Created with `.venv` (mediapipe 0.10.14, scipy, opencv) — not committed.

Files: `out/khalil-fit-v2-textured.blend`, `out/khalil-head-v2.glb` (32 MB, includes shape keys), `out/render-*.png`.
