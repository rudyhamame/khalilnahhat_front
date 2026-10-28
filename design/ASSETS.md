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

## Song-specific mixer performance — 2026-10-23
Built-in ImageGen produced ten original-reference poses, each independently edited from the original rather than previous generations. Masters and prompts: `source/song-test-performance-v1/`; lossless WebP copies: `public/echo/song-test-performance-v1/`. Distinct hand destinations include right/left pad banks, center EQ knob, bottom crossfader, and two raised-hand accents. These are generated illustrations and discrete key poses, not recorded performance footage. Smooth-skin constraints used; small generative pose/equipment/texture differences and residual translucent halo remain. Timing profile uses measured onsets and energy from the approved test recording; seeking uses the real audio playhead. Headphones entrance uses the existing eight clean frames before audio admission.

## Cloudinary public asset storage and Blender uplight — 2026-10-26

User requested Cloudinary storage for all assets, including equipment objects. Migrated 86 public website media assets (public artwork, source-bundled media, audio, three existing models, uplight reference/preview/GLB/editable .blend) to the existing account. Content hashes form immutable public IDs; manifests contain public URLs and metadata only. Dynamic pose/gallery paths use cloudAsset(); static HTML/CSS/media/model references use Cloudinary URLs. Local masters are retained for editing. Private client files retain authenticated access. Third-party application packages and remote embeds are unchanged.

Uplight was created locally in Blender 4.5.9 LTS after Microsoft TRELLIS.2 rejected hosted GPU generation. It is photo-guided illustrative geometry, not a dimensionally verified or branded model. Equipment selection uses the existing 360° viewer. Reference, native source, preview and GLB links plus rebuild instructions are in models/uplight/README.md. No frontend deployment was performed.

## Shure microphone equipment model — 2026-10-26

User-supplied dual handheld/receiver photo recreated locally in Blender 4.5.9 LTS and connected to catalog key `shure-mics`. Nine-material-group GLB, native Blender file, reference and studio preview are stored in Cloudinary; all four downloads match SHA-256. Public-media manifest now has 90 entries. Receiver BLX88 marking is based on the photo; RF band, capsule, dimensions and unseen rear connections are unverified. Native parts remain editable. The shared loading-line suppression is preserved. Chrome verified main preview and equipment thumbnail; lint/build pass with existing warnings. No frontend deployment. Rebuild source and deliverable links: models/shure-microphones/README.md.

## Elite, spark machine, JBL system and dry ice models — 2026-10-26

Completed photo-guided local Blender models for `elite-15`, `sparklers`, `jbl-system` and `dry-ice`. Each model's native Blender source, GLB, preview and supplied photo are stored in Cloudinary (16 files); all downloads matched SHA-256 and all GLBs passed container/size/scene checks. Shared media manifest contains 106 entries. Elite is added to the Sound Systems recommendations; existing catalog identities and stock/prices remain unchanged. Exact model specifications are not inferred from illustrative geometry. JBL represents the reference arrangement, not validation of catalog SRX/STX identities. Native build sources and cloud links are in design/models/elite-15 and design/models/equipment-batch. Shared loading-line suppression remains.

52 configured frontend tests pass. Lint has no errors and three existing warnings. Production build passes with existing bundle-size warnings. Local browser confirms equipment selection and loaded Cloudinary model/thumbnail for each of the four entries. No frontend publication/deployment performed.

## QSC K12.2 model — 2026-10-26

Created photo-guided local Blender model and connected existing `qsc-k122` equipment key. Curved physically perforated grille, single woofer/upper horn, moulded enclosure, side handles, bumpers and badge; dimensions and ratings unverified. Four files (GLB/native .blend/preview/reference) are stored in Cloudinary and match SHA-256 on download. Media manifest now has 110 entries. Browser verified main model and thumbnail. Shared loading line remains hidden. 52 frontend tests pass; lint/build pass with existing warnings. No frontend deployment. Source and links: models/qsc-k122/README.md.

## Equipment grid and review presentation — 2026-10-26

