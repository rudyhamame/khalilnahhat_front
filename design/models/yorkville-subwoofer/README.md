# ES18P interactive preview

The current `public/echo/models/es18p-subwoofer.glb` is a custom geometric approximation of the speaker in the user's photo, not a Microsoft TRELLIS generation or verified CAD model. It has an actual hollow cabinet, perforated hex grille, woofer, bass port, two side handles, feet, pole mount and illustrative rear controls. Hidden surfaces and dimensions are inferred.

Microsoft's official TRELLIS.2 demo successfully preprocessed the input but refused the generation job with a ZeroGPU quota error. No Microsoft-generated mesh was returned. The source photo remains unchanged at `/home/rudy/Downloads/IMG_f89d9602-f99a-48de-a5bd-62a7ba44b548.jpg`.

The preview uses Google's model-viewer, loaded on demand. Clicking the ES18P name/image opens a rotating GLB; dragging or keyboard camera controls allows inspection. Rotation can be paused and respects reduced motion initially. The plus button continues to manage quote selection independently. A later TRELLIS GLB can replace the same public asset without altering the UI.

Generator: `build-model.mjs`. The lettering font is the Three.js Helvetiker example font; included alongside the generator from the official Three.js examples. This file is an illustrative web preview, not manufacturing geometry.
