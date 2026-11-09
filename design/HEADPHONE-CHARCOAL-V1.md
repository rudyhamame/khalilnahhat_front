# Charcoal headphone animation

Eight frames retain the existing headphone movement and full DJ controller composition. The seven movement poses were selected from `/home/rudy/.codex/generated_images/01a166f7-922d-7d30-924c-4d4d3263e89d`. The original hands-down starting pose remains `design/source/khalil-fresh-natural-hands.png`; that pose is absent from the supplied directory.

Only the sweatshirt changes: matte charcoal `#2B2D30`, washed cotton, ribbed collar/cuffs, no logo. Built-in image_gen supplied the clothing edits, with each pose independently referencing its original. Exact source paths, generated paths, and full prompts are recorded in `source/headphone-charcoal-v1/generation-0*.json`.

The offline finishing script restores all original pixels outside the cyan/green garment mask and preserves the original alpha channel exactly. Fully transparent pixels have their hidden RGB cleared to prevent misleading raw previews. No background, glow, halo, skin retouch, or new lighting is included. No segmentation or background removal is applied to these final frames.

PNG masters: `design/source/headphone-charcoal-v1/pose-0*.png`.
Lossless runtime WebPs: `public/echo/headphone-charcoal-v1/pose-0*.webp` (also registered in Cloudinary).
Verification: `source/headphone-charcoal-v1/verification.json`, including face, non-garment RGB, and alpha comparisons against each original.
