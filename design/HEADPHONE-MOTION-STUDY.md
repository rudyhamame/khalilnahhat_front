# Headphone / viewer-facing motion study — 2026-10-23

Opt-in local preview: `/?heroMotion=preview`. The normal Home route uses the cleaned starting portrait with native scrolling. Motion remains opt-in.

The concept: scroll downward while the hero stays stationary; hands grip headphones at the neck, lift them onto the ears while the head turns toward the viewer, then release them. Upward input reverses the sequence. After completion the next downward input scrolls the page normally. Skip, Replay and a keyboard-accessible timeline are available. Form fields, links, buttons, open navigation, dialogs, browser zoom and modified wheel gestures are excluded. Reduced-motion preference bypasses input interception. Missing artwork preserves the original image and native scrolling. No body overflow lock or artificial page-height spacer.

## Artwork and resolution

Built-in ImageGen, identity-preserve edits of the existing `khalil-fresh-natural-hands.webp`; illustrative brand artwork, not real event photography. Separate full-resolution RGBA PNG masters are in `design/source/headphone-motion-cutout/`; lossless WebP copies in `public/echo/headphone-motion-cutout/`. User requested smooth line-free skin on all exposed areas, then explicitly clarified removal of the colored background halo. Skin retouch uses an intentionally airbrushed finish. Background extraction removes teal/brown glow, with transparent RGB normalized only where alpha is zero and WebP exact transparency preservation enabled. The CSS warm radial glow is also removed. No upscaling or synthetic frame interpolation. The initial contact sheet (362 × 543 per cell) was rejected for low resolution and is not referenced by this implementation. Display width is capped at the native 1024px artwork width in the study.

## Prompt set

Shared specification: one full-resolution 1024 × 1536 vertical transparent photographic portrait per request, no grid/contact sheet. Preserve original likeness, black sunglasses, short brown hair, stubble, jade sweatshirt, black/silver wired headphones, studio lighting and locked camera. Keep complete DJ controller and torso at identical scale/position. Natural five-finger hands; no duplicate headphones, intersecting anatomy, retouching, blur, text, background or glow. Original portrait is the likeness reference; adjacent generated frame is the edit target where available.

| Frame | Pose-specific request |
|---|---|
| 0 | Starting portrait, hands at controller, upward-left gaze; skin cleanup and transparent extraction. |
| 1 | Raise both hands and grip the two earcups around the neck; original gaze unchanged. |
| 2 | Keep both hands gripping earcups at neck; turn head halfway toward viewer and lower chin slightly. |
| 3 | Face viewer; lift headphones in front of lower face, earcups outside cheeks, band forward of forehead. |
| 4 | Lift band completely above crown with visible clearance; spread earcups just above/outside ears. |
| 5 | Seat earcups on ears and band on crown, both hands holding cups, face toward viewer. |
| 6 | Release earcups and lower hands toward controller while headphones stay correctly worn. |
| 7 | Hands rest on controller, headphones on ears, face directly toward viewer. |

## Acceptance limit

This is an eight-pose storyboard controlled by input, not smooth continuous animation. Identity, headphone trajectory, arm alignment, transparency edges and the final expression still need visual review. A finished realistic sequence requires a continuous animation/video or many individually consistent frames; a crossfade is not a substitute. No public deployment, account changes, email or payment operations. Exact prompts are recorded in HEADPHONE-MOTION-PROMPTS.json.
