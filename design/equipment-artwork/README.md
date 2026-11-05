# Equipment artwork

Studio renders of the live catalog's 3D equipment models, with a square crop,
soft lighting and a charcoal background. These are model renders, not photographs
of physical inventory. Existing model geometry, materials and set placements are
retained, except for the requested single-tower `trussing` and separate Shure handheld revisions. The manifest records the model sources and previous artwork URLs. Images are 1000–1200 pixels square.

## Render

From the frontend root:

```sh
python3 design/equipment-artwork/render_queue.py
```

For one item, use `blender -b -t 2 --python design/equipment-artwork/render.py -- design/equipment-artwork/manifest.json EQUIPMENT_ID`. Existing PNGs are skipped. Model
downloads are local working files under `models/` and are not tracked.

## Gallery import and equipment assignment

With the existing local Vite server running, open:

<http://localhost:5176/design/equipment-artwork/import.html>

Sign in to the local site as admin first. The import page uses that session
directly; no credentials are embedded in these files. It is a local task page,
outside the production application's entry points.

Once all previews have loaded, use **Upload and apply 21 artworks**. The page:

1. Checks admin access and verifies the equipment's model and artwork still match
   the preparation snapshot.
2. Uploads through the existing Gallery endpoint and registers each image as a
   published `photo` in the `equipment` category.
3. Saves only `imageUrl` on the matching equipment entry.
4. Reads Gallery and equipment back to confirm the assignments.

Progress is resumable in the local browser. Existing Gallery records are reused
by image URL. Equipment whose source or artwork changed after preparation is
skipped instead of replacing the newer edit.

Two catalog entries have no 3D model or source photo: **Khalil's Lighting** and
**DJ Service**. They are listed as skipped and are not given invented artwork.

## Single-tower truss revision

The `trussing` entry replaces the portal with one vertical lattice tower centered
on one base plate. Its matching artwork is rerendered from the replacement GLB.
To apply only this change, open
<http://localhost:5176/design/equipment-artwork/import.html?equipment=trussing>
and choose **Apply truss model and artwork**. The import uploads the GLB through
`/admin/equipment-3d/upload`, registers its artwork in Gallery, then saves both
model job and image URL in one equipment PATCH. Other equipment is untouched.

## Shure handheld and separate receiver

The `shure-mics` entry is replaced with the supplied single-handheld design. New
`shure-wireless-receiver` is a separate Sound equipment entry with its own BLX4
model and artwork. Open
<http://localhost:5176/design/equipment-artwork/import.html?equipment=shure-mics,shure-wireless-receiver>
and choose **Apply 2 equipment models and artwork**. Creation is checked against
existing equipment IDs; interrupted uploads can be resumed without recreating the
receiver. The asset and catalog changes remain local until this import completes.
