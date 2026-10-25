# Intelligent Moving Heads / Intimidator Spot 260X

The supplied reference photo visually matches CHAUVET DJ's **Intimidator Spot 260X** product rendering, including the embossed front plaque, vented trapezoid base, yoke, lens reflections, and screen layout. The user did not know the model number; this identification is based on the matching manufacturer image, not a photographed serial label or an inventory audit.

- User photo: `/home/rudy/Downloads/IMG_bee94e17-7bff-4e60-9823-4137325818bb.jpg`
- Matching manufacturer rendering: https://www.chauvetdj.com/wp-content/uploads/2022/10/INTIMIDATOR-260X-RIGHT.png
- Specifications: https://www.chauvetdj.com/products/intimidator-spot-260x/
- Model: `public/echo/models/intimidator-moving-head.glb`
- Original supplied photo: `public/echo/models/intimidator-moving-head-profile.jpg`
- Equipment catalog ID: `movingheads`

## Model provenance

Custom geometric model made with Three.js, based on the reference photograph. This is a genuine rotatable GLB mesh, not a photograph on a plane, manufacturer CAD, or a Microsoft TRELLIS reconstruction. The rear connections and hidden surfaces are illustrative. The overall modeled height is 351 mm; other proportions follow the supplied image and are approximate.

The matte black housing, open yoke, pan bearing, cooling slots, rubber feet, four-button display, deep optical barrel and red lens are separate geometry. The browser automatically rotates the whole fixture and supports drag, zoom, pause, reset, and GLB download.

Rebuild from the frontend repository root:

```sh
node design/models/intimidator-moving-head/build-model.mjs
```

Specifications are stored in `src/echo/equipmentModels.js` and displayed through the shared equipment viewer. The existing ES18P uses its own model, source and specifications.

## Published specifications used

- 75 W cool-white LED; rated LED lifespan 50,000 hours.
- 12°–17° manual zoom and motorized focus.
- Pan 540°, tilt 234°; selectable ranges and Totem mode.
- 17,458 lux at 2 m / 12°; 12,848 lux at 2 m / 17°.
- 8 or 14 DMX channels; three-pin XLR; built-in RF receiver and optional RFC/RFC-XL remotes.
- Eight colours plus white; seven gobos plus open; static three-facet round prism; 0–20 Hz strobe.
- 232 × 163 × 351 mm; weight 5.6 kg.
- 100–240 VAC, 50/60 Hz; 124 W at 120 V or 128 W at 230 V.
- powerCON-compatible power input/output, colour LCD and quarter-turn hanging bracket.

Manufacturer page checked 2026-10-25. The specifications describe the identified 260X product; the user-supplied generic catalog name remains “Intelligent Moving Heads.”
