# Generated brand images

Built-in ImageGen was used. These are illustrative brand scenes, not real event documentation. Original artist identity reference: the user-supplied profile portrait; Instagram visually reviewed at https://www.instagram.com/khalil_nahhat/ . Exact identity still needs the owner's review.

| Public file | Lossless source | Prompt specification |
|---|---|---|
| performance.webp | source/dj-khalil-wedding.png | Preserve reference facial structure, nose, hairline, short swept brown hair, stubble, eyes, age and skin texture. DJ at refined wedding reception; white shirt, dark blazer, black headphones, controller. Ivory florals and jade light, landscape safe for square crop. No text/logos. |
| production.webp | source/event-production.png | Elegant contemporary Toronto ballroom; jade/aqua light beams, LED abstract waves, speaker towers, warm ivory florals and candlelight, polished dance floor. No foreground people or faces. Landscape editorial image, no text/logos. |
| portrait.webp | source/dj-khalil-cutout.png | Edit performance source: preserve existing face, hair, stubble, gaze, blazer, shirt/headphones. Remove ballroom and controller. Transparent head/upper-torso cutout, natural hair edges, no face retouch or age change. Real alpha verified. |
| studio.webp | source/dj-khalil-studio.png | Preserve artist face from cutout reference. Half-body editorial portrait, charcoal open-collar shirt/headphones, three-quarter pose, silver studio backdrop with jade rim light. Natural skin, no beauty retouching/text/logos. |
| wedding-live.webp | source/dj-khalil-live.png | Preserve artist face from performance reference. Wider wedding reception scene, white rolled-sleeve shirt, headphones/controller, jade stage light/LED and distant defocused guests. Sharp face, realistic anatomy, no text/logos. |
| production-detail.webp | source/production-detail.png | Editorial close-up sound/lighting control surfaces against softly defocused ivory/jade ballroom. Realistic materials/optics, no people, branding, model claims or readable text. |

Public assets are optimized WebP. Lossless PNG masters remain available for future approved edits. Generated imagery is never substituted for equipment catalog product photography.

## Blue portrait replacement
User requested replacing the black-shirt studio portrait everywhere and adding the blue portrait to the home slideshow. `public/echo/blue-portrait.webp` comes from `design/source/dj-khalil-blue-upscaled.png`. Built-in ImageGen restored the supplied small blue-shirt/sunglasses portrait while preserving pose, blue background, headphones and identity; conservative natural detail, no black-shirt reference transfer. Original generated output is 1254×1254. Homepage artist portrait now displays at 144px desktop / 120px mobile instead of 84px. Old source retained for recovery but no longer referenced by the UI.

## Jade wardrobe and seated About portrait

Built-in ImageGen created `source/dj-khalil-seated-jade.png` and `source/dj-khalil-home-jade.png`, optimized as `public/echo/seated-jade.webp` and `public/echo/jade-portrait.webp`. Seated prompt: preserve blue profile identity, same sunglasses/headphones, light blue blouse, confident camera-facing expression, seated charcoal chair, dark trousers, transparent background. Follow-up edit prompt for both portraits: change only the blouse to website Jade Bloom #44B197, preserve all face/pose/accessory/background details and fabric shading. Seated portrait preserves real alpha. Home introduction/slideshow/gallery use jade-portrait; About uses seated-jade. Earlier source assets retained for recovery.

## Completed shoulder / transparent Home portrait

User rejected a generated background and requested only shoulder completion with transparency. Built-in ImageGen edited the jade profile: preserve existing face/head angle/sunglasses/headphones/green blouse, complete missing right shoulder naturally, remove blue backdrop with genuine alpha; no new scene or pose. Final `source/dj-khalil-shoulder-transparent.png` is optimized as `public/echo/jade-portrait-transparent.webp` and used by Home slideshow, introduction and gallery. Hero displays it without a blue background rectangle or parallax scaling. The earlier wide-background attempt was superseded and is not used.

## Continuous two-viewport performer

`source/dj-khalil-continuous-mixer.png` / `public/echo/continuous-mixer.webp`: built-in ImageGen downward outpaint from completed-shoulder reference; preserve face, gaze, sunglasses, headphones and jade blouse, extend torso/arms/hands operating a detailed DJ controller, transparent tall 1:2 portrait. One connected image spans hero and next introduction viewport to avoid a section seam or duplicate portrait. Real alpha retained.

## Preserve original person; replace equipment only

User explicitly rejected regenerated face, clothes and body. Home now uses an inline SVG composition that references the FIRST `continuous-mixer.webp` for the person (no new facial or clothing pixels) with a clip retaining original hands. Only the equipment area uses `mixer-reference-composite.webp`, synthesized from the user's controller screenshot. Both mixer end corners/front edge are visible; the layout uses contain sizing. Intermediate regenerated whole portraits are not used. `public/echo/continuous-mixer-original.svg` stores the composition source, while React embeds it inline so its referenced raster assets load correctly.

## User selected complete portrait
Replaced the hand/equipment SVG composite with one intact existing generated image (`source/khalil-selected-full.png`, `/echo/khalil-selected-full.webp`), spanning viewport sections 1 and 2. No further generation or mixer repair applied.

## Fresh portrait with natural hands
User requested a new generation rather than further photo edits. Built-in ImageGen, using only the upper-body portrait as a likeness/style reference. Final prompt: freshly photographed same DJ, sunglasses, headphones and jade sweatshirt; upward-left gaze; relaxed anatomically correct hands on left jogwheel and central knob; smooth natural skin without exaggerated veins; full controller edges and transparent alpha. No patching or compositing. Source `source/khalil-fresh-natural-hands.png`; web `/echo/khalil-fresh-natural-hands.webp`, lossless format conversion only. Continues across viewport sections 1 and 2.
