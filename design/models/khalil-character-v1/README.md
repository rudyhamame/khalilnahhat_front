# Khalil — separate character and mixer

## Removed at the user's request — October 26, 2026

Generated character meshes, Blender projects/backups, generated texture/test outputs (`mpfb-draft/` and `generated/`) and standalone browser viewers (`review.html`, `preview.html`) were moved to the desktop Trash. Browser tab closure could not be confirmed because the control session was no longer active. Original/reference portraits and the app's existing portrait were preserved. The sections below are historical records; their output paths are no longer active. Blender and MPFB remain installed.

## Actual status

### Local Blender/MPFB work — October 26, 2026

- Blender 4.5.9 LTS installed at `/home/rudy/.local/opt/blender-4.5.9-linux-x64`; official archive SHA-256 verified. Command: `/home/rudy/.local/bin/blender`. A desktop application entry is installed.
- MPFB 2.0.18 installed from the official repository tag and enabled in Blender. CC0 MakeHuman system asset pack installed; downloaded archives retained in `/home/rudy/Downloads/khalil-3d-tools`.
- `mpfb-draft/khalil-mpfb-editable-v1.blend`: editable technical base with weighted body/clothes, 184-bone rig including helpers, hand IK and finger controls. Textures and references packed.
- `mpfb-draft/khalil-mpfb-rig-test-v1.glb`: six skinned meshes and a diagnostic joint animation. It is **not** approved likeness or a finished DJ performance. Re-import validation confirms joint animation deforms body, outfit and footwear; see `mpfb-draft/export-validation.json` and renders.
- `mpfb-draft/khalil-mpfb-face-shape-v2.blend`: first conservative manual face-shape pass based on front/profile images visible in chat; topology, vertex groups and armature attachment preserved. Separate clay renders intentionally omit stock hair/materials for shape review. No exact image alignment or identity guarantee is claimed.
- Original front and right-facing portraits are now copied unchanged to `references/khalil-front.png` and `references/khalil-profile.png`; SHA-256 matches the user-supplied originals. `references/manifest.json` records dimensions and hashes. No AI edits or image alterations were made.
- `mpfb-draft/khalil-mpfb-reference-workspace-v3.blend` packs both portraits as separate front/profile reference empties, initially aligned using manually estimated eye centers and inter-eye spacing. Bone and mesh vertex counts remain unchanged. This is approximate reference placement, not a calibrated camera solve or completed likeness fit.
- Surface revision v4: `mpfb-draft/khalil-surface-work-v4.blend` retains the authoring rig and packs photo-projected skin/eye UV textures derived from the unchanged reference originals. A temporary short wavy library hairstyle replaces slick stock hair. `mpfb-draft/khalil-surface-review-v4.glb` exports neutralized controls and direct PBR materials to correct browser-only helper/eye/material defects; it is the active asset in `review.html`. Photo lighting, inferred opposite-side appearance, geometry fit, seams and hairstyle remain limitations. This revision is **not** an approved final likeness. See `surface-v4-notes.json` and the exported deformation checks in `surface-v4-rig-validation.json`.
- Revision v5 (`refine_surface_v4.py --profile-pass`): updates editable nose depth/curvature, chin prominence, cranial depth/width and forehead targets; refits the existing rig and assets; reduces the stock hair volume with scalp-clearance correction. Exports `khalil-surface-review-v5.glb` and saves `khalil-surface-work-v5.blend`. The browser now defaults to a right-facing view, matching the reference direction; `Revision 5` identifies the active asset and avoids confusion with the older v4 screenshot. V5 supersedes v4 in `review.html`. Remaining silhouette, hairline and photographic projection mismatches are not claimed solved. See `surface-v5-rig-validation.json`.
- Revision v6 (`refine_surface_v4.py --hair-pass`) is now active in `review.html`: shader-baked warm-brown hair removes green contamination from the stock diffuse map; temple geometry shifted toward the ears; sideburn/beard uses a separate projection with the photographic ear region excluded; high-poly layered eyes replaced by a single-surface stock eye mesh; weighted eyelash asset added. Preserves the six weighted character parts and skeleton, confirmed by `surface-v6-rig-validation.json`. Hair remains a modified library mesh, with visible cap-like shape/texture seams; eye/skin projection and exact likeness remain unfinished. No claim of reference-perfect grooming or anatomy.
- User-requested follow-up: added `eyelashes01` object removed from the active v6 Blender source and GLB, and removed from the generator so it will not return on regeneration. Five meshes remain; all other geometry/binary buffers preserved. Re-import rig validation repeated after removal. Earlier saved revisions/backups retain historical work.
- Hairline-only revision v7 is now active: `refine_hairline_v7.py` starts from the no-added-lashes v6 source, raises the low fringe, shapes temple recession and adds the stock strand normal map with reduced specularity. 421 hair vertices adjusted without changing topology; face, eyes and beard are not reshaped by this pass. Authoring file: `mpfb-draft/khalil-hairline-work-v7.blend`; browser asset: `mpfb-draft/khalil-hairline-review-v7.glb`. Front/profile browser checks and exported-skin tests completed (`surface-v7-rig-validation.json`). This remains a modified stock hairstyle, not a final reference-matched groom.
- Hair, beard, skin textures and exact facial likeness remain unfinished. The app's current portrait remains unchanged. Do not present the draft as a finished realistic Khalil.

