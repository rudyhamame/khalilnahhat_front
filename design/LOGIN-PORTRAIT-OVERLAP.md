# Login foreground portrait

## Extracted background plate

Frame background now uses `public/echo/login-green-backdrop-v1.webp`, a built-in ImageGen background-only edit of the supplied `/home/rudy/.codex/generated_images/01a170a5-98fe-7230-abed-e84b2c02ec11/exec-9a14472e-65b3-438e-8595-b5331cc59c3f.png`. Prompt: remove the entire person and all accessories, seamlessly fill with the same existing dark forest-green/near-black softly mottled studio backdrop, preserve low contrast and emerald light toward middle right; no people, silhouettes, objects, text, bright lighting or scenery. Opaque portrait 2:3. Saved as WebP quality 90. The existing transparent foreground portrait is unchanged. Only the frame's CSS background changed; inset, overflow and contain sizing are retained.

## Superseding transparent cutout

The user rejected the vector clipping result. Login now uses `public/echo/login-khalil-transparent-v2.png`, a built-in ImageGen edit of the original login portrait, with real alpha transparency (620,246 fully transparent pixels; 1024 × 1536). SVG clipping was removed. The figure uses contain sizing, visible overflow and a separate solid #0d241c inset background. Browser screenshot verified full head, shoulders and both elbows extend beyond the panel without frame clipping, retaining the one-viewport composition. Earlier implementation notes below describe the superseded attempt.

Final edit prompt: Create a clean transparent PNG cutout of ONLY THE PERSON in the attached image. Remove EVERY background pixel, especially dark green around head and arms. Outside person fully transparent alpha=0, no dark green/black/glow/smoke/vignette/halo. Preserve original appearance: face, gentle skin texture, hair, sunglasses, jade sweatshirt, headphones, pose and hand. No added wrinkles, veins, aging, sharpening or texture enhancement. Include complete head, shoulders, arms and elbows; extend canvas and reconstruct only small cropped sleeve edge. Transparent margins, head-to-hips portrait, no scenery/text. Generated through built-in ImageGen; original retained unchanged. This remains generated illustrative artwork, not an exact pixel-preserving extraction.

The original `/echo/login-khalil-editorial-v1.webp` is unchanged. An inline SVG clipping outline in `LoginPage.jsx` reveals the person's silhouette. CSS places it in front of an inset, independently rounded background, with overflow visible and contain sizing. This avoids cover-cropping the arms and preserves the original facial pixels. The original photograph has a small crop at the left elbow; no new anatomy was substituted.

Two built-in ImageGen background-extraction attempts were rejected because they changed skin texture and retained background halos. Neither is used or copied into the project. Their prompt requested only background removal, small missing sleeve-edge completion, unchanged face/skin/hair/sunglasses/headphones/clothing/pose, no added wrinkles/pores/sharpening, and transparent padding. The final implementation uses vector clipping of the unchanged existing web asset, not a generated replacement.

Browser inspected desktop login overlap and retained one-viewport layout. Mobile retains the earlier form-first layout with portrait hidden. No production deployment.