User replaced the equipment wheel with a two-column grid showing all service-associated items. Grid tiles have no inner padding, visible names or selected captions; accessible button names and selected state remain. Bright studio surfaces, stronger neutral lighting, and larger model framing improve black equipment contrast. Main preview gets a wider center column and full available height. Connections/status/reference/disclosure footer is removed from the shared preview per user request. Review side cards retain the same content/gradient as the selected card, dimmed to 40%, with no background images.

Chrome verified all four Sound Systems grid items are present, selected preview works, footer absent, and dimmed review cards have no photographs. Lint/build pass with three existing lint warnings and existing bundle-size warnings. No production deployment.

## RH builder footer credit — 2026-10-26

User requested RH logo attribution. Added a clean SVG trace of the supplied silver angular RH silhouette (local `public/echo/rh-software-credit.svg`), stored in Cloudinary and registered in public media manifests. Footer reads Designed & built by / RH SOFTWARE / Engineered Intelligence, with localized Arabic lead-in and accessible RH image text. No external destination was supplied, so credit is not linked. Native SVG is a simplified vector rendition of the supplied reference, not the original raster. Cloudinary download matches SHA-256; footer verified in Chrome. Lint/build pass with existing warnings. No frontend deployment.


## Base plates / trussing — 2026-10-26

Added a photo-guided local Blender portal model: two silver box-truss towers, overhead beam, black base plates and fixing bolts. Optimized GLB, editable Blender source and studio preview are uploaded to Cloudinary and registered in both manifests. Integrated into `trussing` under Lighting. Dimensions and load rating remain unverified. See [model handoff](models/trussing/README.md). No frontend deployment performed.


## Soundcraft soundboard — 2026-10-26

Added a photo-guided local Blender mixing console with a sloped blue-grey panel, black wedge housing, twelve mono input strips, stereo/effects/master faders, coloured rotary controls, sockets and meters. Integrated existing `soundcraft` key in DJ Services and Corporate Events. Model-specific initial camera angles show the control surface from above; reset preserves that angle. GLB, Blender source, preview and supplied reference are delivered through Cloudinary. Exact model variant, dimensions and electrical ratings remain unverified. See [model handoff](models/soundcraft/README.md). No frontend deployment.


## LED screen — 2026-10-26

Photo-guided Blender model shows a front display cabinet and a rear-facing cabinet together, with slim silver edges, dark ribs, recessed handle and corner hardware. Original supplied reference is embedded as a display texture via face UV coordinates. Integrated existing `led-screen` key for LED Walls and Corporate Events. GLB, editable Blender source, studio preview and reference are stored in Cloudinary. Physical dimensions, pixel pitch, brightness and power remain unverified. See [model handoff](models/led-screen/README.md). No frontend deployment.


## Smoke machine — 2026-10-26

Photo-guided local Blender model of black vented smoke equipment with top outlet, red LED ring, off-white reservoir, cap/feed hose, side carry handles and cables. Hardware-only presentation preserves useful object size; no plume simulation is included. Integrated existing `smoke` equipment key under Special Effects. GLB, packed editable Blender file, studio preview and supplied reference stored in Cloudinary. Model proportions, exact product identity and operating ratings remain unverified. See [model handoff](models/smoke/README.md). No frontend deployment.


## CO₂ gun with tank — 2026-10-26

Photo-guided Blender effects gun with open black barrel, front grip, rear handle/trigger guard, MOKA SFX marking and supply hose. Added generic silver cylinder because no tank is visible in the supplied photo; specs explicitly identify it as illustrative. Hardware-only presentation, no plume. Integrated `co2-gun` under Special Effects. GLB, native Blender file, preview and reference stored in Cloudinary. Capacity, pressure, dimensions and operating ratings unverified. See [model handoff](models/co2-gun/README.md). No frontend deployment.

## About artist viewport — 2026-10-26

Homepage About DJ Khalil chapter reuses the existing Cloudinary seated-jade illustrative portrait; no new public media added. Layout and bilingual copy documented in [HomeAbout.jsx](../src/echo/HomeAbout.jsx) and `src/echo/homeAbout.css`. `/about` redirects to `/#about-dj-khalil`.