### Earlier reference preparation

- Provisional front A-pose reference generated from the approved app portrait using the built-in image tool.
- Full body, separated arms and hands, no headphones, no mixer, real RGBA transparency.
- Source, final prompt, and identity caveats: `REFERENCE-PROMPT.md`.
- The user supplied a closer photo screenshot, saved as `identity-reference-user-closeup.png`. A revised A-pose without sunglasses is saved as `neutral-a-pose-front-v3-photo-reference.png`. It uses that real-photo screenshot for facial appearance and v2 only for pose/clothing. This remains an AI reconstruction reference, not a verified identity scan.
- `neutral-a-pose-front-v2-screenshot.png` preserves the intermediate desktop-screenshot-based draft. `IDENTITY-REVISION-PROMPTS.md` records both revision prompts and their inputs.
- Microsoft hosted TRELLIS.2 successfully reconstructed and exported `generated/khalil-neutral-unrigged-v1.glb` after the user signed in and requested a retry. This is a real textured mesh, not a rig: no skeleton, skin weights, or animation has been produced.
- Existing app artwork and playback implementation are unchanged by this asset-preparation task.

## Reconstruction attempt

### Successful browser retry — October 25, 2026 (America/New_York)

- Approved v3 reference; resolution 1536; randomized seed 52273040; default sampling settings.
- Export requested: 300,000 faces, 4096 px textures.
- Download verified: glTF 2 binary, 12,332,860 bytes; one mesh/material, two embedded images, 196,059 vertices, 285,095 triangles; `EXT_texture_webp`.
- No skins or animations. Keep this high-detail source separate from the future optimized, rigged web asset.
- SHA-256: `d82896b7fcf47a71fccaa621c0afe4fdfb342ca2bba089deb86ac264c36b7dd4`.
- Initial preview shows a complete clothed body and separated hands. Detailed likeness, back geometry, finger topology, and deformation still need review. Do not treat a successful reconstruction as final identity or rigging approval.

### Earlier blocked API attempt

Official demo: https://huggingface.co/spaces/microsoft/TRELLIS.2

Requested: 1536 resolution, seed 42, 20 sampling steps for sparse structure / shape / texture. Planned export: 300,000 faces and 4096 px textures for a high-detail source mesh, not the final web runtime mesh.

Actual service response:

> You have exceeded your ZeroGPU quota (120s requested vs. 178s left). Try again in 16:13:29. Authenticate with a Hugging Face token for more quota.

The contradictory-looking seconds are the service's own message. Do not interpret them as successful generation. Do not bypass the quota or switch to a paid provider without authorization.

The installed hardware has Intel HD Graphics 620 and no NVIDIA CUDA GPU. Microsoft's official local requirements specify an NVIDIA GPU with at least 24 GB memory: https://github.com/microsoft/TRELLIS.2#prerequisites

## Resume

Current path: open `mpfb-draft/khalil-mpfb-reference-workspace-v3.blend` in local Blender. Refine shape against both portrait references, then build matched hair/beard and materials. Use the smile photo only as an additional expression reference. Re-test deformation/export after shape or rig changes. Do not substitute the rejected TRELLIS asset for the local MPFB draft.

The following older reconstruction plan is retained as history, not the active likeness workflow:

1. Review the v3 likeness against `identity-reference-user-closeup.png`. The source is a 571 × 888 cropped screenshot, not a full-resolution original photograph. Obtain the original photo and profile/back references if possible before final likeness approval; retain natural skin and age. V3 retains a visible smile from the photo, so a facial-animation rig would need additional neutral-face work.
2. Use the downloaded unrigged reconstruction above; regeneration is not required to begin inspection.
3. Inspect front/profile/back and fingers. Single-view hidden geometry is inferred, not verified identity.
4. Retopologize shoulders, elbows, wrists, fingers, hips and knees; preserve the high-detail source for texture baking.
5. Rig and skin the character separately from the mixer. Keep sunglasses/accessories separate where possible.
6. Test shoulder/elbow/wrist/finger deformation and hand-to-control contacts. Add hand IK targets for real fader/knob interactions.
7. Export a web-optimized skinned GLB and verify its joints, weights, materials, animation and browser performance before replacing the current character.

Retry command (does not bypass service quotas):

```sh
uv run --with gradio_client python design/models/khalil-character-v1/generate_trellis.py
```

Do not paste access tokens into source files or the chat. If a token is needed, use the official Hugging Face login/environment mechanism on the user's own machine.
